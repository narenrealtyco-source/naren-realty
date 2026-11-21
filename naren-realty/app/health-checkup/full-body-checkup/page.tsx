"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

const packages = [
  { title: "Comprehensive Gold Full Body Checkup with Smart Report", tests: 86, time: "7 hrs", price: 2499, mrp: 4998, image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=240&q=85", sameDay: true, details: ["Complete blood count", "Blood sugar and HbA1c", "Lipid profile", "Liver and kidney function", "Thyroid profile", "Urine routine"] },
  { title: "Men Advanced Plus Health Checkup with Smart Report", tests: 99, time: "10 hours", price: 3559, mrp: 7118, image: "https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=240&q=85", sameDay: true, details: ["Complete blood count", "Diabetes screening", "Heart health profile", "Liver and kidney function", "Thyroid profile", "Vitamin screening"] },
  { title: "Senior Citizen Men Advanced Health Checkup with Smart Report", tests: 103, time: "18 hours", price: 4299, mrp: 8598, image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=85", sameDay: false, details: ["Complete blood count", "Diabetes screening", "Heart health profile", "Liver and kidney function", "Thyroid profile", "Senior wellness screening"] },
];

export default function FullBodyCheckupPage() {
  const [sort, setSort] = useState("recommended");
  const [sameDayOnly, setSameDayOnly] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const visiblePackages = useMemo(() => {
    const list = packages.filter((item) => !sameDayOnly || item.sameDay);
    if (sort === "price-low") return [...list].sort((a,b) => a.price-b.price);
    if (sort === "price-high") return [...list].sort((a,b) => b.price-a.price);
    return list;
  }, [sort, sameDayOnly]);

  return (
    <main className="min-h-screen bg-white pb-8 text-[#191b20]">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Link href="/health-checkup" aria-label="Back to health home" className="grid size-11 shrink-0 place-items-center rounded-full border border-slate-200 text-2xl">‹</Link>
          <h1 className="min-w-0 flex-1 text-base font-extrabold leading-tight sm:text-lg">Full body health checkup packages</h1>
          <span className="grid size-11 place-items-center rounded-full border border-slate-200 text-xl">⌕</span>
          <Link href="/health-checkup#contact" aria-label="Contact MFIT" className="grid size-11 place-items-center rounded-full border border-slate-200 text-xl">♧</Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 pt-5">
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2.5 text-sm font-medium">
            Sort By
            <select aria-label="Sort packages" value={sort} onChange={(e) => setSort(e.target.value)} className="max-w-[118px] bg-transparent outline-none">
              <option value="recommended">Recommended</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option>
            </select>
          </label>
          <button type="button" onClick={() => setFiltersOpen(!filtersOpen)} aria-expanded={filtersOpen} className="rounded-full border border-slate-300 px-4 py-2.5 text-sm font-medium">All filters ⚙</button>
          <button type="button" onClick={() => setSameDayOnly(!sameDayOnly)} aria-pressed={sameDayOnly} className={`rounded-full border px-4 py-2.5 text-sm font-medium ${sameDayOnly ? "border-[#078b8d] bg-[#eaf8f7] text-[#067d80]" : "border-slate-300"}`}>Same day report</button>
        </div>
        {filtersOpen && <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm font-bold">Report time</p><label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={sameDayOnly} onChange={(e) => setSameDayOnly(e.target.checked)} /> Show same-day report packages only</label><p className="mt-2 text-xs text-slate-500">Package availability and report timelines are confirmed at booking.</p></div>}
      </div>

      <section className="mx-auto mt-4 max-w-3xl border-t border-slate-200">
        {visiblePackages.map((item, index) => (
          <article key={item.title} className="border-b-2 border-dashed border-slate-200 px-4 py-5 sm:px-5">
            <div className="flex items-start gap-4">
              <img src={item.image} alt="" className="mt-1 size-[76px] shrink-0 rounded-full bg-slate-100 object-cover" />
              <div className="min-w-0 flex-1">
                <h2 className="text-[17px] font-extrabold leading-[1.45] sm:text-lg">{item.title}</h2>
                <button type="button" onClick={() => setExpanded(expanded === index ? null : index)} aria-expanded={expanded === index} className="mt-4 flex flex-wrap items-center gap-1 text-sm text-slate-600"><span className="font-semibold text-[#16804b]">Package</span><span>• Contains {item.tests} tests</span><span className="ml-1 text-lg">{expanded === index ? "⌃" : "⌄"}</span></button>
                {expanded === index && <ul className="mt-3 grid grid-cols-1 gap-1 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 sm:grid-cols-2">{item.details.map((detail) => <li key={detail}>• {detail}</li>)}</ul>}
                <p className="mt-3 text-sm text-slate-600">Report {index === 0 ? "in" : "within"} <strong className={index === 0 ? "text-[#9655a5]" : "font-semibold text-slate-700"}>{item.time}</strong>{index === 0 && " ⚡"}</p>
                <p className="mt-5 flex flex-wrap items-baseline gap-2"><strong className="text-[25px] font-extrabold tracking-tight">₹{item.price}</strong><del className="text-sm text-slate-400">₹{item.mrp}</del><strong className="text-sm text-[#187345]">50% off</strong></p>
                <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#eef7ff] px-3 py-2 text-sm font-medium text-[#0872bd]"><span className="grid size-5 place-items-center rounded-full bg-[#1984ca] text-xs font-black text-white">%</span>Additional <strong>15% off</strong> with coupon</p>
                <Link href="/health-checkup#contact" className="mt-5 flex min-h-[68px] w-full max-w-[248px] items-center justify-center rounded-2xl border-2 border-slate-200 bg-white text-xl font-extrabold text-[#f05b4f] shadow-[0_5px_10px_rgba(15,40,55,0.09)]">BOOK</Link>
              </div>
            </div>
          </article>
        ))}
        {visiblePackages.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No packages match these filters.</p>}
      </section>
      <div className="mx-auto max-w-3xl px-4 py-6 text-center text-[11px] leading-5 text-slate-500">Prices, discounts, test inclusions, report timelines and home collection availability are indicative and must be confirmed by MFIT Healthcare before booking.</div>
    </main>
  );
}
