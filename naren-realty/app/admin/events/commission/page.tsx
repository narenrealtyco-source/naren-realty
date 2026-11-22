"use client";

import { useEffect,useState } from "react";
import { supabase } from "../../../lib/supabase";
const field="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900";
type Setting={commission_percent:number;payment_upi_id:string|null;payee_name:string|null;qr_image_url:string|null};
type Sale={id:string;event_id:string;organiser_id:string;paid_attendee_count:number;ticket_unit_price:number;total_ticket_amount:number;commission_amount:number;organiser_net_amount:number;commission_payment_reference:string|null;commission_payment_status:string;created_at:string;admin_note:string|null;event_submissions?:{title:string;organizer_name:string}|null};
export default function AdminEventCommissionPanel(){
 const [setting,setSetting]=useState<Setting>({commission_percent:10,payment_upi_id:"",payee_name:"",qr_image_url:""});
 const [sales,setSales]=useState<Sale[]>([]);
 const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);const [busy,setBusy]=useState<string|null>(null);const [message,setMessage]=useState("");
 async function load(){
  setLoading(true);
  const [{data:s},{data:r,error}]=await Promise.all([
   supabase.from("event_commission_settings").select("commission_percent,payment_upi_id,payee_name,qr_image_url").eq("id",true).maybeSingle(),
   supabase.from("event_ticket_sales").select("*,event_submissions(title,organizer_name)").order("created_at",{ascending:false}).limit(300)
  ]);
  if(s)setSetting({commission_percent:Number(s.commission_percent),payment_upi_id:s.payment_upi_id??"",payee_name:s.payee_name??"",qr_image_url:s.qr_image_url??""});
  if(error)setMessage("Commission reports could not be loaded. Verify admin access.");
  else setSales((r??[]) as Sale[]);
  setLoading(false);
 }
 useEffect(()=>{void load();},[]);
 async function saveSettings(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setSaving(true);setMessage("");
  const {data:{user}}=await supabase.auth.getUser();
  const {error}=await supabase.from("event_commission_settings").update({commission_percent:10,payment_upi_id:setting.payment_upi_id?.trim()||null,payee_name:setting.payee_name?.trim()||null,qr_image_url:setting.qr_image_url?.trim()||null,updated_by:user?.id??null,updated_at:new Date().toISOString()}).eq("id",true);
  setMessage(error?"Payment settings could not be saved.":"Commission payment instructions updated.");
  setSaving(false);if(!error)await load();
 }
 async function review(sale:Sale,status:"verified"|"rejected"){
  setBusy(sale.id);setMessage("");
  const {data:{user}}=await supabase.auth.getUser();
  const {error}=await supabase.from("event_ticket_sales").update({commission_payment_status:status,reviewed_by:user?.id??null,reviewed_at:new Date().toISOString()}).eq("id",sale.id);
  if(error)setMessage("Payment review could not be saved.");
  else{setMessage("Commission payment marked "+status+".");await load();}
  setBusy(null);
 }
 const pending=sales.filter(s=>s.commission_payment_status==="pending");
 return <main className="min-h-screen bg-slate-50 text-slate-900"><header className="bg-[#10243A] px-4 py-5 text-white"><div className="mx-auto max-w-6xl"><p className="text-xs font-bold tracking-widest text-amber-400">NAREN REALTY · ADMIN</p><h1 className="mt-1 text-2xl font-extrabold">Event Commission & Settlements</h1></div></header><section className="mx-auto max-w-6xl space-y-6 px-4 py-8">
  <form onSubmit={saveSettings} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><h2 className="text-lg font-bold text-[#10243A]">Commission payment settings</h2><p className="mt-1 text-sm text-slate-600">Temporary personal UPI details can be used during development. Replace them with business payment details when available.</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Commission rate<input className={field} value="10% (fixed)" readOnly /></label><label className="text-sm font-semibold">UPI ID<input className={field} value={setting.payment_upi_id??""} onChange={e=>setSetting(v=>({...v,payment_upi_id:e.target.value}))} placeholder="yourname@upi"/></label><label className="text-sm font-semibold">Payee name<input className={field} value={setting.payee_name??""} onChange={e=>setSetting(v=>({...v,payee_name:e.target.value}))} placeholder="Account / UPI display name"/></label><label className="text-sm font-semibold">UPI QR image URL<input className={field} value={setting.qr_image_url??""} onChange={e=>setSetting(v=>({...v,qr_image_url:e.target.value}))} placeholder="https://..."/></label></div><button disabled={saving} className="mt-4 rounded-lg bg-[#10243A] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{saving?"Saving...":"Save payment settings"}</button>{message&&<p role="status" className="mt-3 text-sm text-slate-700">{message}</p>}</form>
  <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-lg font-bold text-[#10243A]">Commission reports</h2><p className="text-sm text-slate-600">{pending.length} awaiting verification · {sales.length} total reports</p></div><button onClick={()=>void load()} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">Refresh</button></div>
   {loading?<p className="mt-4 text-sm text-slate-600">Loading reports...</p>:sales.length===0?<p className="mt-4 text-sm text-slate-600">No ticket sales reports yet.</p>:<div className="mt-4 space-y-3">{sales.map(s=><article key={s.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-bold">{s.event_submissions?.title??"Event"}</h3><p className="text-xs text-slate-500">Organiser: {s.event_submissions?.organizer_name??s.organiser_id}</p></div><span className={`rounded-full px-2 py-1 text-xs font-bold capitalize ${s.commission_payment_status==="verified"?"bg-emerald-100 text-emerald-800":s.commission_payment_status==="rejected"?"bg-rose-100 text-rose-800":"bg-amber-100 text-amber-900"}`}>{s.commission_payment_status}</span></div><div className="mt-3 grid gap-2 text-sm sm:grid-cols-4"><p>Paid attendees: <strong>{s.paid_attendee_count}</strong></p><p>Collection: <strong>₹{Number(s.total_ticket_amount).toFixed(2)}</strong></p><p>10% commission: <strong>₹{Number(s.commission_amount).toFixed(2)}</strong></p><p>Organiser share: <strong>₹{Number(s.organiser_net_amount).toFixed(2)}</strong></p></div><p className="mt-2 text-sm text-slate-600">Commission UTR: <strong>{s.commission_payment_reference??"Not submitted yet"}</strong></p><p className="mt-1 text-xs text-slate-500">{new Date(s.created_at).toLocaleString("en-IN")}</p>{s.commission_payment_status==="pending"&&s.commission_payment_reference&&<div className="mt-3 flex gap-2"><button disabled={busy===s.id} onClick={()=>void review(s,"verified")} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Verify payment</button><button disabled={busy===s.id} onClick={()=>void review(s,"rejected")} className="rounded-lg border border-rose-300 px-4 py-2 text-sm font-bold text-rose-700 disabled:opacity-50">Reject</button></div>}</article>)}</div>}
  </div>
 </section></main>;
}
