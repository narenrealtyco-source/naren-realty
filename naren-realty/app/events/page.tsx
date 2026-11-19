"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const categories = [
  { key: "meetups", title: "Meetups", detail: "Meet new people and build local connections.", image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=85" },
  { key: "party", title: "Party", detail: "House parties, music nights, food parties and bonfire nights.", image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=85" },
  { key: "cultural", title: "Cultural Events", detail: "Bhajan jamming, live music, dance and cultural gatherings.", image: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=900&q=85" },
  { key: "community", title: "Community Events", detail: "Lohri, Christmas, Holi, Diwali and local celebrations.", image: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=900&q=85" },
];

function EventsContent() {
  const params = useSearchParams();
  const selected = params.get("category") ?? "";
  const selectedCategory = categories.find((category) => category.key === selected);

  return (
    <main className="min-h-screen bg-[#f4f7fc] text-slate-900">
      <header className="bg-[#10243A] px-4 py-4 text-white sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="text-lg font-extrabold sm:text-2xl">NAREN <span className="text-amber-400">REALTY</span></Link>
          <Link href="/" className="text-sm font-semibold text-amber-300">← Home</Link>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Discover and join</p>
        <h1 className="mt-2 text-3xl font-extrabold text-[#10243A] sm:text-4xl">Local Events</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">Find meetups, parties, cultural programmes and community celebrations happening around you.</p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {categories.map((category) => (
            <Link key={category.key} href={`/events?category=${category.key}`} className={`group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 transition hover:-translate-y-1 hover:shadow-lg ${selected === category.key ? "ring-2 ring-amber-400" : "ring-slate-200"}`}>
              <div className="relative aspect-[4/3] bg-cover bg-center" style={{ backgroundImage: `linear-gradient(to top, rgba(8,20,39,.8), transparent 60%), url("${category.image}")` }}>
                <h2 className="absolute bottom-3 left-3 right-3 text-base font-extrabold text-white sm:text-lg">{category.title}</h2>
              </div>
              <p className="p-3 text-xs leading-5 text-slate-600 sm:text-sm">{category.detail}</p>
            </Link>
          ))}
        </div>
        <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
          <h2 className="text-xl font-bold text-[#10243A]">{selectedCategory ? selectedCategory.title : "Upcoming Events"}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">No approved events are listed here yet. New events will appear after NAREN REALTY admin review.</p>
          <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-950">
            <strong>Are you an event organizer?</strong>
            <p className="mt-1">Vendor registration and event submission will be available here once the organizer form is connected.</p>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function EventsPage() {
  return <Suspense fallback={<main className="min-h-screen bg-[#f4f7fc] p-6 text-[#10243A]">Loading events...</main>}><EventsContent /></Suspense>;
}
