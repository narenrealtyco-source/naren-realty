"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { healthTests } from "@/lib/health-catalog";

const filters = ["All", ...Array.from(new Set(healthTests.map(t => t.category)))];

export default function LabTestsPage() {
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recommended");
  const [expanded, setExpanded] = useState<string | null>(null);
  const visible = useMemo(() => healthTests
    .filter(t => (filter === "All" || t.category === filter) && (t.title + " " + t.description + " " + t.category).toLowerCase().includes(query.toLowerCase()))
    .sort((a,b) => sort === "az" ? a.title.localeCompare(b.title) : 0), [filter, query, sort]);

  return <main className="min-h-screen bg-[#f7fafb] pb-24 text-slate-900">
    <header className="sticky top-0 z-20 border-b bg-white/95 px-4 py-4 backdrop-blur"><div className="mx-auto flex max-w-3xl items-center gap-3"><Link href="/health-checkup" className="grid size-10 place-items-center rounded-full border text-2xl">‹</Link><div className="flex-1"><p className="text-xs font-bold uppercase tracking-widest text-[#078b8d]">MFIT Healthcare</p><h1 className="text-lg font-extrabold">Individual Lab Tests</h1></div><Link href="/health-checkup/packages" className="text-sm font-semibold text-[#078b8d]">Packages</Link></div></header>
    <section className="mx-auto max-w-3xl px-4 py-6">
      <div className="rounded-3xl bg-gradient-to-br from-[#dff7f4] to-[#eff7ff] p-6"><p className="text-xs font-bold uppercase tracking-widest text-[#078b8d]">Diagnostics catalogue</p><h2 className="mt-2 text-2xl font-extrabold">Browse individual tests</h2><p className="mt-2 text-sm leading-6 text-slate-600">Review what each test measures, sample type and general preparation notes. Final instructions are confirmed by the processing laboratory.</p></div>
      <label className="mt-5 flex items-center gap-3 rounded-2xl border bg-white px-4 py-3"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search CBC, Thyroid, Vitamin D, LFT..." className="w-full bg-transparent text-sm outline-none"/></label>
      <div className="mt-4 flex items-center justify-between"><h2 className="font-extrabold">All available tests</h2><select aria-label="Sort tests" value={sort} onChange={e=>setSort(e.target.value)} className="rounded-full border bg-white px-3 py-2 text-xs"><option value="recommended">Recommended</option><option value="az">A to Z</option></select></div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-2">{filters.map(f=><button key={f} onClick={()=>setFilter(f)} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold ${filter===f?"border-[#078b8d] bg-[#e8f8f6] text-[#067d80]":"border-slate-200 bg-white"}`}>{f}</button>)}</div>
      <p className="my-3 text-xs text-slate-500">{visible.length} tests listed</p>
      <div className="space-y-3">{visible.map(t=><article key={t.slug} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3"><div><span className="rounded-full bg-[#eff8f7] px-2.5 py-1 text-[10px] font-bold text-[#078b8d]">{t.category}</span><h3 className="mt-2 font-extrabold">{t.title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{t.description}</p></div><span className="text-2xl text-[#078b8d]">⌁</span></div>
        <button type="button" onClick={()=>setExpanded(expanded===t.slug?null:t.slug)} aria-expanded={expanded===t.slug} className="mt-3 flex w-full items-center justify-between border-t border-slate-100 pt-3 text-xs font-bold text-[#078b8d]">Test details & preparation <span>{expanded===t.slug?"−":"+"}</span></button>
        {expanded===t.slug&&<div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600"><p><b>Sample type:</b> {t.sample}</p><p className="mt-2"><b>Preparation:</b> {t.preparation}</p><p className="mt-2"><b>Expected report time:</b> {t.reportTime}</p>{t.inclusions?.length ? <><p className="mt-2 font-bold text-slate-700">Commonly reported components</p><ul className="mt-1 list-disc pl-5">{t.inclusions.map(i=><li key={i}>{i}</li>)}</ul></> : null}</div>}
        <div className="mt-4 flex items-center justify-between gap-3"><p className="text-xs font-semibold text-slate-600">Price on confirmation</p><Link href="/health-checkup#contact" className="rounded-xl border border-[#08b8bb] px-5 py-3 text-xs font-extrabold text-[#078b8d]">ENQUIRE</Link></div>
      </article>)}</div>
      {visible.length===0&&<p className="rounded-xl bg-white p-6 text-center text-sm text-slate-500">No matching tests found.</p>}
      <p className="mt-5 text-[11px] leading-5 text-slate-400">This is general test information, not medical advice. Test availability, exact methodology, sample requirements, preparation, report time and price must be confirmed by the performing laboratory. A qualified clinician should advise which tests are appropriate.</p>
    </section>
    <nav className="fixed inset-x-0 bottom-0 z-30 grid h-[68px] grid-cols-4 border-t bg-white pb-[env(safe-area-inset-bottom)] text-[11px]"><Link href="/health-checkup" className="flex flex-col items-center justify-center gap-1">⌂<span>Home</span></Link><Link href="/health-checkup/packages" className="flex flex-col items-center justify-center gap-1">▦<span>Packages</span></Link><Link href="/health-checkup/tests" className="flex flex-col items-center justify-center gap-1 font-extrabold text-[#078b8d]">⚗<span>Lab Tests</span></Link><Link href="/health-checkup/my-orders" className="flex flex-col items-center justify-center gap-1">▤<span>My Orders</span></Link></nav>
  </main>;
}
