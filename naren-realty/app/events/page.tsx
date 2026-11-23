"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import EventCategoryButtons from "../components/EventCategoryButtons";
import { EVENT_CATEGORIES, getEventCategoryKey } from "../components/eventCategories";

const categories = EVENT_CATEGORIES;

type EventItem = {
  id: string; title: string; category: string; subcategory: string | null;
  custom_event_type: string | null; venue: string; locality: string | null;
  event_mode: string; location_status: string; starts_at: string;
  ticket_price: number; total_capacity: number | null; available_seats: number | null;
  description: string; image_url: string | null; ends_at: string | null;
};

function EventsContent() {
  const params = useSearchParams();
  const categoryParam = params.get("category") ?? "";
  const initialCategory = categoryParam;
  const initialSubcategory = params.get("subcategory") ?? "";
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [likedEvents, setLikedEvents] = useState<Record<string, boolean>>({});
  const [visitorId, setVisitorId] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [subcategory, setSubcategory] = useState(initialSubcategory);
  const [dateFilter, setDateFilter] = useState("any");
  const [priceFilter, setPriceFilter] = useState("any");
  const [modeFilter, setModeFilter] = useState("any");
  const [sortBy, setSortBy] = useState("soonest");
  const [search, setSearch] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadEvents() {
      setLoading(true);
      const { data, error } = await supabase.from("event_submissions")
        .select("id,title,category,subcategory,custom_event_type,venue,locality,starts_at,ticket_price,total_capacity,available_seats,description,image_url,ends_at,event_mode,location_status")
        .eq("status", "approved").gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true });
      if (!active) return;
      if (error) console.error("[events] Approved event lookup failed", { code: error.code });
      setEvents((data ?? []) as EventItem[]);
      setLoading(false);
    }
    void loadEvents();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let id = window.localStorage.getItem("naren_event_visitor_id");
    if (!id) {
      id = window.crypto?.randomUUID?.() ?? ("visitor-" + Date.now() + "-" + Math.random().toString(36).slice(2));
      window.localStorage.setItem("naren_event_visitor_id", id);
    }
    setVisitorId(id);
  }, []);

  useEffect(() => {
    if (!events.length) return;
    let active = true;
    const ids = events.map((event) => event.id);
    const refreshLikes = async () => {
      const { data, error } = await supabase.from("event_likes").select("event_id,visitor_id").in("event_id", ids);
      if (!active || error) return;
      const counts: Record<string, number> = {};
      const mine: Record<string, boolean> = {};
      for (const like of data ?? []) {
        counts[like.event_id] = (counts[like.event_id] ?? 0) + 1;
        if (like.visitor_id === visitorId) mine[like.event_id] = true;
      }
      setLikeCounts(counts);
      setLikedEvents(mine);
    };
    void refreshLikes();
    const channel = supabase.channel("event-likes-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "event_likes" }, () => { void refreshLikes(); })
      .subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
  }, [events, visitorId]);

  async function toggleLike(eventId: string) {
    if (!visitorId) return;
    const alreadyLiked = !!likedEvents[eventId];
    if (alreadyLiked) {
      const { error } = await supabase.from("event_likes").delete().eq("event_id", eventId).eq("visitor_id", visitorId);
      if (error) { console.error("[events] Unlike failed", error); return; }
      setLikedEvents((current) => ({ ...current, [eventId]: false }));
      setLikeCounts((current) => ({ ...current, [eventId]: Math.max(0, (current[eventId] ?? 0) - 1) }));
    } else {
      const { error } = await supabase.from("event_likes").insert({ event_id: eventId, visitor_id: visitorId });
      if (error) { if (error.code !== "23505") console.error("[events] Like failed", error); return; }
      setLikedEvents((current) => ({ ...current, [eventId]: true }));
      setLikeCounts((current) => ({ ...current, [eventId]: (current[eventId] ?? 0) + 1 }));
    }
  }

  const filteredEvents = useMemo(() => {
    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const weekendEnd = new Date(now);
    weekendEnd.setDate(now.getDate() + (6 - now.getDay() + 7) % 7 + 1);
    const result = events.filter((event) => {
      if (category && getEventCategoryKey(event) !== category) return false;
      if (subcategory && event.subcategory !== subcategory) return false;
      if (priceFilter === "free" && Number(event.ticket_price) > 0) return false;
      if (priceFilter === "paid" && Number(event.ticket_price) <= 0) return false;
      if (modeFilter !== "any" && event.event_mode !== modeFilter) return false;
      const date = new Date(event.starts_at);
      if (dateFilter === "today" && (date < now || date >= endOfToday)) return false;
      if (dateFilter === "weekend" && (date < now || date > weekendEnd || ![0, 6].includes(date.getDay()))) return false;
      if (dateFilter === "week" && (date < now || date > new Date(now.getTime() + 7 * 86400000))) return false;
      const text = [event.title, event.description, event.venue, event.locality, event.subcategory, event.custom_event_type].filter(Boolean).join(" ").toLowerCase();
      if (search.trim() && !text.includes(search.trim().toLowerCase())) return false;
      return true;
    });
    result.sort((a, b) => {
      if (sortBy === "price-low") return Number(a.ticket_price) - Number(b.ticket_price);
      if (sortBy === "price-high") return Number(b.ticket_price) - Number(a.ticket_price);
      if (sortBy === "latest") return new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime();
      return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
    });
    return result;
  }, [events, category, subcategory, dateFilter, priceFilter, modeFilter, sortBy, search]);

  function resetFilters() {
    setCategory(""); setSubcategory(""); setDateFilter("any"); setPriceFilter("any");
    setModeFilter("any"); setSortBy("soonest"); setSearch("");
  }

  const activeCount = [category, dateFilter !== "any" ? dateFilter : "", priceFilter !== "any" ? priceFilter : "", modeFilter !== "any" ? modeFilter : ""].filter(Boolean).length;

  function FilterPanel() {
    return <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-extrabold text-[#252525]">Filters</h2>
        <button type="button" onClick={resetFilters} className="text-xs font-bold text-[#A71930] hover:underline">Clear all</button>
      </div>
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Categories</p>
        <div className="space-y-1">
          <button onClick={() => { setCategory(""); setSubcategory(""); }} className={"flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm " + (!category ? "bg-[#F4F1EF] font-bold text-[#A71930]" : "text-slate-700 hover:bg-slate-50")}>All events <span>›</span></button>
          {categories.map((item) => <button key={item.key} onClick={() => { setCategory(item.key); setSubcategory(""); }} className={"flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm " + (category === item.key ? "bg-[#F4F1EF] font-bold text-[#A71930]" : "text-slate-700 hover:bg-slate-50")}>{item.title}<span>›</span></button>)}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">When</p>
        <div className="space-y-1">
          {[["any", "Any date"], ["today", "Today"], ["weekend", "This weekend"], ["week", "Next 7 days"]].map(([value, label]) => <label key={value} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-700 hover:bg-slate-50"><input type="radio" name="event-date" checked={dateFilter === value} onChange={() => setDateFilter(value)} className="accent-[#A71930]" />{label}</label>)}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Ticket price</p>
        <div className="space-y-1">
          {[["any", "Any price"], ["free", "Free events"], ["paid", "Paid events"]].map(([value, label]) => <label key={value} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-700 hover:bg-slate-50"><input type="radio" name="event-price" checked={priceFilter === value} onChange={() => setPriceFilter(value)} className="accent-[#A71930]" />{label}</label>)}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Event format</p>
        <div className="space-y-1">
          {[["any", "All formats"], ["offline", "Offline"], ["online", "Online"], ["hybrid", "Hybrid"]].map(([value, label]) => <label key={value} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-700 hover:bg-slate-50"><input type="radio" name="event-mode" checked={modeFilter === value} onChange={() => setModeFilter(value)} className="accent-[#A71930]" />{label}</label>)}
        </div>
      </div>
    </div>;
  }

  return <main className="min-h-screen bg-[#F4F1EF] text-slate-900">
    <header className="bg-[#A71930] px-4 py-3.5 text-white sm:px-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <Link href="/" className="text-lg font-extrabold tracking-tight sm:text-2xl">NAREN <span className="text-[#F0C5CC]">REALTY</span></Link>
        <div className="flex items-center gap-2 sm:gap-4">
          <Link href="/events/manage" className="text-[11px] font-semibold text-white/90 hover:text-[#F0C5CC] sm:text-sm">Manage Events</Link>
          <Link href="/events/submit" className="rounded-lg bg-[#A71930] px-3 py-2 text-[11px] font-extrabold text-white hover:bg-[#861326] sm:px-4 sm:text-sm">Post Your Event</Link>
          <Link href="/" className="hidden text-sm font-semibold text-[#F0C5CC] sm:block">Home</Link>
        </div>
      </div>
    </header>

    <div className="mx-auto max-w-7xl px-3 py-5 sm:px-6 sm:py-8">
      <div className="mb-5">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#A71930] sm:text-xs">Discover • Connect • Experience</p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <div><h1 className="text-2xl font-black tracking-tight text-[#A71930] sm:text-3xl">Explore Events</h1><p className="mt-1 text-xs text-slate-600 sm:text-sm">Find your next plan, people and experiences.</p></div>
          <div className="hidden w-full max-w-sm sm:block"><label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm"><span className="text-slate-400">⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search events, venues..." className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" /></label></div>
        </div>
      </div>

      <EventCategoryButtons selected={category} onSelect={(next) => { setCategory(next); setSubcategory(""); }} className="mb-5" />

      <div className="mb-4 flex gap-2 sm:hidden">
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5"><span className="text-slate-400">⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search events..." className="w-full min-w-0 bg-transparent text-xs outline-none" /></label>
        <button onClick={() => setMobileFiltersOpen(true)} className="shrink-0 rounded-xl border border-[#E8C5CB] bg-white px-3 py-2 text-xs font-bold text-[#A71930] shadow-sm">☷ Filter{activeCount ? " (" + activeCount + ")" : ""}</button>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="hidden self-start rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-5 lg:block"><FilterPanel /></aside>
        <section aria-live="polite" className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div><h2 className="text-lg font-extrabold text-[#A71930] sm:text-xl">{category ? categories.find((item) => item.key === category)?.title ?? "Events" : "All Events"}</h2><p className="mt-0.5 text-[11px] text-slate-500 sm:text-xs">{loading ? "Finding events..." : filteredEvents.length + " upcoming events"}</p></div>
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] text-slate-600 sm:text-xs"><span>Sort:</span><select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="max-w-[112px] bg-transparent font-bold text-[#A71930] outline-none sm:max-w-none"><option value="soonest">Date: Soonest</option><option value="latest">Date: Latest</option><option value="price-low">Price: Low to High</option><option value="price-high">Price: High to Low</option></select></label>
          </div>
          {subcategory && <div className="mb-3 flex items-center gap-2"><span className="rounded-full bg-[#F4F1EF] px-3 py-1.5 text-xs font-bold text-[#A71930]">{subcategory.replaceAll("_", " ")}</span><button onClick={() => setSubcategory("")} className="text-xs font-semibold text-slate-500 underline">Remove</button></div>}
          {loading ? <div className="grid grid-cols-2 gap-3 sm:gap-4">{[1,2,3,4].map((n) => <div key={n} className="animate-pulse overflow-hidden rounded-xl bg-white"><div className="aspect-[4/3] bg-slate-200"/><div className="space-y-2 p-3"><div className="h-3 w-2/3 rounded bg-slate-200"/><div className="h-3 w-full rounded bg-slate-100"/></div></div>)}</div>
          : filteredEvents.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-12 text-center"><p className="text-base font-bold text-[#A71930]">No events found</p><p className="mt-1 text-xs text-slate-500">Try changing your filters or search.</p><button onClick={resetFilters} className="mt-4 rounded-lg bg-[#A71930] px-4 py-2 text-xs font-bold text-white">Clear filters</button></div>
          : <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">{filteredEvents.map((event) => {
            const date = new Date(event.starts_at);
            const venue = event.event_mode === "online" ? "Online" : event.location_status === "tba" ? "Venue TBA" : [event.venue, event.locality].filter(Boolean).join(", ");
            const type = (event.custom_event_type || event.subcategory || event.category).replaceAll("_", " ");
            return <article key={event.id} className="group min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <Link href={"/events/" + event.id} aria-label={"View " + event.title} className="block overflow-hidden bg-slate-200">
                {event.image_url ? <img src={event.image_url} alt={event.title} className="aspect-[2/3] w-full object-cover transition duration-500 group-hover:scale-[1.03]"/> : <div className="flex aspect-[2/3] items-center justify-center text-xs font-semibold text-slate-500">Event poster</div>}
                <div className="bg-[#171717] px-3 py-2">
                  <p className="text-[11px] font-extrabold tracking-wide text-white sm:text-sm">{date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</p>
                </div>
              </Link>
              <div className="space-y-1.5 bg-white px-2.5 pb-3 pt-3 sm:px-3 sm:pb-3.5">
                <Link href={"/events/" + event.id} className="block">
                  <h3 className="line-clamp-2 min-h-[2.5em] text-xs font-extrabold leading-snug text-[#252525] transition group-hover:text-[#A71930] sm:text-sm">{event.title}</h3>
                </Link>
                <Link href={"/events/" + event.id} className="block">
                  <p className="line-clamp-1 text-[10px] font-medium text-slate-500 sm:text-[11px]">{venue}</p>
                </Link>
                <div className="space-y-1 border-t border-slate-100 pt-2">
                  <Link href={"/events/" + event.id} className="block">
                    <p className="truncate text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-500 sm:text-[10px]">{type}</p>
                  </Link>
                  <Link href={"/events/" + event.id} className="block text-right">
                    <p className="text-xs font-extrabold text-[#A71930] sm:text-sm">{event.ticket_price > 0 ? "₹" + event.ticket_price + " onwards" : "Free"}</p>
                  </Link>
                </div>
              </div>
            </article>;
          })}</div>}
        </section>
      </div>
    </div>

    {mobileFiltersOpen && <div className="fixed inset-0 z-50 bg-black/40 lg:hidden" onClick={() => setMobileFiltersOpen(false)}>
      <section role="dialog" aria-modal="true" aria-label="Event filters" onClick={(e) => e.stopPropagation()} className="absolute inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl">
        <div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-extrabold text-[#A71930]">Filter Events</h2><button onClick={() => setMobileFiltersOpen(false)} aria-label="Close filters" className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-bold">✕</button></div>
        <FilterPanel />
        <button onClick={() => setMobileFiltersOpen(false)} className="mt-6 w-full rounded-xl bg-[#A71930] py-3 text-sm font-extrabold text-white">Show {filteredEvents.length} events</button>
      </section>
    </div>}
  </main>;
}

export default function EventsPage() {
  return <Suspense fallback={<main className="min-h-screen bg-[#F4F1EF] p-6 text-[#A71930]">Loading events...</main>}><EventsContent /></Suspense>;
}
