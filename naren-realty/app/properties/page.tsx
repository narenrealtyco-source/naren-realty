"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { type ListingType, type PropertyListing } from "../lib/properties";
import { loadApprovedProperties } from "./actions";
import PropertyCard from "../components/PropertyCard";
import { visitRequestsReady } from "./visit-actions";
import { matchesPropertyLocation } from "../lib/property-search";

export default function BrowsePropertiesPage() {
  const [listings, setListings] = useState<PropertyListing[]>([]);
  const [locality, setLocality] = useState("");
  const [type, setType] = useState<"All" | ListingType>("All");
  const [budget, setBudget] = useState("");
  const [bedrooms, setBedrooms] = useState("");
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

  const filtered = listings.filter((listing) => {
    const localityMatch = matchesPropertyLocation(listing, locality);
    const typeMatch = type === "All" || listing.type === type;
    const budgetMatch = !budget || listing.price <= Number(budget);
    const bedroomMatch = !bedrooms || listing.type === "PG" || (bedrooms === "4+" ? listing.bedrooms >= 4 : listing.bedrooms === Number(bedrooms));
    return localityMatch && typeMatch && budgetMatch && bedroomMatch;
  });

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-[#10243A] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-4 sm:gap-4 sm:px-6 sm:py-5">
          <Link href="/" className="min-w-0"><span className="block text-base font-bold tracking-wide sm:text-xl sm:tracking-widest">NAREN <span className="text-amber-400">REALTY</span></span><span className="mt-1 block text-[10px] tracking-wide text-slate-300 sm:text-xs sm:tracking-widest">APPROVED PROPERTIES</span></Link>
          <Link href="/list-property" className="shrink-0 rounded-lg bg-amber-400 px-3 py-3 text-xs font-bold text-slate-950 sm:px-4 sm:text-sm">List Your Property</Link>
        </div>
      </header>
      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-6 sm:py-12">
        <div className="border-b border-slate-200 pb-6"><p className="text-xs font-bold tracking-[0.18em] text-amber-700">CUSTOMER PROPERTY BROWSING</p><h1 className="mt-2 text-3xl font-bold text-[#10243A]">Find your next home</h1><p className="mt-2 text-sm text-slate-600">Only properties approved by Naren Realty are shown.</p></div>
        <div className="mt-6 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm font-semibold">Locality or landmark<input value={locality} onChange={(event) => setLocality(event.target.value)} placeholder="Search locality or landmark" className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-amber-500" /></label>
          <label className="text-sm font-semibold">Property category<select value={type} onChange={(event) => setType(event.target.value as "All" | ListingType)} className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 font-normal"><option value="All">All properties</option><option value="Rental">Flat rental</option><option value="Resale">Flat resale</option><option value="PG">PG / Hostel</option><option value="Airbnb">Airbnb / Short stay</option></select></label>
          <label className="text-sm font-semibold">Maximum budget (INR)<input type="number" min="1" value={budget} onChange={(event) => setBudget(event.target.value)} placeholder="No limit" className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-amber-500" /></label>
          <label className="text-sm font-semibold">Bedrooms<select value={bedrooms} onChange={(event) => setBedrooms(event.target.value)} className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 font-normal"><option value="">Any BHK</option><option value="1">1 BHK</option><option value="2">2 BHK</option><option value="3">3 BHK</option><option value="4+">4+ BHK</option></select></label>
        </div>
        {storageError && <p role="alert" className="mt-5 text-sm text-rose-700">{storageError}</p>}
        {loading && <p role="status" className="mt-6 text-sm text-slate-600">Loading approved properties...</p>}
        {!loading && !storageError && <p className="mt-6 text-sm text-slate-600">{filtered.length} approved {filtered.length === 1 ? "property" : "properties"}</p>}
        {!loading && !storageError && (filtered.length ? <div className="mt-4 grid gap-5 md:grid-cols-2">{filtered.map((listing) => <PropertyCard key={listing.id} listing={listing} listings={listings} visitsReady={visitsReady} />)}</div> : <div className="mt-8 rounded-xl border border-slate-200 bg-white py-14 text-center"><h2 className="font-bold text-[#10243A]">{listings.length ? "No matching properties" : "No properties available right now. Check back soon."}</h2>{listings.length > 0 && <p className="mt-2 text-sm text-slate-600">Adjust the filters to see more listings.</p>}</div>)}
      </section>
    </main>
  );
}
