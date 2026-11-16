"use client";

import { useState } from "react";
import LocalityAutocomplete from "./LocalityAutocomplete";
import type { PropertyListing } from "../lib/properties";
import { matchesRequirement, type MatchRequirement } from "../lib/requirements";
import PropertyCard from "./PropertyCard";
import { CloseMatchForm } from "./RequirementForms";

const input = "mt-1 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-base";
export function MatchDashboard({ requirements, properties, visitsReady }: { requirements: MatchRequirement[]; properties: PropertyListing[]; visitsReady: boolean }) {
  const [purpose, setPurpose] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const filtered = requirements.filter((r) => (!purpose || r.purpose === purpose) && (!category || r.category === category) && (!location || r.location.toLowerCase().includes(location.trim().toLowerCase())));
  return <section className="mt-8"><PublicPropertyBrowser properties={properties} visitsReady={visitsReady} /><div className="mt-10"><h2 className="text-xl font-bold text-[#10243A]">Your posted requirements</h2>
    <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      <label className="text-sm">Purpose<select className={input} value={purpose} onChange={(e) => setPurpose(e.target.value)}><option value="">All</option><option>Buy</option><option>Rent</option></select></label>
      <label className="text-sm">Category<select className={input} value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All</option><option>Flat</option><option>PG</option><option>Hostel</option><option>Airbnb</option><option>Short Stay</option></select></label>
      <label className="text-sm">Location<LocalityAutocomplete className={input} value={location} onChange={(e) => setLocation(e.target.value)} maxLength={120} placeholder="Start typing locality" /></label>
    </div>
    {!filtered.length && <p className="mt-3">{requirements.length ? "No requirements match these filters." : "No requirements yet."}</p>}
    {filtered.map((r) => {
      const matches = r.status === "Closed" ? [] : properties.filter((property) => matchesRequirement(r, property));
      let notes = r.details;
      try { const parsed = JSON.parse(r.details); if (parsed && typeof parsed === "object") notes = parsed.notes ?? ""; } catch { /* legacy text */ }
      return <article key={r.id} className="mt-4 rounded-xl border border-slate-200 bg-white p-4"><h3 className="font-bold text-[#10243A]">{r.purpose} · {r.category} · {r.location}</h3>
        <p className="mt-1 text-sm text-slate-600">Status: {r.status} {r.bedrooms ? `· ${r.bedrooms} BHK` : ""} · Budget: {r.min_budget ?? "Any"} – {r.max_budget ?? "Any"}</p>
        {r.move_in_date && <p className="mt-1 text-sm">Preferred date: {r.move_in_date}</p>}{notes && <p className="mt-1 whitespace-pre-wrap text-sm">{notes}</p>}
        {r.status !== "Closed" && <><CloseMatchForm id={r.id} />{matches.length ? <div className="mt-4 grid gap-3 md:grid-cols-2">{matches.map((property) => <PropertyCard key={property.id} listing={property} listings={properties} visitsReady={visitsReady} />)}</div> : <p className="mt-3 text-sm text-slate-500">No matching properties are currently available for this requirement.</p>}</>}
      </article>;
    })}
  </div></section>;
}
export function PublicPropertyBrowser({ properties, visitsReady }: { properties: PropertyListing[]; visitsReady: boolean }) {
  const [type, setType] = useState<"All" | "Rental" | "Resale">("All");
  const available = properties.filter((property) => property.status === "Approved" && (property.type === "Rental" || property.type === "Resale") && (type === "All" || property.type === type));
  return <section><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold text-[#10243A]">Matching Properties</h2><p className="mt-1 text-sm text-slate-500">Approved rental and resale listings</p></div><div className="flex flex-wrap gap-2">{(["All", "Rental", "Resale"] as const).map((item) => <button key={item} type="button" onClick={() => setType(item)} aria-pressed={type === item} className={`rounded-full border px-4 py-2 text-sm font-semibold ${type === item ? "border-[#FBBF24] bg-[#FBBF24] text-[#10243A]" : "border-slate-300 bg-white text-[#10243A]"}`}>{item}</button>)}</div></div>
    {!available.length ? <p className="mt-4 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">No approved {type === "All" ? "rental or resale" : type.toLowerCase()} properties are available right now.</p> : <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{available.map((property) => <PropertyCard key={property.id} listing={property} listings={properties} visitsReady={visitsReady} />)}</div>}
  </section>;
}
export type LoanSummary = { id: string; customer_name: string; phone: string; loan_type_id: string; type_name: string; amount: number; status: string; created_at: string };
export function LoanDashboard({ loans, types }: { loans: LoanSummary[]; types: { id: string; name: string }[] }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [maximum, setMaximum] = useState("");
  const filtered = loans.filter((loan) => (!query || `${loan.customer_name} ${loan.phone}`.toLowerCase().includes(query.trim().toLowerCase())) && (!type || loan.loan_type_id === type) && (!status || loan.status === status) && (!maximum || Number(loan.amount) <= Number(maximum)));
  return <section className="mt-6"><h2 className="text-xl font-bold">Your loan requirements</h2>
    <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <label className="text-sm">Search<input className={input} value={query} onChange={(e) => setQuery(e.target.value)} maxLength={120} /></label>
      <label className="text-sm">Loan type<select className={input} value={type} onChange={(e) => setType(e.target.value)}><option value="">All</option>{types.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="text-sm">Status<select className={input} value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All</option>{["New","Contacted","Documents Pending","Under Process","Approved","Rejected","Closed"].map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="text-sm">Maximum amount<input className={input} type="number" min="0" value={maximum} onChange={(e) => setMaximum(e.target.value)} /></label>
    </div>
    {!filtered.length ? <p className="mt-3">{loans.length ? "No requirements match these filters." : "No loan requirements yet."}</p> : <div className="mt-3 space-y-3">{filtered.map((loan) => <article key={loan.id} className="rounded-xl border bg-white p-4"><h3 className="font-bold">{loan.customer_name}</h3><p className="text-sm">{loan.phone} · {loan.type_name} · ₹{Number(loan.amount).toLocaleString("en-IN")}</p><p className="mt-1 text-sm">Status: {loan.status} · {loan.created_at}</p></article>)}</div>}
  </section>;
}
