"use client";
import { useEffect, useMemo, useState } from "react";
import HealthStoreHeader from "../_components/HealthStoreHeader";
import Link from "next/link";
import { ProductCard } from "../_components/HealthStoreHome";
import { addHealthCartItem } from "../_components/cart";

type Item={id:string;slug:string;item_type:"test";title:string;category:string;description:string;inclusions:string[];sample_type:string|null;preparation:string|null;report_tat:string|null;price:number|null;mrp:number|null;is_active:boolean;provider_verified:boolean};
export default function LabTestsPage(){
 const [items,setItems]=useState<Item[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[query,setQuery]=useState(""),[category,setCategory]=useState("All");
 useEffect(()=>{const params=new URLSearchParams(window.location.search);const initialCategory=params.get("category");const initialQuery=params.get("q");if(initialCategory)setCategory(initialCategory);if(initialQuery)setQuery(initialQuery);},[]);
 useEffect(()=>{fetch("/api/health-catalog",{cache:"no-store"}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||"Unable to load tests");setItems((d.items||[]).filter((x:Item)=>x.item_type==="test"));}).catch(e=>setError(e.message)).finally(()=>setLoading(false));},[]);
 const categories=useMemo(()=>["All",...Array.from(new Set(items.map(x=>x.category))).sort()], [items]);
 const visible=useMemo(()=>items.filter(x=>(category==="All"||x.category===category)&&(x.title+" "+x.description+" "+x.category).toLowerCase().includes(query.toLowerCase())).sort((a,b)=>a.title.localeCompare(b.title)),[items,category,query]);
 return <main className="min-h-screen bg-[#f7fafb] pb-24 text-slate-900">
  <HealthStoreHeader title="Individual Lab Tests" backHref="/health-checkup" />
  <section className="mx-auto max-w-4xl px-4 py-6"><div className="rounded-3xl bg-gradient-to-br from-[#dff7f4] to-[#eff7ff] p-6"><p className="text-xs font-bold uppercase tracking-widest text-[#078b8d]">Diagnostics catalogue</p><h2 className="mt-2 text-2xl font-extrabold">Browse individual tests</h2><p className="mt-2 text-sm leading-6 text-slate-600">Check the test purpose, sample type, preparation and included parameters before adding it to your booking.</p></div>
   <label className="mt-5 flex items-center gap-3 rounded-2xl border bg-white px-4 py-3"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search CBC, Thyroid, Vitamin D, LFT..." className="w-full bg-transparent text-sm outline-none"/></label>
   <div className="mt-4 flex gap-2 overflow-x-auto pb-2">{categories.map(c=><button key={c} onClick={()=>setCategory(c)} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold ${category===c?"border-[#078b8d] bg-[#e8f8f6] text-[#067d80]":"border-slate-200 bg-white"}`}>{c}</button>)}</div>
   <p className="my-3 text-xs text-slate-500">{loading?"Loading catalogue…":`${visible.length} tests listed`}</p>
   {error&&<p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
   <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{visible.map(t=><ProductCard key={t.slug} item={t} onAddToCart={addHealthCartItem} />)}</div>
   {!loading&&!error&&visible.length===0&&<p className="rounded-xl bg-white p-6 text-center text-sm text-slate-500">No matching tests found.</p>}
   <p className="mt-5 text-[11px] leading-5 text-slate-400">Prices are displayed only after MFIT verifies them with the performing laboratory. Test information is not medical advice.</p>
  </section>
  <HealthNav active="tests"/>
 </main>;
}
function HealthNav({active}:{active:string}){return <nav className="fixed inset-x-0 bottom-0 z-30 grid h-[68px] grid-cols-4 border-t bg-white pb-[env(safe-area-inset-bottom)] text-[11px]"><Link href="/health-checkup" className="flex flex-col items-center justify-center gap-1">⌂<span>Home</span></Link><Link href="/health-checkup/tests" className={`flex flex-col items-center justify-center gap-1 ${active==="tests"?"font-extrabold text-[#078b8d]":""}`}>⚗<span>Lab Tests</span></Link><Link href="/health-checkup/scans" className="flex flex-col items-center justify-center gap-1">▣<span>Scans</span></Link><Link href="/health-checkup/my-orders" className="flex flex-col items-center justify-center gap-1">▤<span>My Orders</span></Link></nav>}
