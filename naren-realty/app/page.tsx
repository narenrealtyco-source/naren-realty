"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import HomeHeader from "./components/HomeHeader";
import PropertyCard from "./components/PropertyCard";
import { loadApprovedProperties } from "./properties/actions";
import { visitRequestsReady } from "./properties/visit-actions";
import type { PropertyListing } from "./lib/properties";
import { matchesPropertyLocation } from "./lib/property-search";
import WhyChoose from "./components/WhyChoose";
import DesktopQuickNav from "./components/DesktopQuickNav";

const categories = [{ label: "All Properties", type: "All" }, { label: "Flat Rental", type: "Rental" }, { label: "Flat Resale", type: "Resale" }, { label: "PG / Hostel", type: "PG" }, { label: "Airbnb", type: "Airbnb" }] as const;

export default function Home() {
  const [category, setCategory] = useState("All");
  const [location, setLocation] = useState("");
  const [search, setSearch] = useState(false);
  const [properties, setProperties] = useState<PropertyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [visitsReady, setVisitsReady] = useState(false);
  useEffect(() => {
    let active = true;
    loadApprovedProperties().then((items) => { if (active) setProperties(items); })
      .catch(() => { if (active) setLoadError("Properties could not be loaded. Please try again."); })
      .finally(() => { if (active) setLoading(false); });
    visitRequestsReady().then((ready) => { if (active) setVisitsReady(ready); }).catch(() => { if (active) setVisitsReady(false); });
    return () => { active = false; };
  }, []);
  const filtered = properties.filter((property) => {
    const categoryMatch = category === "All" || property.type === category;
    const locationMatch = matchesPropertyLocation(property, location);
    return categoryMatch && locationMatch;
  });

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <HomeHeader />

      <section id="home" className="bg-[#10243A] px-4 pb-10 pt-8 text-white sm:px-6 sm:pb-24 sm:pt-16">
        <div className="mx-auto max-w-7xl">
          <h2 className="max-w-3xl text-3xl font-bold leading-tight sm:text-4xl md:text-6xl">
            Find a place that feels like <span className="text-amber-400">home.</span>
          </h2>
          <p className="mt-3 max-w-xl text-base text-slate-300 sm:mt-6 sm:text-lg">
            Discover flats, resale properties, PG accommodation and short stays across Pune.
          </p>

          <div className="mt-5 flex flex-wrap gap-2" aria-label="Property purpose">
            {[{ label: "All", type: "All" }, { label: "Buy", type: "Resale" }, { label: "Rent", type: "Rental" }].map((item) => <button key={item.type} type="button" onClick={() => setCategory(item.type)} aria-pressed={category === item.type} className={`min-h-11 rounded-full border px-5 text-sm font-bold ${category === item.type ? "border-amber-400 bg-amber-400 text-slate-950" : "border-white/40 text-white"}`}>{item.label}</button>)}
          </div>
          <div className="mt-6 flex max-w-4xl flex-col gap-3 rounded-2xl bg-white p-3 shadow-2xl sm:mt-10 sm:p-4 md:flex-row">
            <label className="sr-only" htmlFor="homepage-category">Property category</label>
            <select id="homepage-category" value={category} onChange={(event) => setCategory(event.target.value)} className="min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-3 text-slate-900">
              {categories.map((item) => <option key={item.type} value={item.type}>{item.label}</option>)}
            </select>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Enter locality or landmark..."
              aria-label="Locality or landmark"
              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-4 py-4 text-slate-900 outline-none focus:border-amber-500"
            />
            <button
              onClick={() => {
                setSearch(true);
                document.getElementById("properties")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="rounded-lg bg-amber-400 px-8 py-4 font-bold text-slate-950 hover:bg-amber-300"
            >
              Search Properties
            </button>
          </div>
          <DesktopQuickNav />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6" aria-label="Owner and referral information">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl bg-[#10243A] p-5 text-white"><h2 className="text-lg font-bold">Have a property to list?</h2><p className="mt-1 text-sm text-slate-300">Share your property for review by the Naren Realty team.</p><Link href="/list-property" className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-amber-400 px-4 text-sm font-bold text-slate-950">Post Your Property</Link></div>
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3 rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-50 to-amber-100 p-5 lg:flex lg:gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-[#10243A] text-amber-400"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-8"><path d="M3 9h18v4H3zM12 9v12M5 13v8h14v-8M12 9c-2 0-4-1-4-3a2 2 0 0 1 4 0c0 2 0 3 0 3Zm0 0c2 0 4-1 4-3a2 2 0 0 0-4 0" /></svg></span>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-extrabold text-[#10243A]">Refer &amp; Earn</h2>
              <p className="mt-1 text-sm font-bold text-[#10243A]">Tenant Referral – <span className="text-amber-700">₹1,000</span></p>
              <p className="text-sm font-bold text-[#10243A]">Owner Referral – <span className="text-amber-700">₹2,000</span></p>
              <p className="mt-2 rounded-lg bg-[#10243A] px-3 py-2 text-xs font-extrabold text-amber-300">OFFER VALID TILL 31 DECEMBER 2026</p>
              <p className="mt-1 text-xs font-semibold text-slate-700">Terms &amp; Conditions Apply.</p>
            </div>
            <Link href="/account/referrals" className="col-start-2 inline-flex min-h-11 shrink-0 items-center justify-self-start rounded-lg bg-[#10243A] px-4 text-sm font-bold text-amber-400 hover:bg-[#1b3a5a]">Refer Now</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-14">
        <div className="mb-4 sm:mb-8">
          <p className="font-semibold tracking-widest text-amber-600">EXPLORE</p>
          <h2 className="mt-2 text-3xl font-bold">What are you looking for?</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {[
            ["🏠", "Flat Rental", "Find your next home"],
            ["🏢", "Flat Resale", "Buy your dream home"],
            ["🛏️", "PG / Hostel", "Comfortable accommodation"],
            ["🔑", "Airbnb", "Short stay options"],
          ].map(([icon, name, description]) => (
            <button
              key={name}
              onClick={() => {
                setCategory(categories.find((item) => item.label === name)?.type ?? "All");
                setSearch(false);
                document.getElementById("properties")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-1 hover:border-amber-400 hover:shadow-lg sm:p-7"
            >
              <span className="text-2xl sm:text-4xl">{icon}</span>
              <h3 className="mt-2 text-sm font-bold sm:mt-5 sm:text-xl">{name}</h3>
              <p className="mt-1 text-xs text-slate-500 sm:mt-2 sm:text-sm">{description}</p>
            </button>
          ))}
        </div>
      </section>

      <section id="properties" className="bg-slate-50 px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <p className="font-semibold tracking-widest text-amber-600">PROPERTY COLLECTION</p>
          <h2 className="mt-2 text-3xl font-bold">Explore properties in Pune</h2>

          <div className="mt-7 flex flex-wrap gap-2">
            {categories.map((item) => (
              <button
                key={item.type}
                onClick={() => setCategory(item.type)}
                aria-pressed={category === item.type}
                className={`rounded-full px-5 py-3 text-sm font-semibold ${
                  category === item.type
                    ? "bg-[#10243A] text-white"
                    : "border border-slate-300 bg-white text-slate-700"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {search && location && (
            <p className="mt-5 text-sm text-slate-600">Showing matching properties for: {location}</p>
          )}

          {loading && <p role="status" className="mt-8 text-slate-600">Loading properties...</p>}
          {loadError && <p role="alert" className="mt-8 text-rose-700">{loadError}</p>}
          {!loading && !loadError && (filtered.length ? <div className="mt-8 grid gap-6 md:grid-cols-2">{filtered.map((property) => <PropertyCard key={property.id} listing={property} listings={properties} visitsReady={visitsReady} />)}</div> : <p className="mt-8 rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">{properties.length ? "No matching properties. Try another locality or category." : "No properties available right now. Check back soon."}</p>)}
        </div>
      </section>

      <WhyChoose />

      <footer id="contact" className="bg-slate-950 px-6 py-10 text-white">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 md:flex-row">
          <div>
            <h2 className="text-2xl font-bold tracking-widest">NAREN REALTY</h2>
            <p className="mt-2 text-sm text-slate-400">Your property. Our priority.</p>
          </div>
          <div>
            <p className="font-semibold">Pune, Maharashtra</p>
            <p className="mt-2 text-sm text-slate-400">For property enquiries, connect with our team.</p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <Link href="/properties" className="text-amber-400 hover:text-amber-300">Live Properties</Link>
              <Link href="/account" className="text-amber-400 hover:text-amber-300">My Account</Link>
              <Link href="/list-property" className="text-amber-400 hover:text-amber-300">List Your Property</Link>
              <Link href="/admin/login" className="text-amber-400 hover:text-amber-300">Admin Login</Link>
            </div>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-800 pt-4 text-xs">
              <Link href="/customer-terms" className="text-slate-400 hover:text-amber-300">Customer Terms</Link>
              <Link href="/owner-terms" className="text-slate-400 hover:text-amber-300">Owner Terms</Link>
              <Link href="/pg-hostel-policy" className="text-slate-400 hover:text-amber-300">PG / Hostel Policy</Link>
              <Link href="/airbnb-policy" className="text-slate-400 hover:text-amber-300">Airbnb Policy</Link>
              <Link href="/privacy-policy" className="text-slate-400 hover:text-amber-300">Privacy Policy</Link>
              <Link href="/brokerage-policy" className="text-slate-400 hover:text-amber-300">Brokerage Policy</Link>
            </div>
          </div>
        </div>
        <p className="mx-auto mt-8 max-w-7xl border-t border-slate-800 pt-6 text-xs text-slate-500">
          © 2026 Naren Realty. All rights reserved.
        </p>
      </footer>

    </main>
  );
}