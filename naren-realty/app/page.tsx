"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import HomeHeader from "./components/HomeHeader";
import DesktopQuickNav from "./components/DesktopQuickNav";
import LocalityAutocomplete from "./components/LocalityAutocomplete";
import { supabase } from "./lib/customers";
import EventCategoryButtons from "./components/EventCategoryButtons";
import { getEventCategoryKey } from "./components/eventCategories";

type CategoryCardItem = { title: string; image: string; href: string };

const propertyCards: CategoryCardItem[] = [
  { title: "Flat Rental", image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=600&q=85", href: "/properties?type=Rental" },
  { title: "Flat Resale", image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=85", href: "/properties?type=Resale" },
  { title: "PG / Hostel", image: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=85", href: "/properties?type=PG" },
  { title: "Homestay / Airbnb", image: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=600&q=85", href: "/properties?type=Airbnb" },
];

const serviceCards: CategoryCardItem[] = [
  { title: "Painting", image: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=600&q=85", href: "/home-services" },
  { title: "Plumbing", image: "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=600&q=85", href: "/home-services" },
  { title: "Electrical", image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=85", href: "/home-services" },
  { title: "Cleaning", image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=85", href: "/home-services" },
];

const wellnessCards: CategoryCardItem[] = [
  { title: "Health", image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=900&q=85", href: "/health-checkup" },
  { title: "Lifestyle", image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=900&q=85", href: "/lifestyle" },
];

const eventCards: CategoryCardItem[] = [
  { title: "Meetups", image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=600&q=85", href: "/events?category=meetups" },
  { title: "Party", image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=600&q=85", href: "/events?category=party" },
  { title: "Cultural Events", image: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=600&q=85", href: "/events?category=cultural" },
  { title: "Community Events", image: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=600&q=85", href: "/events?category=community" },
];

function CategoryCard({ item }: { item: CategoryCardItem }) {
  return (
    <Link
      href={item.href}
      aria-label={item.title}
      className="group relative aspect-[16/9] min-w-0 overflow-hidden rounded-xl bg-slate-200 shadow-sm ring-1 ring-slate-900/5 transition duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A71930] sm:aspect-[3/2]"
      style={{ backgroundImage: `linear-gradient(to top, rgba(8,20,39,.88), rgba(8,20,39,.04) 68%), url("${item.image}")`, backgroundPosition: "center", backgroundSize: "cover" }}
    >
      <span className="absolute inset-x-2 bottom-2 text-center text-xs font-bold leading-tight text-white drop-shadow sm:bottom-3 sm:text-sm">
        {item.title}
      </span>
    </Link>
  );
}

function CategorySection({ title, href, items, id }: { title: string; href: string; items: CategoryCardItem[]; id: string }) {
  return (
    <section id={id} className="rounded-2xl bg-white px-3.5 py-4 shadow-[0_3px_18px_rgba(15,35,65,0.05)] ring-1 ring-slate-100 sm:px-5 sm:py-5">
      <div className="mb-3.5 flex min-h-8 items-center justify-between gap-2 sm:mb-4">
        <h2 className="min-w-0 border-l-[5px] border-[#A71930] pl-2.5 text-[15px] font-extrabold tracking-tight text-[#A71930] sm:text-xl">{title}</h2>
        <Link href={href} className="shrink-0 whitespace-nowrap text-xs font-bold text-[#A71930] hover:text-[#861326] sm:text-sm">View All <span aria-hidden="true">→</span></Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-3">
        {items.map((item) => <CategoryCard key={item.title} item={item} />)}
      </div>
    </section>
  );
}

type HomeEventItem = {
  id: string; title: string; category: string; subcategory: string | null;
  custom_event_type: string | null; venue: string; locality: string | null;
  event_mode: string; location_status: string; starts_at: string;
  ticket_price: number; image_url: string | null;
};

function ComingSoonEventCard() {
  return (
    <Link
      href="/events"
      aria-label="Explore upcoming events"
      className="group min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative flex aspect-[4/5] w-full flex-col items-center justify-center overflow-hidden bg-[#101D24] px-2 text-center text-white">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(15,157,148,0.30),transparent_58%),linear-gradient(145deg,#10252B_0%,#101820_55%,#080D12_100%)]" />
        <div aria-hidden="true" className="absolute inset-x-5 top-7 h-px bg-gradient-to-r from-transparent via-[#C9A96E]/70 to-transparent" />
        <div aria-hidden="true" className="absolute inset-x-8 bottom-10 h-20 rounded-full bg-[#0E8C83]/10 blur-2xl" />
        <div className="relative z-10 mb-2 flex size-9 items-center justify-center rounded-full border border-[#C9A96E]/50 bg-white/5 text-[#D7BD8A]">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.35" className="size-6"><path d="M4 18V9l8-5 8 5v9M3 20h18M8 18v-5h8v5" /><path d="M12 4v-2" /></svg>
        </div>
        <p className="relative z-10 text-[9px] font-semibold uppercase tracking-[0.34em] text-[#D7BD8A] sm:text-[10px]">Naren Realty Presents</p>
        <h3 className="relative z-10 mt-2 text-lg font-black leading-[0.95] tracking-[0.08em] sm:text-xl">EVENTS</h3>
        <div className="relative z-10 my-2 h-px w-10 bg-[#C9A96E]" />
        <p className="relative z-10 text-xs font-bold uppercase tracking-[0.16em] text-white sm:text-sm">Coming Soon</p>
        <p className="relative z-10 mt-2 max-w-[11rem] text-[9px] leading-relaxed text-slate-300 sm:text-[10px]">Something exciting is on its way</p>
        <div aria-hidden="true" className="absolute inset-x-5 bottom-3 h-px bg-gradient-to-r from-transparent via-[#C9A96E]/60 to-transparent" />
        <span className="absolute bottom-5 text-[7px] font-semibold uppercase tracking-[0.3em] text-[#D7BD8A]">Stay Tuned</span>
      </div>
      <div className="space-y-1 bg-white px-2 pb-2.5 pt-2.5 sm:px-2.5 sm:pb-3 sm:pt-2.5">
        <p className="text-xs font-extrabold text-[#252525] sm:text-sm">More events on the way</p>
        <p className="text-[10px] font-medium text-slate-500 sm:text-[11px]">Discover new experiences</p>
        <div className="border-t border-slate-100 pt-2 text-right text-[10px] font-bold text-[#A71930] sm:text-xs">Explore Events →</div>
      </div>
    </Link>
  );
}

function EventsNearMeSection() {
  const [events, setEvents] = useState<HomeEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("");

  useEffect(() => {
    let active = true;
    async function loadEvents() {
      const { data, error } = await supabase.from("event_submissions")
        .select("id,title,category,subcategory,custom_event_type,venue,locality,starts_at,ticket_price,image_url,event_mode,location_status")
        .eq("status", "approved")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(1000);
      if (!active) return;
      if (error) console.error("[home-events] Approved event lookup failed", { code: error.code });
      setEvents((data ?? []) as HomeEventItem[]);
      setLoading(false);
    }
    void loadEvents();
    // Refresh approved upcoming events periodically so new organiser listings
    // replace Coming Soon placeholders without requiring a manual page reload.
    const refreshInterval = window.setInterval(() => { void loadEvents(); }, 60_000);
    return () => {
      active = false;
      window.clearInterval(refreshInterval);
    };
  }, []);

  return (
    <section id="events" className="rounded-2xl bg-white px-3.5 py-4 shadow-[0_3px_18px_rgba(15,35,65,0.05)] ring-1 ring-slate-100 sm:px-5 sm:py-5">
      <div className="mb-3.5 flex min-h-8 items-center justify-between gap-2 sm:mb-4">
        <h2 className="min-w-0 border-l-[5px] border-[#A71930] pl-2.5 text-[15px] font-extrabold tracking-tight text-[#A71930] sm:text-xl">Events Near Me</h2>
        <Link href="/events" className="shrink-0 whitespace-nowrap text-xs font-bold text-[#A71930] hover:text-[#861326] sm:text-sm">View All <span aria-hidden="true">→</span></Link>
      </div>
      <EventCategoryButtons selected={selectedCategory} onSelect={setSelectedCategory} className="mb-4" />
      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {[1, 2, 3, 4].map((item) => <div key={item} className="animate-pulse overflow-hidden rounded-xl bg-slate-100"><div className="aspect-[4/5] bg-slate-200" /><div className="h-16 bg-slate-100" /></div>)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-5">
          {Array.from({ length: 4 }, (_, index) => {
            const matchingEvents = selectedCategory ? events.filter((item) => getEventCategoryKey(item) === selectedCategory) : events;
            const event = matchingEvents[index];
            if (!event) return <ComingSoonEventCard key={"coming-soon-" + index} />;
            const date = new Date(event.starts_at);
            const venue = event.event_mode === "online" ? "Online" : event.location_status === "tba" ? "Venue TBA" : [event.venue, event.locality].filter(Boolean).join(", ");
            const type = (event.custom_event_type || event.subcategory || event.category).replaceAll("_", " ");
            return (
              <article key={event.id} className="group min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <Link href={"/events/" + event.id} aria-label={"View " + event.title} className="block overflow-hidden bg-slate-200">
                  {event.image_url ? <img src={event.image_url} alt={event.title} className="aspect-[4/5] w-full object-cover transition duration-500 group-hover:scale-[1.03]" /> : <div className="flex aspect-[4/5] items-center justify-center text-xs font-semibold text-slate-500">Event poster</div>}
                  <div className="bg-[#171717] px-3 py-2">
                    <p className="text-[10px] font-extrabold tracking-wide text-white sm:text-xs">{date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</p>
                  </div>
                </Link>
                <div className="space-y-1 bg-white px-2 pb-2.5 pt-2.5 sm:px-2.5 sm:pb-3 sm:pt-2.5">
                  <Link href={"/events/" + event.id} className="block">
                    <h3 className="line-clamp-2 min-h-[2.5em] text-xs font-extrabold leading-snug text-[#252525] transition group-hover:text-[#A71930] sm:text-sm">{event.title}</h3>
                  </Link>
                  <Link href={"/events/" + event.id} className="block">
                    <p className="line-clamp-1 text-[10px] font-medium text-slate-500 sm:text-[11px]">{venue}</p>
                  </Link>
                  <div className="space-y-1 border-t border-slate-100 pt-2">
                    <p className="truncate text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-500 sm:text-[10px]">{type}</p>
                    <p className="text-right text-xs font-extrabold text-[#A71930] sm:text-sm">{event.ticket_price > 0 ? "₹" + event.ticket_price + " onwards" : "Free"}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function Home() {
  const router = useRouter();
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code");
    if (!code) return;

    let active = true;
    void supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (!active) return;
      window.history.replaceState({}, document.title, window.location.pathname);
      router.replace(error ? "/account/reset-password?auth_error=code_exchange" : "/account/reset-password?recovery=1");
    }).catch(() => {
      if (active) router.replace("/account/reset-password?auth_error=code_exchange");
    });

    return () => {
      active = false;
    };
  }, [router]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchText.trim();
    router.push(query ? `/properties?locality=${encodeURIComponent(query)}` : "/properties");
  }

  return (
    <main className="min-h-screen bg-[#F4F1EF] text-slate-900">
      <HomeHeader />

      <section className="bg-[#A71930] px-3.5 pb-4 pt-0 sm:px-6 sm:pb-6 sm:pt-1">
        <form onSubmit={submitSearch} className="mx-auto flex max-w-7xl items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lg sm:rounded-xl sm:p-2">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-2 size-5 shrink-0 text-[#A71930] sm:size-6"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></svg>
          <LocalityAutocomplete
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search location or property..."
            aria-label="Search location or property"
            className="min-w-0 flex-1 border-0 bg-transparent px-1 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-500 sm:py-3 sm:text-base"
          />
          <button type="submit" aria-label="Search properties" className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#A71930] text-[#A71930] transition hover:bg-[#861326] sm:size-11">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" className="size-5"><path d="M4 6h16M7 12h10m-7 6h4" /><circle cx="8" cy="6" r="2" fill="currentColor" /><circle cx="15" cy="12" r="2" fill="currentColor" /><circle cx="12" cy="18" r="2" fill="currentColor" /></svg>
          </button>
        </form>
        <div className="mx-auto max-w-7xl"><DesktopQuickNav /></div>
      </section>

      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-3 py-4 sm:gap-5 sm:px-6 sm:py-6">
        <CategorySection id="properties" title="Properties" href="/properties" items={propertyCards} />
        <CategorySection id="home-services" title="Home Services" href="/home-services" items={serviceCards} />
        <EventsNearMeSection />
        <CategorySection id="health-lifestyle" title="Health & Lifestyle" href="/health-checkup" items={wellnessCards} />

        <section className="flex items-center justify-between gap-3 overflow-hidden rounded-2xl bg-[#A71930] px-4 py-4 text-white shadow-md sm:px-6 sm:py-5">
          <div className="min-w-0">
            <h2 className="text-xl font-extrabold sm:text-2xl"><span className="text-white/80">Refer</span> &amp; Earn</h2>
            <p className="mt-1 text-xs leading-5 text-slate-200 sm:text-sm">Tenant referral ₹1,000 · Owner referral ₹2,000</p>
            <Link href="/account/referrals" className="mt-3 inline-flex min-h-10 items-center justify-center rounded-lg border border-white bg-white px-5 text-xs font-extrabold text-[#A71930] shadow-sm transition-colors hover:bg-[#F4F1EF] hover:text-[#861326] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:text-sm">Refer Now →</Link>
          </div>
          <div aria-hidden="true" className="flex size-16 shrink-0 items-center justify-center rounded-full bg-white/10 text-3xl sm:size-24 sm:text-5xl">🎁</div>
        </section>
      </div>

      <footer id="contact" className="bg-[#A71930] px-4 pb-6 pt-8 text-white sm:px-6 sm:pb-7 sm:pt-10">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 gap-x-6 gap-y-8 border-b border-white/15 pb-7 sm:grid-cols-2 sm:gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div className="col-span-2 sm:col-span-2 lg:col-span-1">
              <Link href="/" className="inline-block text-xl font-extrabold tracking-wide">NAREN <span className="text-white/80">REALTY</span></Link>
              <p className="mt-2 text-sm text-slate-300">Pune, Maharashtra</p>
              <p className="mt-2 max-w-xs text-sm leading-6 text-slate-400">For property and service enquiries, connect with our team.</p>
            </div>
            <nav aria-label="Explore" className="flex flex-col items-start gap-3">
              <h3 className="mb-1 text-sm font-bold text-white">Explore</h3>
              <Link href="/properties" className="text-sm text-slate-300 hover:text-amber-300">Properties</Link>
              <Link href="/home-services" className="text-sm text-slate-300 hover:text-amber-300">Home Services</Link>
              <Link href="/events" className="text-sm text-slate-300 hover:text-amber-300">Events</Link>
              <Link href="/health-checkup" className="text-sm text-slate-300 hover:text-amber-300">Health Check-up</Link>
            </nav>
            <nav aria-label="Account and listings" className="flex flex-col items-start gap-3">
              <h3 className="mb-1 text-sm font-bold text-white">Account & Listings</h3>
              <Link href="/list-property" className="text-sm text-slate-300 hover:text-amber-300">Post Your Property</Link>
              <Link href="/account" className="text-sm text-slate-300 hover:text-amber-300">My Account</Link>
              <Link href="/admin/login" className="text-sm text-slate-300 hover:text-amber-300">Admin Login</Link>
            </nav>
            <nav aria-label="Information" className="col-span-2 flex flex-col items-start gap-3 sm:col-span-1">
              <h3 className="mb-1 text-sm font-bold text-white">Information</h3>
              <Link href="/legal-policies" className="text-sm text-slate-300 hover:text-amber-300">Legal & Policies</Link>
            </nav>
          </div>
          <div className="flex flex-col gap-2 pt-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 NAREN REALTY. All rights reserved.</p>
            <p>Pune, Maharashtra, India</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
