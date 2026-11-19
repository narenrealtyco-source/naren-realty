"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const categories = [
  { key: "yoga", title: "Yoga", image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1100&q=90" },
  { key: "meditation", title: "Meditation", image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1100&q=90" },
  { key: "fitness-personal-training", title: "Fitness & Personal Training", image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1100&q=90" },
  { key: "zumba-dance-fitness", title: "Zumba & Dance Fitness", image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1100&q=90" },
  { key: "diet-nutrition", title: "Diet & Nutrition", image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1100&q=90" },
  { key: "wellness-workshops", title: "Wellness Workshops", image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1100&q=90" },
];

function LifestyleContent() {
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
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Discover your lifestyle</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#10243A] sm:text-4xl">Lifestyle & Wellness</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">Explore fitness, mindfulness and everyday wellness.</p>
          </div>
          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#10243A] shadow-sm ring-1 ring-slate-200">Lifestyle</span>
        </div>
        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:gap-5">
          {categories.map((category) => (
            <Link key={category.key} href={selected === category.key ? "/lifestyle" : `/lifestyle?category=${category.key}`} aria-label={category.title} aria-current={selected === category.key ? "page" : undefined}
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
        <p className="mt-6 text-center text-xs text-slate-500">Verified wellness partners and booking options will appear here as they join.</p>
      </div>
    </main>
  );
}

export default function LifestylePage() {
  return <Suspense fallback={<main className="min-h-screen bg-[#f4f7fc] p-6 text-[#10243A]">Loading lifestyle services...</main>}><LifestyleContent /></Suspense>;
}
