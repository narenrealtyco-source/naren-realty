"use client";
import { useEffect, useMemo, useState } from "react";
import HealthStoreHeader from "../_components/HealthStoreHeader";
import Link from "next/link";
import { ProductCard } from "../_components/HealthStoreHome";

type Item={id:string;slug:string;item_type:"package";title:string;category:string;description:string;inclusions:string[];package_tests:Array<{slug:string;title:string;mappingStatus:string}>;sample_type:string|null;preparation:string|null;report_tat:string|null;price:number|null;mrp:number|null;is_active:boolean;provider_verified:boolean};
const categories=["All","Full Body","Men","Women","Senior Citizens","Children","Lifestyle","Fitness","Heart Health","Diabetes","Hormones","Organ Health"];
export default function HealthPackagesPage(){
 const [items,setItems]=useState<Item[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[category,setCategory]=useState("All"),[query,setQuery]=useState("");
 useEffect(()=>{const params=new URLSearchParams(window.location.search);const initialCategory=params.get("category");const initialQuery=params.get("q");if(initialCategory)setCategory(initialCategory);if(initialQuery)setQuery(initialQuery);},[]);
 useEffect(()=>{fetch("/api/health-catalog",{cache:"no-store"}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||"Unable to load packages");setItems((d.items||[]).filter((x:Item)=>x.item_type==="package"));}).catch(e=>setError(e.message)).finally(()=>setLoading(false));},[]);
 const visible=useMemo(()=>items.filter(p=>(category==="All"||p.category===category)&&(p.title+" "+p.description+" "+(p.inclusions||[]).join(" ")).toLowerCase().includes(query.toLowerCase())).sort((a,b)=>a.title.localeCompare(b.title)),[items,category,query]);
 return <main className="min-h-screen bg-[#f7fafb] pb-24 text-[#172326]">
  <HealthStoreHeader title="Health Checkup Packages" backHref="/health-checkup" />
  <section className="mx-auto max-w-4xl px-4 py-6"><div className="rounded-3xl bg-gradient-to-br from-[#dff7f4] to-[#edf5ff] p-6"><p className="text-xs font-bold uppercase tracking-widest text-[#078b8d]">Choose by health goal</p><h2 className="mt-2 text-2xl font-extrabold">Explore diagnostic packages</h2><p className="mt-2 text-sm leading-6 text-slate-600">Open each package to review its listed components, linked single tests, sample and preparation information before booking.</p></div>
   <label className="mt-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"><span className="text-xl">⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search packages or included tests" className="w-full bg-transparent text-sm outline-none"/></label>
   <div className="mt-4 flex gap-2 overflow-x-auto pb-2">{categories.map(c=><button key={c} onClick={()=>setCategory(c)} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold ${category===c?"border-[#078b8d] bg-[#e8f8f6] text-[#067d80]":"border-slate-200 bg-white text-slate-600"}`}>{c}</button>)}</div>
   <p className="my-3 text-xs text-slate-500">{loading?"Loading catalogue…":`${visible.length} packages listed`}</p>
   {error&&<p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
   <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{visible.map(p=><ProductCard key={p.slug} item={p} onAddToCart={(slug)=>{ if(typeof window!=="undefined"){ const current=JSON.parse(window.localStorage.getItem("mfit-health-cart")||"[]"); const next=Array.isArray(current)?current.filter((x):x is string=>typeof x==="string"):[]; if(!next.includes(slug))next.push(slug); window.localStorage.setItem("mfit-health-cart",JSON.stringify(next)); window.dispatchEvent(new Event("mfit-cart-updated")); } }} />)}</div>
   {!loading&&!error&&visible.length===0&&<p className="rounded-xl bg-white p-6 text-center text-sm text-slate-500">No matching packages found.</p>}
   <p className="mt-6 text-[11px] leading-5 text-slate-400">Prices and package panels are displayed only after MFIT verifies them with the performing laboratory. Clinical suitability should be confirmed with a qualified healthcare professional.</p>
  </section>
  <HealthNav/>
 </main>;
}
function HealthNav(){return <nav className="fixed inset-x-0 bottom-0 z-30 grid h-[68px] grid-cols-4 border-t bg-white pb-[env(safe-area-inset-bottom)] text-[11px]"><Link href="/health-checkup" className="flex flex-col items-center justify-center gap-1">⌂<span>Home</span></Link><Link href="/health-checkup/tests" className="flex flex-col items-center justify-center gap-1">⚗<span>Lab Tests</span></Link><Link href="/health-checkup/scans" className="flex flex-col items-center justify-center gap-1">▣<span>Scans</span></Link><Link href="/health-checkup/my-orders" className="flex flex-col items-center justify-center gap-1">▤<span>My Orders</span></Link></nav>}
