"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { healthPackages } from "@/lib/health-catalog";

const categories = ["All", "Full Body", "Men", "Women", "Senior Citizens", "Children", "Lifestyle", "Fitness", "Heart Health", "Diabetes", "Hormones", "Organ Health"];

export default function HealthPackagesPage() {
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const visible = useMemo(() => healthPackages.filter((p) =>
    (category === "All" || p.category === category) &&
    (p.title + " " + p.description + " " + (p.inclusions || []).join(" ")).toLowerCase().includes(query.toLowerCase())
  ), [category, query]);

  return <main className="min-h-screen bg-[#f7fafb] pb-24 text-[#172326]">
    <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/95 px-4 py-4 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center gap-3">
        <Link href="/health-checkup" aria-label="Back" className="grid size-10 place-items-center rounded-full border border-slate-200 text-2xl">‹</Link>
        <div className="flex-1"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#078b8d]">MFIT Healthcare</p><h1 className="text-lg font-extrabold">Health Checkup Packages</h1></div>
        <Link href="/health-checkup/tests" className="text-xs font-bold text-[#078b8d]">Single Tests</Link>
      </div>
    </header>
    <section className="mx-auto max-w-4xl px-4 py-6">
      <div className="rounded-3xl bg-gradient-to-br from-[#dff7f4] to-[#edf5ff] p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-[#078b8d]">Choose by health goal</p>
        <h2 className="mt-2 text-2xl font-extrabold">Explore diagnostic packages</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Compare package coverage and check the included tests before requesting a booking.</p>
      </div>
      <label className="mt-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"><span className="text-xl">⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search packages or included tests" className="w-full bg-transparent text-sm outline-none"/></label>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">{categories.map(c=><button key={c} onClick={()=>setCategory(c)} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold ${category===c?"border-[#078b8d] bg-[#e8f8f6] text-[#067d80]":"border-slate-200 bg-white text-slate-600"}`}>{c}</button>)}</div>
      <p className="my-3 text-xs text-slate-500">{visible.length} packages listed</p>
      <div className="space-y-3">{visible.map(p=><article key={p.slug} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><span className="rounded-full bg-[#eff8f7] px-2.5 py-1 text-[10px] font-bold text-[#078b8d]">{p.category}</span><h3 className="mt-2 text-base font-extrabold leading-snug">{p.title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{p.description}</p><p className="mt-2 text-xs font-semibold text-slate-600">Panel details pending lab confirmation · {p.sample}</p></div><span className="shrink-0 rounded-xl bg-[#f2fbfa] px-2 py-2 text-[10px] font-bold text-[#078b8d]">MFIT</span></div>
        <button type="button" onClick={()=>setExpanded(expanded===p.slug?null:p.slug)} aria-expanded={expanded===p.slug} className="mt-4 flex w-full items-center justify-between border-t border-slate-100 pt-3 text-sm font-bold text-[#087f82]">View included tests <span>{expanded===p.slug?"−":"+"}</span></button>
        {expanded===p.slug&&<div className="mt-3 rounded-xl bg-slate-50 p-3"><ul className="grid gap-2 sm:grid-cols-2">{(p.inclusions||[]).map(x=><li key={x} className="flex gap-2 text-xs leading-5 text-slate-700"><span className="text-[#078b8d]">✓</span>{x}</li>)}</ul><div className="mt-4 grid gap-2 border-t border-slate-200 pt-3 text-xs text-slate-600"><p><b>Sample:</b> {p.sample}</p><p><b>Preparation:</b> {p.preparation}</p><p><b>Report time:</b> {p.reportTime}</p></div></div>}
        <div className="mt-4 flex items-center justify-between gap-3"><div><p className="text-[10px] text-slate-400">Price</p><p className="text-sm font-extrabold">Confirming with lab partner</p></div><Link href="/health-checkup#contact" className="rounded-xl bg-[#08aeb1] px-5 py-3 text-xs font-extrabold text-white">ENQUIRE</Link></div>
      </article>)}</div>
      {visible.length===0&&<p className="rounded-xl bg-white p-6 text-center text-sm text-slate-500">No matching packages found.</p>}
      <p className="mt-6 text-[11px] leading-5 text-slate-400">Package names and broad screening categories are reference-led. Exact panel contents, test count, clinical suitability, prices, discounts and report timelines must be confirmed with the performing laboratory before sale. This catalogue is not medical advice.</p>
    </section>
    <nav className="fixed inset-x-0 bottom-0 z-30 grid h-[68px] grid-cols-4 border-t bg-white pb-[env(safe-area-inset-bottom)] text-[11px]"><Link href="/health-checkup" className="flex flex-col items-center justify-center gap-1">⌂<span>Home</span></Link><Link href="/health-checkup/packages" className="flex flex-col items-center justify-center gap-1 font-extrabold text-[#078b8d]">▦<span>Packages</span></Link><Link href="/health-checkup/tests" className="flex flex-col items-center justify-center gap-1">⚗<span>Lab Tests</span></Link><Link href="/health-checkup/my-orders" className="flex flex-col items-center justify-center gap-1">▤<span>My Orders</span></Link></nav>
  </main>;
}
