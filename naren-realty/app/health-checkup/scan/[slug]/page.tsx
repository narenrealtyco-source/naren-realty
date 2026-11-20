"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { addHealthCartItem } from "../../_components/cart";

type ScanItem={slug:string;item_type:string;title:string;category:string;description:string|null;price:number|null;mrp:number|null;is_active:boolean;provider_verified:boolean;preparation:string|null;report_tat:string|null};

function ScanDetailContent(){
 const params=useParams<{slug:string}>();
 const [item,setItem]=useState<ScanItem|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 useEffect(()=>{fetch("/api/health-catalog",{cache:"no-store"}).then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error||"Imaging catalogue unavailable.");const found=(data.items||[]).find((x:ScanItem)=>x.slug===params.slug&&x.item_type==="scan"&&x.is_active);if(!found)throw new Error("This scan is not currently available for online booking.");setItem(found);}).catch(reason=>setError(reason instanceof Error?reason.message:"Unable to load scan details.")).finally(()=>setLoading(false));},[params.slug]);
 return <main className="min-h-screen bg-[#f6f9fa] pb-24 text-[#172326]">
  <header className="border-b border-slate-100 bg-white px-4 py-4"><div className="mx-auto flex max-w-4xl items-center gap-3"><Link href="/health-checkup/scans" className="grid size-10 place-items-center rounded-full border text-2xl">‹</Link><div><p className="text-[10px] font-extrabold uppercase tracking-widest text-[#078b8d]">MFIT Healthcare</p><h1 className="text-lg font-extrabold">Scan details</h1></div><Link href="/health-checkup/cart" className="ml-auto text-xs font-bold text-[#078b8d]">Cart</Link></div></header>
  <section className="mx-auto max-w-4xl space-y-4 px-4 py-6">
   {loading?<div className="rounded-2xl bg-white p-6 text-sm text-slate-500">Loading scan details…</div>:error?<div className="rounded-2xl bg-white p-6"><p className="text-sm text-rose-700">{error}</p><Link href="/health-checkup/scans" className="mt-4 inline-block text-sm font-bold text-[#078b8d]">Browse scans →</Link></div>:item&&<>
    <div className="grid overflow-hidden rounded-3xl bg-white shadow-sm md:grid-cols-[.8fr_1.2fr]"><div className="grid min-h-52 place-items-center bg-[#e9f8f6] text-6xl text-[#078b8d]">▣</div><div className="p-6 sm:p-8"><span className="rounded-full bg-[#e9f8f6] px-3 py-1 text-xs font-bold text-[#078b8d]">{item.category}</span><h2 className="mt-4 text-2xl font-extrabold">{item.title}</h2><p className="mt-3 text-sm leading-6 text-slate-600">{item.description||"Review scan information and booking details below."}</p><p className="mt-5 text-xs text-slate-500">MFIT price</p><p className="text-2xl font-extrabold">{item.provider_verified&&item.price!==null?"₹"+Number(item.price).toLocaleString("en-IN"):"Price on confirmation"}</p></div></div>
    <article className="rounded-2xl bg-white p-5 shadow-sm"><h3 className="font-extrabold">Scan information</h3><div className="mt-4 grid gap-4 sm:grid-cols-2"><div><p className="text-xs font-bold text-slate-500">Preparation</p><p className="mt-1 text-sm">{item.preparation||"To be confirmed by the diagnostic centre"}</p></div><div><p className="text-xs font-bold text-slate-500">Report time</p><p className="mt-1 text-sm">{item.report_tat||"To be confirmed by the diagnostic centre"}</p></div></div><p className="mt-4 text-xs leading-5 text-slate-500">Centre location, appointment availability, preparation and final price are confirmed by MFIT before booking.</p></article>
    <div className="grid grid-cols-2 gap-3"><button type="button" onClick={()=>addHealthCartItem(item.slug)} className="min-h-12 rounded-xl border border-[#08aeb1] text-sm font-extrabold text-[#078b8d]">ADD TO CART</button><Link href={`/health-checkup/checkout?item=${encodeURIComponent(item.slug)}`} className="flex min-h-12 items-center justify-center rounded-xl bg-[#08aeb1] text-sm font-extrabold text-white">BOOK THIS SCAN</Link></div>
   </>}
  </section>
 </main>;
}


export default function ScanDetailPage(){
 return <Suspense fallback={<main className="min-h-screen bg-[#f6f9fa] p-6 text-sm text-slate-500">Loading scan details…</main>}><ScanDetailContent /></Suspense>;
}
