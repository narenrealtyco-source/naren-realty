"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "../../lib/supabase-browser";

type StatusRow={enquiry_id:string;status:string;response_deadline_at:string;vendor_id:string;category_id:string;locality:string;city:string};
type Alternative={id:string;public_name:string;business_name:string;services:string;locality:string;city:string};
export function VendorRequestTracker({enquiryId}:{enquiryId:string}) {
 const [row,setRow]=useState<StatusRow|null>(null);
 const [alternatives,setAlternatives]=useState<Alternative[]>([]);
 const [seconds,setSeconds]=useState(60);
 const [error,setError]=useState("");
 useEffect(()=>{
  let active=true;
  const supabase=createSupabaseBrowserClient();
  async function refresh(){
   const {data,error:rpcError}=await supabase.rpc("get_customer_vendor_enquiry_status",{p_enquiry_id:enquiryId});
   if(!active)return;
   if(rpcError){setError("Request status could not be loaded. Please sign in to the same customer account.");return;}
   const current=(Array.isArray(data)?data[0]:data) as StatusRow|undefined;
   if(!current){setError("This request was not found in your account.");return;}
   setRow(current);setError("");
   if(["declined","not_accepted"].includes(current.status)){
    const {data:vendors,error:vendorError}=await supabase.from("service_vendors")
      .select("id,public_name,business_name,services,locality,city")
      .eq("active",true).eq("verified",true).eq("category_id",current.category_id)
      .eq("city",current.city).neq("id",current.vendor_id)
      .order("locality").limit(30);
    if(active&&!vendorError){
      const list=(vendors??[]) as Alternative[];
      const sameArea=list.filter(v=>v.locality.toLowerCase()===current.locality.toLowerCase());
      setAlternatives(sameArea.length?sameArea:list);
    }
   }
  }
  void refresh();
  const poll=window.setInterval(()=>{if(document.visibilityState==="visible")void refresh();},2500);
  return ()=>{active=false;window.clearInterval(poll);};
 },[enquiryId]);
 useEffect(()=>{
  if(!row?.response_deadline_at)return;
  const tick=()=>setSeconds(Math.max(0,Math.ceil((new Date(row.response_deadline_at).getTime()-Date.now())/1000)));
  tick();const timer=window.setInterval(tick,500);return()=>window.clearInterval(timer);
 },[row?.response_deadline_at]);
 const expired=row&&new Date(row.response_deadline_at).getTime()<=Date.now();
 return <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900"><div className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
  <Link href="/home-services" className="text-sm font-semibold text-[#176B45] underline">← Home Services</Link>
  <p className="mt-5 text-xs font-bold uppercase tracking-widest text-emerald-700">NAREN REALTY · REQUEST STATUS</p>
  <h1 className="mt-2 text-2xl font-extrabold text-[#10243A]">Your service request</h1>
  {error?<p role="alert" className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{error}</p>:!row?<p className="mt-5 text-sm text-slate-600">Loading current status…</p>:<>
   {row.status==="new"?<div className="mt-5 rounded-xl bg-amber-50 p-5"><p className="font-bold text-amber-900">Waiting for selected provider</p><p className="mt-2 text-sm text-amber-900">They have up to 60 seconds to respond.</p><p className="mt-3 text-3xl font-extrabold tabular-nums text-[#10243A]">{seconds}s</p></div>:null}
   {row.status==="accepted"?<div className="mt-5 rounded-xl bg-emerald-50 p-5"><p className="font-bold text-emerald-900">Your selected provider accepted the request.</p><p className="mt-1 text-sm text-emerald-900">They can now follow up with you.</p></div>:null}
   {row.status==="declined"||row.status==="not_accepted"?<div className="mt-5 rounded-xl bg-amber-50 p-5"><p className="font-bold text-amber-900">Your selected service partner hasn't responded yet.</p><p className="mt-1 text-sm text-amber-900">You can choose another verified service partner below.</p></div>:null}
   {!["new","accepted","declined","not_accepted"].includes(row.status)?<p className="mt-5 rounded-xl bg-slate-100 p-4 text-sm">Current request status: {row.status}</p>:null}
   {(row.status==="declined"||row.status==="not_accepted")&&<section className="mt-6"><h2 className="text-lg font-bold text-[#10243A]">Other verified providers in your area</h2>{alternatives.length===0?<p className="mt-3 rounded-xl border border-dashed p-5 text-sm text-slate-600">No other verified providers are currently listed for this service and city. Please check again later.</p>:<div className="mt-3 space-y-3">{alternatives.map(v=><article key={v.id} className="rounded-xl border border-slate-200 p-4"><h3 className="font-bold">{v.public_name}</h3><p className="mt-1 text-sm text-slate-600">{v.business_name} · {v.locality}, {v.city}</p><p className="mt-2 text-sm">{v.services}</p><Link href={`/home-services/vendors/${v.id}`} className="mt-3 inline-flex rounded-lg bg-[#176B45] px-4 py-2 text-sm font-bold text-white">View & select this provider</Link></article>)}</div>}</section>}
  </>}
 </div></main>;
}
