"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const categories = [
  { key: "meetups", title: "Meetups", image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=85" },
  { key: "party", title: "Party", image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=85" },
  { key: "cultural", title: "Cultural Events", image: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=900&q=85" },
  { key: "community", title: "Community Events", image: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=900&q=85" },
];

type EventItem = { id: string; title: string; venue: string; locality: string; starts_at: string; ticket_price: number; description: string; image_url: string | null };

function EventsContent() {
  const params = useSearchParams();
  const selected = params.get("category") ?? "";
  const selectedCategory = categories.find((category) => category.key === selected);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadEvents() {
      setLoading(true);
      let query = supabase.from("event_submissions")
        .select("id,title,venue,locality,starts_at,ticket_price,description,image_url")
        .eq("status", "approved")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true });
      if (selected) query = query.eq("category", selected);
      const { data, error } = await query;
      if (active) {
        if (error) console.error("[events] Approved event lookup failed", { code: error.code });
        setEvents((data ?? []) as EventItem[]);
        setLoading(false);
      }
    }
    loadEvents();
    return () => { active = false; };
  }, [selected]);

  return (
    <main className="min-h-screen bg-[#f4f7fc] text-slate-900">
      <header className="bg-[#10243A] px-4 py-4 text-white sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <Link href="/" className="text-lg font-extrabold sm:text-2xl">NAREN <span className="text-amber-400">REALTY</span></Link>
          <div className="flex items-center gap-3">
            <Link href="/events/submit" className="inline-flex min-h-10 items-center rounded-lg bg-amber-400 px-3 text-xs font-extrabold text-[#10243A] hover:bg-amber-300 sm:px-4 sm:text-sm">Post Your Event</Link>
            <Link href="/" className="text-sm font-semibold text-amber-300">← Home</Link>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Discover and join</p>
        <h1 className="mt-2 text-3xl font-extrabold text-[#10243A] sm:text-4xl">Local Events</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">Find meetups, parties, cultural programmes and community celebrations happening around you.</p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {categories.map((category) => (
            <Link key={category.key} href={selected === category.key ? "/events" : `/events?category=${category.key}`}
              aria-label={category.title}
              className={`group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 transition hover:-translate-y-1 hover:shadow-lg ${selected === category.key ? "ring-2 ring-amber-400" : "ring-slate-200"}`}>
              <div className="relative aspect-[4/3] bg-cover bg-center" style={{ backgroundImage: `linear-gradient(to top, rgba(8,20,39,.8), transparent 60%), url("${category.image}")` }}>
                <h2 className="absolute bottom-3 left-3 right-3 text-base font-extrabold text-white sm:text-lg">{category.title}</h2>
              </div>
            </Link>
          ))}
        </div>
        <section className="mt-7" aria-live="polite">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-[#10243A] sm:text-2xl">{selectedCategory ? `${selectedCategory.title} Events` : "All Events"}</h2>
            {selectedCategory && <Link href="/events" className="text-sm font-semibold text-blue-800 underline">View all</Link>}
          </div>
          {loading ? <p className="mt-4 text-sm text-slate-600">Loading events...</p> : events.length === 0 ? (
            <p className="mt-3 rounded-xl bg-white px-4 py-5 text-sm text-slate-600 shadow-sm ring-1 ring-slate-200">
              {selectedCategory ? `No approved ${selectedCategory.title.toLowerCase()} events are listed yet.` : "No approved events are listed yet."}
            </p>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <article key={event.id} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
                  {event.image_url && <img src={event.image_url} alt="" className="h-44 w-full object-cover" />}
                  <div className="p-4">
                    <h3 className="text-lg font-bold text-[#10243A]">{event.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{event.venue}, {event.locality}</p>
                    <p className="mt-2 text-sm font-semibold text-slate-700">{new Date(event.starts_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
                    <p className="mt-2 text-sm text-slate-600">{event.description}</p>
                    <p className="mt-3 text-sm font-extrabold text-[#10243A]">{event.ticket_price > 0 ? `₹${event.ticket_price}` : "Free entry"}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default function EventsPage() {
  return <Suspense fallback={<main className="min-h-screen bg-[#f4f7fc] p-6 text-[#10243A]">Loading events...</main>}><EventsContent /></Suspense>;
}
