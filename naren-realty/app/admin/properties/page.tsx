"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminLogoutButton from "../../components/AdminLogoutButton";
import InstagramPostPanel from "./InstagramPostPanel";
import DeleteRejectedPropertyButton from "./DeleteRejectedPropertyButton";
import {
  approveAdminProperty,
  loadAdminProperties,
  rejectAdminProperty,
} from "./actions";
import type { AdminPropertyRecord } from "../../lib/admin-supabase-data";

const categories = ["All", "Rental", "Resale", "PG", "Airbnb"] as const;

function photoCount(value: unknown): number {
  return Array.isArray(value) ? value.filter((photo) => typeof photo === "string").length : 0;
}

function categoryLabel(category: string): string {
  if (category === "Rental") return "Flat Rental";
  if (category === "Resale") return "Flat Resale";
  if (category === "PG") return "PG / Hostel";
  if (category === "Airbnb") return "Airbnb / Short Stay";
  return category;
}

function formatStatus(status: string): string {
  return status.replace(/\b\w/g, (character) => character.toUpperCase());
}

export default function AdminPropertiesPage() {
  const [properties, setProperties] = useState<AdminPropertyRecord[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<(typeof categories)[number]>("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function refreshProperties() {
    setLoading(true);
    setError("");
    try {
      setProperties(await loadAdminProperties());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Properties could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    loadAdminProperties()
      .then((items) => { if (active) setProperties(items); })
      .catch((loadError: unknown) => { if (active) setError(loadError instanceof Error ? loadError.message : "Properties could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const requestedStatus = new URLSearchParams(window.location.search).get("status")?.toLowerCase();
      if (requestedStatus && ["pending", "pending approval", "approved", "rejected", "deleting"].includes(requestedStatus)) {
        setStatusFilter(requestedStatus);
      }
    });
    return () => { active = false; };
  }, []);

  const statuses = useMemo(
    () => ["All", ...Array.from(new Set(properties.map((property) => property.status)))],
    [properties],
  );
  const query = search.trim().toLowerCase();
  const filtered = properties.filter((property) =>
    (categoryFilter === "All" || property.category === categoryFilter) &&
    (statusFilter === "All" || (statusFilter.toLowerCase() === "pending"
      ? ["pending", "pending approval"].includes(property.status.toLowerCase())
      : property.status.toLowerCase() === statusFilter.toLowerCase())) &&
    [property.title, property.category, property.locality, property.id]
      .some((value) => value.toLowerCase().includes(query)),
  );

  async function review(property: AdminPropertyRecord, status: "approved" | "rejected") {
    if (status === "rejected" && !window.confirm(property.status === "approved" ? "Unpublish this property? Its photos remain accessible in the public photo bucket." : "Reject this property listing?")) return;
    setBusyId(property.id);
    setError("");
    setSuccess("");
    try {
      if (status === "approved") await approveAdminProperty(property.id);
      else await rejectAdminProperty(property.id);
      await refreshProperties();
      setSuccess(`Property "${property.title}" was ${status === "approved" ? "published" : property.status === "approved" ? "unpublished" : "rejected"}.`);
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "The property status could not be updated.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-[#10243A] text-white">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-4 px-4 py-5 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-amber-400">NAREN REALTY</p>
            <h1 className="mt-1 text-xl font-bold">Property Management</h1>
          </div>
          <nav aria-label="Admin navigation" className="flex w-full flex-wrap gap-2 md:w-auto">
            <Link href="/admin" className="rounded-lg border border-white/30 px-3 py-2 text-sm font-semibold text-white">Dashboard</Link>
            <Link href="/admin/properties/new" className="rounded-lg bg-amber-400 px-3 py-2 text-sm font-bold text-slate-950">Add Property</Link>
            <Link href="/admin/submissions" className="rounded-lg border border-white/30 px-3 py-2 text-sm font-semibold text-white">Customer submissions</Link>
            <Link href="/admin/enquiries" className="rounded-lg border border-white/30 px-3 py-2 text-sm font-semibold text-white">Enquiries</Link>
            <Link href="/admin/policies" className="rounded-lg border border-white/30 px-3 py-2 text-sm font-semibold text-white">Policies</Link>
            <Link href="/" className="rounded-lg bg-amber-400 px-3 py-2 text-sm font-bold text-slate-950">Website</Link>
            <AdminLogoutButton />
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-6 sm:py-12">
        <div className="border-b border-slate-200 pb-6">
          <p className="text-xs font-bold tracking-[0.16em] text-amber-700">ADMIN CONTROL</p>
          <h2 className="mt-2 text-3xl font-bold text-[#10243A]">Property approvals</h2>
          <p className="mt-2 text-sm text-slate-600">Review Supabase property records and update approval status.</p>
        </div>

        {loading && <p role="status" className="mt-5 text-sm text-slate-600">Loading properties...</p>}
        {error && <p role="alert" className="mt-5 text-sm text-rose-700">{error}</p>}
        {success && <p role="status" className="mt-5 text-sm text-emerald-700">{success}</p>}

        {!loading && (
          <>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-sm font-semibold text-slate-800">
                Search properties
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Title, category, locality or ID"
                  className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 font-normal outline-none focus:border-amber-500"
                />
              </label>
              <label className="text-sm font-semibold text-slate-800">
                Category
                <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as (typeof categories)[number])} className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 font-normal">
                  {categories.map((category) => <option key={category} value={category}>{category === "All" ? "All categories" : categoryLabel(category)}</option>)}
                </select>
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {statuses.map((status) => (
                <button key={status} onClick={() => setStatusFilter(status)} aria-pressed={statusFilter.toLowerCase() === status.toLowerCase()} className={`rounded-md border px-3 py-2 text-sm font-semibold ${statusFilter.toLowerCase() === status.toLowerCase() ? "border-[#10243A] bg-[#10243A] text-white" : "border-slate-300 bg-white text-slate-700"}`}>
                  {status === "All" ? "All statuses" : formatStatus(status)}
                </button>
              ))}
            </div>
            <p className="mt-5 text-sm font-semibold text-slate-700">{filtered.length} properties</p>
            <div className="mt-5 space-y-5">
              {filtered.map((property) => (
                <article key={property.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="break-words text-lg font-bold text-[#10243A]">{property.title}</h3>
                        <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{formatStatus(property.status)}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{categoryLabel(property.category)} · {property.locality}</p>
                      <p className="mt-1 font-semibold text-[#10243A]">₹{property.price.toLocaleString("en-IN")}</p>
                      <p className="mt-1 text-xs text-slate-500">Property ID: <span className="break-all">{property.id}</span> · Photos: {photoCount(property.photos)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {typeof property.details === "object" && property.details !== null && "adminDirect" in property.details && property.details.adminDirect === true && <Link href={`/admin/properties/${property.id}/edit`} className="rounded-md border border-slate-400 px-4 py-2 text-sm font-semibold">Edit</Link>}
                      {property.status !== "approved" && property.status !== "deleting" && <button disabled={busyId === property.id} onClick={() => void review(property, "approved")} className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Publish / Approve</button>}
                      {property.status !== "rejected" && property.status !== "deleting" && <button disabled={busyId === property.id} onClick={() => void review(property, "rejected")} className="rounded-md border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 disabled:opacity-60">{property.status === "approved" ? "Unpublish" : "Reject"}</button>}
                      {(property.status === "rejected" || property.status === "deleting") && <DeleteRejectedPropertyButton id={property.id} retry={property.status === "deleting"} /> }
                    </div>
                  </div>
                  {property.status.toLowerCase() === "approved" && property.category.toLowerCase() === "resale" && Array.isArray(property.photos) && typeof property.photos[0] === "string" && (
                    <InstagramPostPanel propertyId={property.id} imagePath={property.photos[0]} />
                  )}
                  <p className="mt-4 text-xs text-slate-500">Created {new Date(property.created_at).toLocaleString("en-IN")}</p>
                </article>
              ))}
              {!filtered.length && <div className="border-y border-slate-200 py-14 text-center"><h3 className="font-bold text-[#10243A]">{properties.length ? "No matching properties" : "No properties found"}</h3><p className="mt-2 text-sm text-slate-600">Approved and pending Supabase property records will appear here.</p></div>}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
