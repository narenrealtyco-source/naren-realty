"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { type ListingType, type PropertyListing } from "../lib/properties";
import { loadApprovedProperties } from "./actions";
import PropertyCard from "../components/PropertyCard";
import LocalityAutocomplete from "../components/LocalityAutocomplete";
import { visitRequestsReady } from "./visit-actions";
import { matchesPropertyLocation } from "../lib/property-search";

export default function BrowsePropertiesPage() {
  const [listings, setListings] = useState<PropertyListing[]>([]);
  const [locality, setLocality] = useState("");
  const [type, setType] = useState<"All" | ListingType>("All");
  const [budget, setBudget] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [loading, setLoading] = useState(true);
  const [visitsReady, setVisitsReady] = useState(false);

  useEffect(() => {
    let active = true;
    visitRequestsReady().then((ready) => { if (active) setVisitsReady(ready); }).catch(() => { if (active) setVisitsReady(false); });
    loadApprovedProperties().then((items) => { if (active) setListings(items); })
      .catch(() => { if (active) setStorageError("Approved properties could not be loaded. Please try again."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialLocality = params.get("locality");
    const initialType = params.get("type");
    if (initialLocality) setLocality(initialLocality);
    if (initialType === "Rental" || initialType === "Resale" || initialType === "PG" || initialType === "Airbnb") {
      setType(initialType);
    }
  }, []);

  const filtered = listings.filter((listing) => {
    const localityMatch = matchesPropertyLocation(listing, locality);
    const typeMatch = type === "All" || listing.type === type;
    const budgetMatch = !budget || listing.price <= Number(budget);
    const bedroomMatch = !bedrooms || listing.type === "PG" || (bedrooms === "4+" ? listing.bedrooms >= 4 : listing.bedrooms === Number(bedrooms));
    return localityMatch && typeMatch && budgetMatch && bedroomMatch;
  });

  const activeFilterCount = [type !== "All", Boolean(budget), Boolean(bedrooms)].filter(Boolean).length;
  const clearFilters = () => { setType("All"); setBudget(""); setBedrooms(""); };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-[#A71930] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-4 sm:gap-4 sm:px-6 sm:py-5">
          <Link href="/" className="min-w-0"><span className="block text-base font-bold tracking-wide sm:text-xl sm:tracking-widest">NAREN <span className="text-amber-400">REALTY</span></span><span className="mt-1 block text-[10px] tracking-wide text-slate-300 sm:text-xs sm:tracking-widest">APPROVED PROPERTIES</span></Link>
          <Link href="/list-property" className="shrink-0 rounded-lg bg-amber-400 px-3 py-3 text-xs font-bold text-slate-950 sm:px-4 sm:text-sm">List Your Property</Link>
        </div>
      </header>
      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-6 sm:py-12">
        <div className="border-b border-slate-200 pb-6"><p className="text-xs font-bold tracking-[0.18em] text-amber-700">CUSTOMER PROPERTY BROWSING</p><h1 className="mt-2 text-3xl font-bold text-[#A71930]">Find your next home</h1><p className="mt-2 text-sm text-slate-600">Only properties approved by Naren Realty are shown.</p></div>

        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm shadow-slate-900/5 sm:p-2.5">
          <div className="min-w-0 flex-1">
            <LocalityAutocomplete value={locality} onChange={(event) => setLocality(event.target.value)} placeholder="Search locality or landmark" className="w-full rounded-xl border-0 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-800 outline-none ring-1 ring-transparent placeholder:text-slate-400 focus:bg-white focus:ring-amber-400 sm:px-4" />
          </div>
          <button type="button" onClick={() => setFiltersOpen(true)} aria-haspopup="dialog" aria-expanded={filtersOpen} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#A71930] px-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#861326] sm:px-5">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="size-4"><path d="M4 7h16M7 12h10m-7 5h4" /><circle cx="8" cy="7" r="1.5" fill="#FBBF24" stroke="#FBBF24" /><circle cx="15" cy="12" r="1.5" fill="#FBBF24" stroke="#FBBF24" /><circle cx="12" cy="17" r="1.5" fill="#FBBF24" stroke="#FBBF24" /></svg>
            <span>Filters</span>
            {activeFilterCount > 0 && <span className="inline-flex size-5 items-center justify-center rounded-full bg-amber-400 text-[11px] font-bold text-slate-950">{activeFilterCount}</span>}
          </button>
        </div>

        {filtersOpen && <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setFiltersOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="property-filter-title" className="w-full max-w-xl rounded-t-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">Refine your search</p><h2 id="property-filter-title" className="mt-1 text-xl font-bold text-[#A71930]">Property filters</h2></div>
              <button type="button" onClick={() => setFiltersOpen(false)} aria-label="Close filters" className="flex size-9 items-center justify-center rounded-full bg-slate-100 text-xl leading-none text-slate-600 hover:bg-slate-200">×</button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-600">Property category<select value={type} onChange={(event) => setType(event.target.value as "All" | ListingType)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-900 outline-none focus:border-amber-400 focus:bg-white"><option value="All">All properties</option><option value="Rental">Flat rental</option><option value="Resale">Flat resale</option><option value="PG">PG / Hostel</option><option value="Airbnb">Airbnb / Short stay</option></select></label>
              <label className="text-xs font-semibold text-slate-600">Maximum budget (INR)<input type="number" min="1" value={budget} onChange={(event) => setBudget(event.target.value)} placeholder="No limit" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-900 outline-none focus:border-amber-400 focus:bg-white" /></label>
              <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Bedrooms<select value={bedrooms} onChange={(event) => setBedrooms(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-900 outline-none focus:border-amber-400 focus:bg-white"><option value="">Any BHK</option><option value="1">1 BHK</option><option value="2">2 BHK</option><option value="3">3 BHK</option><option value="4+">4+ BHK</option></select></label>
            </div>
            <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <button type="button" onClick={clearFilters} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Clear all</button>
              <button type="button" onClick={() => setFiltersOpen(false)} className="rounded-xl bg-amber-400 px-6 py-3 text-sm font-bold text-slate-950 shadow-sm transition hover:bg-amber-300">Show {filtered.length} properties</button>
            </div>
          </section>
        </div>}

        {storageError && <p role="alert" className="mt-5 text-sm text-rose-700">{storageError}</p>}
        {loading && <p role="status" className="mt-6 text-sm text-slate-600">Loading approved properties...</p>}
        {!loading && !storageError && <p className="mt-6 text-sm text-slate-600">{filtered.length} approved {filtered.length === 1 ? "property" : "properties"}</p>}
        {!loading && !storageError && (filtered.length ? <div className="mt-4 grid gap-5 md:grid-cols-2">{filtered.map((listing) => <PropertyCard key={listing.id} listing={listing} listings={listings} visitsReady={visitsReady} />)}</div> : <div className="mt-8 rounded-xl border border-slate-200 bg-white py-14 text-center"><h2 className="font-bold text-[#A71930]">{listings.length ? "No matching properties" : "No properties available right now. Check back soon."}</h2>{listings.length > 0 && <p className="mt-2 text-sm text-slate-600">Adjust the filters to see more listings.</p>}</div>)}
      </section>
    </main>
  );
}
