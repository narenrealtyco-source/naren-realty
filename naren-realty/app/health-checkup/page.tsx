"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const categories = [
  { key: "blood-tests", title: "Blood Tests", image: "https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=1100&q=90" },
  { key: "full-body-checkups", title: "Full Body Check-ups", image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1100&q=90" },
  { key: "home-sample-collection", title: "Home Sample Collection", image: "https://images.unsplash.com/photo-1584982751601-97dcc096659c?auto=format&fit=crop&w=1100&q=90" },
  { key: "specialist-consultation", title: "Specialist Consultation", image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=1100&q=90" },
  { key: "womens-mens-health", title: "Women's & Men's Health", image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1100&q=90" },
  { key: "physiotherapy", title: "Physiotherapy", image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1100&q=90" },
];

function HealthContent() {
  const params = useSearchParams();
  const selected = params.get("category") ?? "";
  return (
    <main className="min-h-screen bg-[#f4f7fc] text-slate-900">
      <header className="bg-[#10243A] px-4 py-4 text-white sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <Link href="/" className="text-lg font-extrabold sm:text-2xl">NAREN <span className="text-amber-400">REALTY</span></Link>
          <Link href="/" className="text-sm font-semibold text-amber-300 hover:text-amber-200">← Home</Link>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Discover health services</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#10243A] sm:text-4xl">Health & Care</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">Explore health services and care options.</p>
          </div>
          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#10243A] shadow-sm ring-1 ring-slate-200">Health</span>
        </div>
        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:gap-5">
          {categories.map((category) => (
            <Link key={category.key} href={selected === category.key ? "/health-checkup" : `/health-checkup?category=${category.key}`} aria-label={category.title} aria-current={selected === category.key ? "page" : undefined}
              className={`group relative block aspect-[4/3] overflow-hidden rounded-2xl bg-[#10243A] shadow-md ring-1 transition duration-300 hover:-translate-y-1 hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${selected === category.key ? "ring-2 ring-amber-400" : "ring-slate-900/10"}`}>
              <img src={category.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#07182b]/95 via-[#07182b]/15 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3 sm:p-4">
                <h2 className="text-sm font-extrabold leading-tight text-white drop-shadow sm:text-base lg:text-lg">{category.title}</h2>
                <span className="mb-0.5 grid size-7 shrink-0 place-items-center rounded-full border border-white/40 bg-white/15 text-sm font-bold text-white backdrop-blur-sm transition group-hover:bg-amber-400 group-hover:text-[#10243A]">↗</span>
              </div>
            </Link>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-slate-500">Verified service partners and booking options will appear here as they join.</p>
      </div>
    </main>
  );
}

export default function HealthPage() {
  return <Suspense fallback={<main className="min-h-screen bg-[#f4f7fc] p-6 text-[#10243A]">Loading health services...</main>}><HealthContent /></Suspense>;
}
