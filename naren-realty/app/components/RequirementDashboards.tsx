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
  const [location, setLocation] = useState("");
  const [budget, setBudget] = useState("");
  const [showPostForm, setShowPostForm] = useState(false);
  const ready = true;
  const available = properties.filter((property) =>
    (property.type === "Rental" || property.type === "Resale") &&
    (!purpose || property.type === purpose) &&
    (!location || property.locality.toLowerCase().includes(location.trim().toLowerCase())) &&
    (!budget || property.price <= Number(budget))
  );
  const activeRequirements = requirements.filter((r) => r.status !== "Closed");
  const matchedIds = new Set(activeRequirements.flatMap((r) => properties.filter((p) => matchesRequirement(r, p)).map((p) => p.id)));
  const visible = activeRequirements.length ? available.filter((p) => matchedIds.has(p.id)) : available;
  return <section className="mt-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold text-[#10243A]">Matching Properties</h2><p className="mt-1 text-sm text-slate-600">Browse approved rental and resale properties matching your preferences.</p></div><button type="button" onClick={()=>setShowPostForm(true)} className="min-h-11 rounded-lg bg-[#10243A] px-4 py-3 text-sm font-bold text-white">＋ Post Your Requirement</button></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      <label className="text-sm font-semibold">Property type<select className={input} value={purpose} onChange={(e)=>setPurpose(e.target.value)}><option value="">Rental & Resale</option><option value="Rental">Rental</option><option value="Resale">Resale</option></select></label>
      <label className="text-sm font-semibold">Location<LocalityAutocomplete className={input} value={location} onChange={(e)=>setLocation(e.target.value)} maxLength={120} placeholder="Filter by locality" /></label>
      <label className="text-sm font-semibold">Maximum budget (₹)<input className={input} type="number" min="0" value={budget} onChange={(e)=>setBudget(e.target.value)} placeholder="Any budget" /></label>
    </div>
    {!visible.length ? <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center"><p className="font-semibold">No matching properties found.</p><p className="mt-1 text-sm text-slate-600">Try changing your filters or post your requirement and our team can help.</p></div> : <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{visible.map((property)=><PropertyCard key={property.id} listing={property} listings={properties} visitsReady={visitsReady} />)}</div>}
    {requirements.length>0 && <details className="mt-8 rounded-xl border border-slate-200 bg-white p-4"><summary className="cursor-pointer font-bold text-[#10243A]">My posted requirements ({requirements.length})</summary><div className="mt-3 space-y-3">{requirements.map((r)=>{const matches=properties.filter((p)=>matchesRequirement(r,p));return <article key={r.id} className="rounded-lg border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{r.purpose==="Buy"?"Resale":"Rental"} · {r.location}</h3><span className="text-xs text-slate-500">{r.status}</span></div><p className="mt-1 text-sm text-slate-600">{r.bedrooms===0?"1 RK":r.bedrooms===6?"4+ BHK":r.bedrooms? r.bedrooms+" BHK":"Any BHK"} · {matches.length} matching properties</p>{r.status!=="Closed"&&<CloseMatchForm id={r.id}/>}</article>})}</div></details>}
    {showPostForm && <MatchForm ready={ready} onClose={()=>setShowPostForm(false)} />}
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
