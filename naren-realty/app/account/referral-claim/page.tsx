"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCustomerSession, type CustomerAccount } from "../../lib/customers";
import { createSupabaseBrowserClient } from "../../lib/supabase-browser";
const supabase=createSupabaseBrowserClient();
type Reward={id:string;reward_amount:number;referral_type:"tenant"|"owner";status:string;created_at:string;reward_triggered_at:string|null};
type Claim={referral_id:string;status:string;submitted_at:string;payment_reference:string|null;paid_at:string|null};
export default function ReferralClaimPage(){
 const [customer,setCustomer]=useState<CustomerAccount|null>(null),[rewards,setRewards]=useState<Reward[]>([]),[claims,setClaims]=useState<Claim[]>([]);
 const [forms,setForms]=useState<Record<string,{holder:string;bank:string;account:string;ifsc:string;upi:string}>>({});
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(""),[error,setError]=useState(""),[notice,setNotice]=useState("");
 async function load(){setLoading(true);try{const c=await getCustomerSession();setCustomer(c);if(!c){setRewards([]);return;}
 const [r,cl]=await Promise.all([supabase.from("referral_attributions").select("id,reward_amount,referral_type,status,created_at,reward_triggered_at").eq("referred_user_id",c.id).in("status",["approved","paid"]).not("reward_triggered_at","is",null),supabase.from("referral_reward_claims").select("referral_id,status,submitted_at,payment_reference,paid_at").eq("user_id",c.id)]);
 if(r.error||cl.error)throw new Error("Your claim information could not be loaded.");setRewards(r.data??[]);setClaims(cl.data??[]);
 }catch(e){setError(e instanceof Error?e.message:"Could not load claims.");}finally{setLoading(false);}}
 useEffect(()=>{void load();},[]);
 async function submit(id:string){const f=forms[id];if(!f||!f.holder.trim()||!f.bank.trim()||!/^[0-9]{6,24}$/.test(f.account)||!/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(f.ifsc)){setError("Enter valid account holder, bank, account number and IFSC.");return;}
 setBusy(id);setError("");setNotice("");const {error:e}=await supabase.from("referral_reward_claims").insert({referral_id:id,user_id:customer?.id,account_holder_name:f.holder.trim(),bank_name:f.bank.trim(),account_number:f.account,ifsc:f.ifsc.toUpperCase(),upi_id:f.upi.trim()||null});
 if(e){setError(e.code==="23505"?"A claim has already been submitted for this referral.":e.message);setBusy("");return;}setNotice("Claim submitted. NAREN REALTY Admin will verify and process the manual payment.");await load();setBusy("");}
 return <main className="min-h-screen bg-slate-50 text-slate-900"><header className="bg-[#A71930] text-white"><div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4"><div><p className="text-xs font-bold tracking-widest text-white/80">NAREN REALTY</p><h1 className="text-xl font-bold">Claim Referral Reward</h1></div><Link href="/account" className="rounded-lg border border-white/30 px-3 py-2 text-sm">My Account</Link></div></header>
 <div className="mx-auto max-w-4xl space-y-4 px-4 py-6">{error&&<p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}{notice&&<p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
 {loading?<p className="rounded-xl bg-white p-5">Loading your rewards…</p>:!customer?<p className="rounded-xl bg-white p-5">Please <Link className="font-semibold underline" href="/account#login">log in</Link> to claim a reward.</p>:<>
 <p className="text-sm text-slate-600">Only rewards triggered by NAREN REALTY Admin appear here. Submit bank details once; payment is made manually after verification.</p>
 {rewards.length===0&&<p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">No rewards are currently available to claim.</p>}
 {rewards.map(r=>{const claim=claims.find(c=>c.referral_id===r.id);const f=forms[r.id]??{holder:customer.fullName,bank:"",account:"",ifsc:"",upi:""};return <article key={r.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-[#A71930]">{r.referral_type==="tenant"?"Tenant referral":"Property owner referral"}</p><h2 className="mt-1 text-2xl font-bold text-[#A71930]">₹{Number(r.reward_amount).toLocaleString("en-IN")}</h2></div><span className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-800">{claim?.status==="paid"?"Paid":claim?"Claim submitted · Waiting for payment":"Ready to claim"}</span></div>
 {claim?.status==="paid"?<p className="mt-3 text-sm text-slate-600">Paid on {new Date(claim.paid_at??claim.submitted_at).toLocaleDateString("en-IN")} · Reference: {claim.payment_reference??"Recorded"}</p>:claim?<p className="mt-3 text-sm text-slate-600">Your claim was submitted on {new Date(claim.submitted_at).toLocaleDateString("en-IN")}. Admin will process the payment.</p>:<form onSubmit={e=>{e.preventDefault();void submit(r.id);}} className="mt-4 grid gap-3 sm:grid-cols-2">
 <label className="text-sm font-semibold">Account holder name<input required value={f.holder} onChange={e=>setForms(v=>({...v,[r.id]:{...f,holder:e.target.value}}))} className="mt-1 block w-full rounded-lg border border-slate-300 p-3 font-normal"/></label>
 <label className="text-sm font-semibold">Bank name<input required value={f.bank} onChange={e=>setForms(v=>({...v,[r.id]:{...f,bank:e.target.value}}))} className="mt-1 block w-full rounded-lg border border-slate-300 p-3 font-normal"/></label>
 <label className="text-sm font-semibold">Account number<input required inputMode="numeric" autoComplete="off" value={f.account} onChange={e=>setForms(v=>({...v,[r.id]:{...f,account:e.target.value.replace(/\D/g,"")}}))} className="mt-1 block w-full rounded-lg border border-slate-300 p-3 font-normal"/></label>
 <label className="text-sm font-semibold">IFSC code<input required autoCapitalize="characters" value={f.ifsc} onChange={e=>setForms(v=>({...v,[r.id]:{...f,ifsc:e.target.value.toUpperCase()}}))} className="mt-1 block w-full rounded-lg border border-slate-300 p-3 font-normal"/></label>
 <label className="text-sm font-semibold sm:col-span-2">UPI ID (optional)<input value={f.upi} onChange={e=>setForms(v=>({...v,[r.id]:{...f,upi:e.target.value}}))} className="mt-1 block w-full rounded-lg border border-slate-300 p-3 font-normal"/></label>
 <p className="text-xs leading-5 text-slate-500 sm:col-span-2">Your bank details are used only to process this referral reward. Submit only your own correct payment details.</p>
 <button disabled={busy===r.id} className="rounded-lg bg-[#A71930] px-5 py-3 text-sm font-bold text-white disabled:opacity-50 sm:col-span-2">{busy===r.id?"Submitting…":"Submit Claim"}</button>
 </form>}</article>;})}
 </>}</div></main>;
}
