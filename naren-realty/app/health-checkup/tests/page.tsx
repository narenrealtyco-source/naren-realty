"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

const tests = [
  { name: "Complete Blood Count (CBC)", group: "Blood", detail: "Screens red cells, white cells and platelets", price: "Price on enquiry", tag: "Popular" },
  { name: "Thyroid Profile (T3, T4, TSH)", group: "Hormones", detail: "Assesses key thyroid hormone levels", price: "Price on enquiry", tag: "Popular" },
  { name: "Lipid Profile", group: "Heart health", detail: "Measures cholesterol and triglycerides", price: "Price on enquiry", tag: "Heart health" },
  { name: "HbA1c", group: "Diabetes", detail: "Provides an estimate of average blood glucose over time", price: "Price on enquiry", tag: "Diabetes" },
  { name: "Vitamin D", group: "Vitamins", detail: "Measures vitamin D level in blood", price: "Price on enquiry", tag: "Wellness" },
  { name: "Vitamin B12", group: "Vitamins", detail: "Measures vitamin B12 level", price: "Price on enquiry", tag: "Wellness" },
  { name: "Liver Function Test (LFT)", group: "Organ health", detail: "Checks enzymes and markers related to liver health", price: "Price on enquiry", tag: "Popular" },
  { name: "Kidney Function Test (KFT)", group: "Organ health", detail: "Checks markers related to kidney function", price: "Price on enquiry", tag: "Popular" },
  { name: "Urine Routine", group: "Urine", detail: "Routine urine analysis", price: "Price on enquiry", tag: "Screening" },
];
const filters = ["All", "Blood", "Hormones", "Heart health", "Diabetes", "Vitamins", "Organ health", "Urine"];

export default function LabTestsPage() {
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recommended");
  const visible = useMemo(() => tests.filter(t => (filter === "All" || t.group === filter) && (t.name + t.detail).toLowerCase().includes(query.toLowerCase())).sort((a,b) => sort === "az" ? a.name.localeCompare(b.name) : 0), [filter, query, sort]);
  return <main className="min-h-screen bg-[#f7fafb] pb-8 text-slate-900">
    <header className="sticky top-0 z-20 border-b bg-white/95 px-4 py-4 backdrop-blur"><div className="mx-auto flex max-w-3xl items-center gap-3"><Link href="/health-checkup" className="grid size-10 place-items-center rounded-full border text-2xl">‹</Link><div className="flex-1"><p className="text-xs font-bold uppercase tracking-widest text-[#078b8d]">MFIT Healthcare</p><h1 className="text-lg font-extrabold">Lab Tests</h1></div><Link href="/health-checkup/my-orders" className="text-sm font-semibold">My Orders</Link></div></header>
    <section className="mx-auto max-w-3xl px-4 py-6"><div className="rounded-3xl bg-gradient-to-br from-[#dff7f4] to-[#eff7ff] p-6"><p className="text-xs font-bold uppercase tracking-widest text-[#078b8d]">Diagnostic testing</p><h2 className="mt-2 text-2xl font-extrabold">Find the right test for your health needs</h2><p className="mt-2 text-sm leading-6 text-slate-600">Explore common lab tests and enquire about availability, sample collection and pricing.</p></div>
    <label className="mt-5 flex items-center gap-3 rounded-2xl border bg-white px-4 py-3"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search tests, e.g. CBC, Thyroid, Vitamin D" className="w-full bg-transparent text-sm outline-none"/></label>
    <div className="mt-4 flex items-center justify-between"><h2 className="font-extrabold">Browse tests</h2><select aria-label="Sort tests" value={sort} onChange={e=>setSort(e.target.value)} className="rounded-full border bg-white px-3 py-2 text-xs"><option value="recommended">Recommended</option><option value="az">A to Z</option></select></div>
    <div className="mt-3 flex gap-2 overflow-x-auto pb-2">{filters.map(f=><button key={f} onClick={()=>setFilter(f)} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold ${filter===f?"border-[#078b8d] bg-[#e8f8f6] text-[#067d80]":"border-slate-200 bg-white"}`}>{f}</button>)}</div>
    <div className="mt-3 space-y-3">{visible.map(t=><article key={t.name} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><span className="rounded-full bg-[#eff8f7] px-2.5 py-1 text-[10px] font-bold text-[#078b8d]">{t.tag}</span><h3 className="mt-2 font-extrabold">{t.name}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{t.detail}</p><p className="mt-3 text-xs font-semibold text-slate-600">{t.price}</p></div><span className="text-2xl text-[#078b8d]">⌁</span></div><Link href="/health-checkup#contact" className="mt-4 flex min-h-11 items-center justify-center rounded-xl border border-[#08b8bb] text-sm font-extrabold text-[#078b8d]">ENQUIRE</Link></article>)}
    {visible.length===0&&<p className="rounded-xl bg-white p-6 text-center text-sm text-slate-500">No matching tests found.</p>}</div>
    <p className="mt-5 text-[11px] leading-5 text-slate-400">Test availability, preparation instructions, pricing and sample collection are confirmed by MFIT Healthcare before booking. This information is not medical advice.</p></section>
    <nav className="fixed inset-x-0 bottom-0 z-30 grid h-[68px] grid-cols-4 border-t bg-white pb-[env(safe-area-inset-bottom)] text-[11px]"><Link href="/health-checkup" className="flex flex-col items-center justify-center gap-1">⌂<span>Home</span></Link><Link href="/health-checkup/tests" className="flex flex-col items-center justify-center gap-1 font-extrabold text-[#078b8d]">⚗<span>Lab Tests</span></Link><Link href="/health-checkup/scans" className="flex flex-col items-center justify-center gap-1">▣<span>Scans</span></Link><Link href="/health-checkup/my-orders" className="flex flex-col items-center justify-center gap-1">▤<span>My Orders</span></Link></nav>
  </main>;
}
