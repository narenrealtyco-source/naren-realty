"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type CatalogItem = {
  id: string;
  slug: string;
  item_type: "test" | "package";
  title: string;
  category: string;
  description: string | null;
  price: number | null;
  mrp: number | null;
  is_active: boolean;
  provider_verified: boolean;
  report_tat: string | null;
  sample_type: string | null;
};

const categoryTiles = [
  { title: "Full body checkup", subtitle: "Preventive health packages", category: "Full Body", icon: "✚", image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=700&q=85" },
  { title: "Men's health", subtitle: "Screening options for men", category: "Men", icon: "◉", image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=700&q=85" },
  { title: "Women's health", subtitle: "Wellness and screening", category: "Women", icon: "♡", image: "https://images.unsplash.com/photo-1559757175-0eb30cd8c063?auto=format&fit=crop&w=700&q=85" },
  { title: "Senior citizens", subtitle: "Healthy ageing checkups", category: "Senior Citizens", icon: "⌂", image: "https://images.unsplash.com/photo-1576765608866-5b510464521b?auto=format&fit=crop&w=700&q=85" },
  { title: "Diabetes care", subtitle: "Sugar and HbA1c tests", category: "Diabetes", icon: "⌁", image: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=700&q=85" },
  { title: "Thyroid & hormones", subtitle: "Thyroid profile tests", category: "Hormones", icon: "⌘", image: "https://images.unsplash.com/photo-1582719471384-894fbb16e074?auto=format&fit=crop&w=700&q=85" },
];

const imageFor = (item: CatalogItem) => {
  const key = (item.category + " " + item.title).toLowerCase();
  if (key.includes("women")) return "https://images.unsplash.com/photo-1559757175-0eb30cd8c063?auto=format&fit=crop&w=700&q=85";
  if (key.includes("senior")) return "https://images.unsplash.com/photo-1576765608866-5b510464521b?auto=format&fit=crop&w=700&q=85";
  if (key.includes("blood") || key.includes("cbc")) return "https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=700&q=85";
  if (key.includes("thyroid")) return "https://images.unsplash.com/photo-1582719471384-894fbb16e074?auto=format&fit=crop&w=700&q=85";
  if (key.includes("vitamin")) return "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=700&q=85";
  return "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=700&q=85";
};

function Brand() {
  return (
    <Link href="/health-checkup" aria-label="MFIT Healthcare home" className="flex shrink-0 items-center gap-2.5">
      <span className="grid size-11 place-items-center rounded-md bg-[#08b8bb] text-3xl font-black leading-none text-white">M</span>
      <span className="leading-none">
        <span className="block text-[25px] font-extrabold tracking-[-0.07em] text-[#15191b]">FIT</span>
        <span className="mt-1 block text-[12px] font-semibold tracking-[0.01em] text-[#222729]">Healthcare</span>
      </span>
    </Link>
  );
}

function SectionHeading({ eyebrow, title, href, linkLabel = "View all" }: { eyebrow: string; title: string; href: string; linkLabel?: string }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3">
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#078b8d]">{eyebrow}</p>
        <h2 className="mt-1 text-xl font-extrabold tracking-tight text-[#172326] sm:text-2xl">{title}</h2>
      </div>
      <Link href={href} className="shrink-0 text-xs font-extrabold text-[#078b8d] sm:text-sm">{linkLabel} <span aria-hidden="true">→</span></Link>
    </div>
  );
}

function ProductCard({ item, onAddToCart }: { item: CatalogItem; onAddToCart: (slug:string)=>void }) {
  const href = item.item_type === "test"
    ? `/health-checkup/test/${encodeURIComponent(item.slug)}`
    : `/health-checkup/package/${encodeURIComponent(item.slug)}`;
  const verifiedPrice = item.is_active && item.provider_verified && item.price !== null;
  return (
    <article className="group min-w-0 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_5px_20px_rgba(15,40,55,.055)] transition hover:-translate-y-1 hover:shadow-lg">
      <Link href={href} className="block">
        <div className="relative h-32 overflow-hidden bg-[#eaf7f6] sm:h-40">
          <img src={imageFor(item)} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wide text-[#087f82]">{item.item_type === "test" ? "Lab test" : "Health package"}</span>
        </div>
        <div className="p-3 sm:p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{item.category}</p>
          <h3 className="mt-1 min-h-10 text-sm font-extrabold leading-snug text-[#172326] sm:text-base">{item.title}</h3>
          <p className="mt-2 min-h-8 text-[11px] leading-4 text-slate-500 sm:text-xs">{item.description || "View package details, preparation and booking information."}</p>
          <div className="mt-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-[9px] text-slate-400">MFIT price</p>
              <p className="text-sm font-extrabold text-[#172326]">{verifiedPrice ? "₹" + Number(item.price).toLocaleString("en-IN") : "On confirmation"}</p>
            </div>
            <span className="rounded-lg bg-[#e9f8f6] px-3 py-2 text-[10px] font-extrabold text-[#087f82]">Details</span>
          </div>
        </div>
      </Link>
      <div className="grid grid-cols-2 gap-2 px-3 pb-3 sm:px-4 sm:pb-4">
        <button type="button" onClick={() => onAddToCart(item.slug)} className="min-h-10 rounded-xl border border-[#08aeb1] px-2 text-[10px] font-extrabold text-[#078b8d] transition hover:bg-[#e9f8f6] sm:text-xs">ADD TO CART</button>
        <Link href={`/health-checkup/checkout?item=${encodeURIComponent(item.slug)}`} className="flex min-h-10 items-center justify-center rounded-xl bg-[#08aeb1] px-2 text-[10px] font-extrabold text-white transition hover:bg-[#078b8d] sm:text-xs">BOOK NOW</Link>
      </div>
    </article>
  );
}

export default function HealthStoreHome() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cartCount,setCartCount] = useState(0);

  useEffect(() => {
    fetch("/api/health-catalog", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load MFIT catalogue.");
        setItems((data.items || []).filter((item: CatalogItem) => item.is_active));
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load catalogue."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { const syncCart=()=>{ try { const value=JSON.parse(window.localStorage.getItem("mfit-health-cart")||"[]"); setCartCount(Array.isArray(value)?value.length:0); } catch { setCartCount(0); } }; syncCart(); window.addEventListener("mfit-cart-updated",syncCart); return ()=>window.removeEventListener("mfit-cart-updated",syncCart); }, []);

  const addToCart=(slug:string)=>{ try { const value=JSON.parse(window.localStorage.getItem("mfit-health-cart")||"[]"); const current=Array.isArray(value)?value.filter((x):x is string=>typeof x==="string"):[]; if(!current.includes(slug)) current.push(slug); window.localStorage.setItem("mfit-health-cart",JSON.stringify(current)); window.dispatchEvent(new Event("mfit-cart-updated")); } catch { window.localStorage.setItem("mfit-health-cart",JSON.stringify([slug])); window.dispatchEvent(new Event("mfit-cart-updated")); } };

  const packages = useMemo(() => items.filter((item) => item.item_type === "package"), [items]);
  const tests = useMemo(() => items.filter((item) => item.item_type === "test"), [items]);
  const popularPackages = packages.slice(0, 6);
  const popularTests = tests.slice(0, 6);
  const searchMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter((item) => (item.title + " " + item.category + " " + (item.description || "")).toLowerCase().includes(q)).slice(0, 5) : [];
  }, [items, query]);

  return (
    <main id="top" className="min-h-screen bg-[#f6f9fa] pb-24 text-[#172326]">
      <div className="hidden bg-[#123a40] px-4 py-2 text-center text-[11px] font-semibold tracking-wide text-white sm:block">
        MFIT Healthcare · Diagnostic tests and home sample collection where available
      </div>
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/95 shadow-[0_2px_12px_rgba(15,40,55,.035)] backdrop-blur">
        <div className="mx-auto flex min-h-[76px] max-w-7xl items-center gap-4 px-4 sm:px-6 lg:gap-8">
          <Brand />
          <div className="hidden min-w-0 flex-1 md:block">
            <label className="flex h-12 items-center gap-3 rounded-lg border border-slate-200 bg-[#f8fafb] px-4 focus-within:border-[#08aeb1] focus-within:ring-2 focus-within:ring-[#08b8bb]/15">
              <span className="text-xl text-slate-500">⌕</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && query.trim()) window.location.href = `/health-checkup/search?q=${encodeURIComponent(query.trim())}`; }} placeholder="Search for tests, packages and health concerns" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
              <button type="button" onClick={() => query.trim() && (window.location.href = `/health-checkup/search?q=${encodeURIComponent(query.trim())}`)} className="rounded-md bg-[#08aeb1] px-4 py-2 text-xs font-extrabold text-white">Search</button>
            </label>
            {searchMatches.length > 0 && <div className="absolute mt-1 w-[min(560px,48vw)] rounded-xl border border-slate-100 bg-white p-2 shadow-xl">{searchMatches.map((item) => <Link key={item.slug} href={item.item_type === "test" ? `/health-checkup/test/${encodeURIComponent(item.slug)}` : `/health-checkup/package/${encodeURIComponent(item.slug)}`} className="block rounded-lg px-3 py-2 text-sm hover:bg-[#eff9f8]">{item.title}<span className="ml-2 text-[10px] font-bold uppercase text-slate-400">{item.item_type}</span></Link>)}</div>}
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-4">
            <Link href="/health-checkup/my-orders" className="hidden text-xs font-bold text-slate-600 hover:text-[#078b8d] sm:block">My Orders</Link>
            <Link href="/account" className="hidden text-xs font-bold text-slate-600 hover:text-[#078b8d] sm:block">Login / Sign up</Link>
            <Link href="/health-checkup/cart" className="flex items-center gap-2 rounded-lg border border-[#b9dedd] px-3 py-2.5 text-xs font-extrabold text-[#087f82]"><span className="text-base">▣</span><span className="hidden sm:inline">Cart</span><span className="grid min-w-5 place-items-center rounded-full bg-[#078b8d] px-1.5 py-0.5 text-[10px] text-white">{cartCount}</span></Link>
          </div>
        </div>
        <div className="border-t border-slate-100 md:hidden">
          <label className="mx-4 my-3 flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-[#f8fafb] px-3">
            <span className="text-lg text-slate-500">⌕</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && query.trim()) window.location.href = `/health-checkup/search?q=${encodeURIComponent(query.trim())}`; }} placeholder="Search tests and packages" className="w-full bg-transparent text-xs outline-none" />
          </label>
        </div>
        <nav aria-label="Health categories" className="hidden border-t border-slate-100 md:block">
          <div className="mx-auto flex max-w-7xl items-center gap-7 overflow-x-auto px-6 py-3 text-xs font-bold text-slate-600">
            <Link href="/health-checkup/packages">Health Packages</Link>
            <Link href="/health-checkup/tests">Lab Tests</Link>
            <Link href="/health-checkup/collections/full-body">Full Body</Link>
            <Link href="/health-checkup/collections/womens-health">Women's Health</Link>
            <Link href="/health-checkup/collections/mens-health">Men's Health</Link>
            <Link href="/health-checkup/scans">Scans & Imaging</Link>
            <Link href="/health-checkup/my-orders">Track Order</Link>
          </div>
        </nav>
      </header>

      <section className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 sm:pt-8">
        <div className="grid overflow-hidden rounded-[26px] bg-gradient-to-r from-[#064f62] via-[#087f8c] to-[#5bc6c6] shadow-[0_14px_35px_rgba(7,89,113,.16)] md:grid-cols-[1.05fr_.95fr]">
          <div className="flex flex-col justify-center px-5 py-8 text-white sm:px-9 sm:py-12">
            <p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-[#baf4ee] sm:text-xs">MFIT Healthcare · Your health, in focus</p>
            <h1 className="mt-3 max-w-xl text-[30px] font-extrabold leading-[1.08] tracking-tight sm:text-4xl lg:text-5xl">Book health tests with care and convenience.</h1>
            <p className="mt-4 max-w-lg text-sm leading-6 text-white/85 sm:text-base">Explore diagnostic tests and preventive health packages, choose your preferred collection time and track your booking online.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/health-checkup/packages" className="rounded-lg bg-white px-5 py-3 text-xs font-extrabold text-[#075c68] shadow-sm sm:text-sm">Explore packages <span className="ml-2">→</span></Link>
              <Link href="/health-checkup/tests" className="rounded-lg border border-white/50 px-5 py-3 text-xs font-extrabold text-white sm:text-sm">Browse lab tests</Link>
            </div>
          </div>
          <div className="relative min-h-[190px] overflow-hidden md:min-h-[360px]">
            <img src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1100&q=85" alt="Healthcare professional" className="absolute inset-0 h-full w-full object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#087f8c]/55 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 rounded-xl bg-white/95 px-4 py-3 shadow-lg sm:bottom-7 sm:left-7"><p className="text-[9px] font-bold uppercase tracking-widest text-[#078b8d]">MFIT Healthcare</p><p className="mt-1 text-sm font-extrabold text-[#172326]">Care that comes closer</p></div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-8 max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm sm:grid-cols-3 sm:gap-4 sm:p-5">
          <div className="flex items-center gap-2 sm:gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#e9f8f6] text-lg text-[#078b8d]">⌂</span><span className="text-[10px] font-bold leading-4 text-slate-700 sm:text-xs">Home collection where available</span></div>
          <div className="flex items-center gap-2 sm:gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#edf5ff] text-lg text-[#2476bd]">✓</span><span className="text-[10px] font-bold leading-4 text-slate-700 sm:text-xs">Laboratory verification before booking</span></div>
          <div className="flex items-center gap-2 sm:gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#fff4e9] text-lg text-[#b66a2a]">▤</span><span className="text-[10px] font-bold leading-4 text-slate-700 sm:text-xs">Digital report access</span></div>
        </div>
      </section>

      <section className="mx-auto mt-10 max-w-7xl px-4 sm:px-6">
        <SectionHeading eyebrow="Browse by health goal" title="Explore health categories" href="/health-checkup/packages" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {categoryTiles.map((tile) => <Link key={tile.category} href={`/health-checkup/packages?category=${encodeURIComponent(tile.category)}`} className="group overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
            <div className="relative h-28 overflow-hidden sm:h-32"><img src={tile.image} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /><span className="absolute bottom-2 left-2 grid size-8 place-items-center rounded-full bg-white/95 text-lg font-bold text-[#078b8d]">{tile.icon}</span></div>
            <div className="p-3"><h3 className="text-xs font-extrabold leading-snug sm:text-sm">{tile.title}</h3><p className="mt-1 text-[10px] leading-4 text-slate-500 sm:text-xs">{tile.subtitle}</p></div>
          </Link>)}
        </div>
      </section>

      <section className="mx-auto mt-10 max-w-7xl px-4 sm:px-6">
        <SectionHeading eyebrow="Popular choices" title="Most booked health packages" href="/health-checkup/packages" />
        {loading ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{[1,2,3,4].map((x) => <div key={x} className="h-64 animate-pulse rounded-2xl bg-white" />)}</div>
          : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{popularPackages.map((item) => <ProductCard key={item.slug} item={item} onAddToCart={addToCart} />)}</div>}
        {!loading && popularPackages.length === 0 && <p className="rounded-xl bg-white p-5 text-sm text-slate-500">MFIT packages are being prepared. Please contact our team for availability.</p>}
      </section>

      <section className="mx-auto mt-10 max-w-7xl px-4 sm:px-6">
        <SectionHeading eyebrow="Individual diagnostics" title="Popular lab tests" href="/health-checkup/tests" />
        {loading ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{[1,2,3,4].map((x) => <div key={x} className="h-64 animate-pulse rounded-2xl bg-white" />)}</div>
          : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{popularTests.map((item) => <ProductCard key={item.slug} item={item} onAddToCart={addToCart} />)}</div>}
        {!loading && popularTests.length === 0 && <p className="rounded-xl bg-white p-5 text-sm text-slate-500">Individual tests will appear here when they are activated in the MFIT catalogue.</p>}
      </section>

      <section className="mx-auto mt-10 max-w-7xl px-4 sm:px-6">
        <SectionHeading eyebrow="Simple booking journey" title="How MFIT home collection works" href="/health-checkup/checkout" linkLabel="Start booking" />
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            ["01", "Choose tests", "Browse verified packages and individual lab tests."],
            ["02", "Add patient details", "Tell us who the booking is for and where to collect."],
            ["03", "Select a preferred slot", "Choose a date and time; MFIT confirms local availability."],
            ["04", "Track your booking", "Follow collection and report updates online."],
          ].map(([number, title, description]) => <article key={number} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5"><span className="text-2xl font-black text-[#08aeb1]">{number}</span><h3 className="mt-3 text-sm font-extrabold">{title}</h3><p className="mt-2 text-xs leading-5 text-slate-500">{description}</p></article>)}
        </div>
      </section>

      <section className="mx-auto mt-10 max-w-7xl px-4 sm:px-6">
        <div className="grid gap-4 overflow-hidden rounded-2xl bg-[#e8f8f6] p-5 sm:grid-cols-[1.2fr_.8fr] sm:items-center sm:p-8">
          <div><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#078b8d]">Need a little help?</p><h2 className="mt-2 text-xl font-extrabold sm:text-2xl">Have a prescription or a question?</h2><p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">Our MFIT Healthcare team can help you understand available tests, packages and collection options.</p><Link href="/health-checkup/my-orders" className="mt-4 inline-flex rounded-lg bg-[#087f82] px-5 py-3 text-xs font-extrabold text-white">Track an existing request</Link></div>
          <div className="relative min-h-36 overflow-hidden rounded-xl"><img src="https://images.unsplash.com/photo-1584982751601-97dcc096659c?auto=format&fit=crop&w=900&q=85" alt="Home sample collection" className="absolute inset-0 h-full w-full object-cover" /></div>
        </div>
      </section>

      <section className="mx-auto mt-10 max-w-7xl px-4 sm:px-6">
        <div className="rounded-2xl bg-[#12343a] p-6 text-white sm:p-8">
          <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#8ee3dc]">MFIT Healthcare</p>
          <h2 className="mt-2 text-xl font-extrabold sm:text-2xl">Care that feels closer to home.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">Explore diagnostics, request home collection where available and access your reports through a secure online journey.</p>
          <p className="mt-4 text-[11px] text-white/55">Operated by MFIT HEALTHCARE PRIVATE LIMITED</p>
        </div>
      </section>

      <footer className="mt-10 bg-[#172326] px-5 py-9 text-white sm:px-8 sm:py-12">
        <div className="mx-auto grid max-w-7xl gap-8 sm:grid-cols-[1.4fr_1fr_1fr]">
          <div><Brand /><p className="mt-4 max-w-sm text-xs leading-5 text-white/65">MFIT Healthcare helps customers explore diagnostic tests, health packages and available home collection services.</p><p className="mt-3 text-[10px] font-semibold text-white/50">Operated by MFIT HEALTHCARE PRIVATE LIMITED</p></div>
          <div><h3 className="text-sm font-extrabold">Explore</h3><div className="mt-3 grid gap-2 text-xs text-white/70"><Link href="/health-checkup/packages">Health packages</Link><Link href="/health-checkup/tests">Individual lab tests</Link><Link href="/health-checkup/scans">Scans & imaging</Link></div></div>
          <div><h3 className="text-sm font-extrabold">Customer support</h3><div className="mt-3 grid gap-2 text-xs text-white/70"><Link href="/health-checkup/my-orders">Track booking</Link><Link href="/privacy-policy">Privacy policy</Link><Link href="/customer-terms">Terms & conditions</Link></div></div>
        </div>
        <div className="mx-auto mt-8 max-w-7xl border-t border-white/15 pt-5 text-[10px] leading-5 text-white/45">© 2026 MFIT Healthcare. All rights reserved. Test information is not a substitute for medical advice, diagnosis or treatment. Service availability, collection slots and report timelines are confirmed during booking.</div>
      </footer>

      <nav aria-label="Health navigation" className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-5px_22px_rgba(15,40,55,.08)] backdrop-blur md:hidden">
        <div className="mx-auto grid h-[64px] max-w-3xl grid-cols-4">
          <Link href="/health-checkup" className="flex flex-col items-center justify-center gap-1 font-extrabold text-[#078b8d]"><span className="text-xl">⌂</span><span className="text-[10px]">Home</span></Link>
          <Link href="/health-checkup/tests" className="flex flex-col items-center justify-center gap-1 text-slate-600"><span className="text-xl">⚗</span><span className="text-[10px]">Lab Tests</span></Link>
          <Link href="/health-checkup/scans" className="flex flex-col items-center justify-center gap-1 text-slate-600"><span className="text-xl">▣</span><span className="text-[10px]">Scans</span></Link>
          <Link href="/health-checkup/my-orders" className="flex flex-col items-center justify-center gap-1 text-slate-600"><span className="text-xl">▤</span><span className="text-[10px]">My Orders</span></Link>
        </div>
      </nav>
      {error && <p role="status" className="sr-only">{error}</p>}
    </main>
  );
}
