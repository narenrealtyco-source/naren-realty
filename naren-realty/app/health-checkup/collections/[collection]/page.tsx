"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type PackageItem = { id:string; item_type:string; slug:string; title:string; category:string; description:string; inclusions:string[]; package_tests:Array<{slug:string;title:string;mappingStatus:string}>; sample_type:string|null; preparation:string|null; report_tat:string|null; price:number|null; mrp:number|null; is_active:boolean; provider_verified:boolean };

const collections: Record<string,{title:string;eyebrow:string;description:string;slugs:string[]}> = {
  "full-body": { title:"Full Body Health Checkup Packages", eyebrow:"Complete health screening", description:"Choose from our curated full body health checkup packages, from essential screening to more comprehensive options.", slugs:["basic-full-body-checkup","advanced-full-body-checkup","comprehensive-silver-full-body","comprehensive-gold-full-body","comprehensive-diamond-full-body","comprehensive-platinum-full-body","executive-health-checkup"] },
  "womens-health": { title:"Women's Health Checkup Packages", eyebrow:"Women's wellness", description:"Explore health checkup options curated around women's health and preventive screening.", slugs:["women-basic-health-checkup","women-advanced-plus","women-comprehensive-health-checkup","pcos-screening-panel","pregnancy-wellness-lab-panel","fitness-advanced-women","stress-fatigue-women","weight-management-women"] },
  "senior-citizens": { title:"Senior Citizen Health Checkup Packages", eyebrow:"Healthy ageing", description:"Explore preventive health checkup options for senior citizens.", slugs:["senior-citizen-essential","senior-citizen-men-checkup","senior-men-advanced","senior-citizen-women-checkup"] },
  "senior-women": { title:"Senior Women's Health Checkup Packages", eyebrow:"Senior women's wellness", description:"A curated selection of health checkup options for senior women.", slugs:["senior-citizen-women-checkup","senior-citizen-essential"] },
  "mens-health": { title:"Men's Health Checkup Packages", eyebrow:"Men's wellness", description:"Explore health screening packages curated for men's health.", slugs:["men-basic-health-checkup","men-advanced-plus","men-comprehensive-health-checkup","fitness-advanced-men","stress-fatigue-men","weight-management-men"] },
  "fitness": { title:"Fitness Health Checkup Packages", eyebrow:"Fitness and wellbeing", description:"Health screening options related to fitness, nutrition and active lifestyles.", slugs:["fitness-advanced-men","fitness-advanced-women","nutrition-checkup","weight-management-men","weight-management-women"] },
  "children": { title:"Children's Health Checkup Packages", eyebrow:"Growing healthy", description:"Explore checkup options designed around children's growth and wellbeing.", slugs:["child-basic-health-checkup","children-health-checkup","adolescent-health-checkup"] },
  "lifestyle": { title:"Lifestyle Health Checkup Packages", eyebrow:"Everyday wellbeing", description:"Curated health screening options related to nutrition, fatigue, stress and lifestyle concerns.", slugs:["fatigue-monitoring","fatigue-and-weakness-panel","nutrition-checkup","stress-fatigue-men","stress-fatigue-women","weight-management-men","weight-management-women","bone-health-screening"] },
  "heart-health": { title:"Heart Health Checkup Packages", eyebrow:"Heart health", description:"Explore the available heart health screening package.", slugs:["heart-health-checkup"] },
  "diabetes-care": { title:"Diabetes Care Packages", eyebrow:"Diabetes screening", description:"Explore the available diabetes care health checkup package.", slugs:["diabetes-care-checkup"] },
  "organ-health": { title:"Organ Health Checkup Packages", eyebrow:"Organ health", description:"Explore screening options for kidney and liver health.", slugs:["kidney-health-screening","liver-health-screening"] },
  "thyroid-care": { title:"Thyroid Health Checkup Packages", eyebrow:"Thyroid health", description:"Explore the available thyroid care package.", slugs:["thyroid-care-checkup"] }
};

export default function HealthPackageCollectionPage() {
  const [collectionKey,setCollectionKey] = useState("full-body");
  const collection = collections[collectionKey] || collections["full-body"];
  useEffect(() => { const key=window.location.pathname.split("/").filter(Boolean).pop()||"full-body"; if(collections[key]) setCollectionKey(key); },[]);
  const [items,setItems] = useState<PackageItem[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  useEffect(() => {
    fetch("/api/health-catalog",{cache:"no-store"})
      .then(async r => { const d=await r.json(); if(!r.ok) throw new Error(d.error||"Unable to load packages"); setItems((d.items||[]).filter((x:PackageItem)=>x.item_type==="package")); })
      .catch(e=>setError(e.message))
      .finally(()=>setLoading(false));
  },[]);
  const visible = useMemo(() => {
    const bySlug = new Map(items.map(item=>[item.slug,item]));
    return collection.slugs.map(slug=>bySlug.get(slug)).filter((item):item is PackageItem=>!!item);
  },[items,collection]);
  return <main className="min-h-screen bg-[#f7fafb] pb-24 text-[#172326]">
    <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/95 px-4 py-4 backdrop-blur"><div className="mx-auto flex max-w-4xl items-center gap-3"><Link href="/health-checkup" aria-label="Back to home" className="grid size-10 place-items-center rounded-full border border-slate-200 text-2xl">‹</Link><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#078b8d]">MFIT Healthcare</p><p className="text-sm font-extrabold">Health packages</p></div></div></header>
    <section className="mx-auto max-w-4xl px-4 py-6">
      <div className="rounded-3xl bg-gradient-to-br from-[#dff7f4] to-[#edf5ff] p-6 sm:p-8"><p className="text-xs font-bold uppercase tracking-widest text-[#078b8d]">{collection.eyebrow}</p><h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">{collection.title}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{collection.description}</p></div>
      <div className="mt-6 flex items-center justify-between"><h2 className="text-lg font-extrabold">Available packages</h2><span className="text-xs font-semibold text-slate-500">{loading?"Loading…":`${visible.length} packages`}</span></div>
      {error&&<p className="mt-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
      <div className="mt-4 space-y-3">{visible.map((p,index)=><article key={p.slug} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#eaf8f7] text-lg font-black text-[#078b8d]">{index+1}</span><div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-wide text-[#078b8d]">{p.category}</p><h3 className="mt-1 text-base font-extrabold leading-snug">{p.title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{p.description||"Preventive health screening package"}</p></div></div>
        <div className="mt-4 rounded-xl bg-[#fff8eb] px-3 py-2 text-xs font-semibold text-[#8a641d]">Lab partner verification and package pricing pending</div>
        <div className="mt-4 flex items-center justify-between gap-3"><span className="text-xs text-slate-500">Price to be confirmed</span><Link href={`/health-checkup/checkout?item=${encodeURIComponent(p.slug)}`} className="rounded-xl bg-[#08aeb1] px-5 py-3 text-xs font-extrabold text-white">VIEW PACKAGE</Link></div>
      </article>)}</div>
      {!loading&&!error&&visible.length===0&&<p className="mt-4 rounded-xl bg-white p-6 text-center text-sm text-slate-500">Packages for this collection are being added. Please check back soon.</p>}
      <p className="mt-6 text-[11px] leading-5 text-slate-400">Exact package components, prices, availability and report timelines will be confirmed with the diagnostic partner before paid bookings are enabled.</p>
    </section>
    <nav className="fixed inset-x-0 bottom-0 z-30 grid h-[68px] grid-cols-4 border-t bg-white pb-[env(safe-area-inset-bottom)] text-[11px]"><Link href="/health-checkup" className="flex flex-col items-center justify-center gap-1">⌂<span>Home</span></Link><Link href="/health-checkup/tests" className="flex flex-col items-center justify-center gap-1">⚗<span>Lab Tests</span></Link><Link href="/health-checkup/scans" className="flex flex-col items-center justify-center gap-1">▣<span>Scans</span></Link><Link href="/health-checkup/my-orders" className="flex flex-col items-center justify-center gap-1">▤<span>My Orders</span></Link></nav>
  </main>;
}
