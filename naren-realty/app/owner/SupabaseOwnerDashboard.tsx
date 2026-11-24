"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PropertyInformation from "../components/PropertyInformation";
import { logoutCustomer, type CustomerOrOwnerSession } from "../lib/customers";
import { type PropertyListing } from "../lib/properties";
import { getSupabaseOwnerListings } from "../lib/supabase-owner-properties";

export default function SupabaseOwnerDashboard({ session }: { session: CustomerOrOwnerSession }) {
  const [listings, setListings] = useState<PropertyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function refreshListings() {
    setError("");
    try {
      setListings(await getSupabaseOwnerListings());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Your listings could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void refreshListings(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function signOut() {
    try {
      await logoutCustomer();
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : "Unable to log out.");
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-[#10243A] text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:flex-nowrap sm:gap-4 sm:px-6 sm:py-5">
          <Link href="/" className="min-w-0">
            <span className="block text-xl font-bold tracking-widest">NAREN <span className="text-amber-400">REALTY</span></span>
            <span className="mt-1 block text-xs tracking-widest text-slate-300">OWNER PORTAL</span>
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/account" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/30 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-white/10">My Account</Link>
            <button onClick={signOut} className="min-h-11 rounded-lg bg-amber-400 px-3 py-2 text-sm font-bold text-slate-950">Sign Out</button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 [overflow-wrap:anywhere] sm:px-6 sm:py-12">
        <div className="flex flex-col gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-amber-700">OWNER DASHBOARD</p>
            <h1 className="mt-2 text-3xl font-bold text-[#10243A]">Welcome, {session.fullName}</h1>
            <p className="mt-2 text-sm text-slate-600">Your listings and their approval status.</p>
            <p className="mt-2 text-xs text-slate-500">Owner submissions remain pending until an Admin reviews them. You cannot approve or publish your own listing.</p>
          </div>
          <Link href="/list-property" className="inline-flex min-h-11 items-center rounded-lg bg-amber-400 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-amber-300">+ Add Property</Link>
        </div>

        {notice && <p role="status" className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{notice}</p>}
        {error && <p role="alert" className="mt-5 text-sm text-rose-700">{error}</p>}
        <p className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">New listings must be submitted through the secure verification form. Existing listing changes are handled by NAREN REALTY Admin so ownership and authority can be rechecked.</p>

        {loading ? <p className="mt-8 text-sm text-slate-600">Loading your listings...</p> : <div className="mt-6 space-y-4">
          {listings.length === 0 ? <div className="border-y border-slate-200 py-14 text-center"><h2 className="font-bold text-[#10243A]">No listings yet</h2><p className="mt-2 text-sm text-slate-600">Add a flat rental or resale property to get started.</p></div> : listings.map((listing) => <article key={listing.id} className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:p-5">
            {listing.photos[0] && <img src={listing.photos[0]} alt="" className="aspect-[4/3] w-full rounded-md object-cover sm:w-40" />}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-[#10243A]">{listing.title}</h2><span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${listing.status === "Approved" ? "bg-emerald-100 text-emerald-800" : listing.status === "Rejected" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-900"}`}>{listing.status}</span></div>
              <p className="mt-1 text-sm text-slate-600">{listing.type === "Rental" ? "Flat Rental" : listing.type === "Resale" ? "Flat Resale" : listing.type === "PG" ? "PG / Hostel" : "Airbnb / Short Stay"} · {listing.locality}</p>
              <p className="mt-1 font-semibold text-slate-800">₹{listing.price.toLocaleString("en-IN")}{listing.type === "Rental" ? " / month" : listing.type === "Airbnb" ? " / night" : listing.type === "PG" ? " / person / month" : ""}</p>
              <p className="mt-2 text-xs text-slate-500">Updated {new Date(listing.updatedAt).toLocaleDateString("en-IN")}</p>
              <PropertyInformation listing={listing} />
            </div>
            {(listing.status === "Pending Approval" || listing.status === "Rejected") && <span className="h-fit shrink-0 text-xs text-slate-500">Contact Admin for changes</span>}
          </article>)}
        </div>}
      </section>
    </main>
  );
}
