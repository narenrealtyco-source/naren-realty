"use client";

import { useActionState, useState } from "react";
import { closeMatch, deleteRequirement, editLoanRequirement, submitRequirement, updateRequirement, type RequirementState } from "../requirements-actions";
import LocalityAutocomplete from "./LocalityAutocomplete";

const initial: RequirementState = { status: "idle", message: "" };
const input = "mt-1 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-3 text-base";
const label = "block text-sm font-semibold";
const button = "min-h-11 rounded-lg bg-[#10243A] px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50";
function Result({ state }: { state: RequirementState }) { return state.message ? <p role={state.status === "error" ? "alert" : "status"} className="text-sm">{state.message}</p> : null; }
function Notice({ ready }: { ready: boolean }) { return !ready ? <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">Secure database setup is pending. This form cannot save anything yet.</p> : null; }
function ContactFields({ email = false }: { email?: boolean }) {
  return <><label className={label}>Name<input name="customer_name" className={input} maxLength={120} autoComplete="name" required /></label><label className={label}>Phone number<input name="phone" className={input} type="tel" maxLength={13} autoComplete="tel" required /></label>{email && <label className={label}>Email (optional)<input name="email" className={input} type="email" autoComplete="email" maxLength={254} /></label>}</>;
}
export function MatchForm({ ready }: { ready: boolean }) {
  const [state, action, pending] = useActionState(submitRequirement.bind(null, "match"), initial);
  const [category, setCategory] = useState("Flat");
  const [purpose, setPurpose] = useState("Rent");
  const [brokerageAccepted, setBrokerageAccepted] = useState(false);
  return <form action={action} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
    <h2 className="text-xl font-bold text-[#10243A]">Create property requirement</h2><Notice ready={ready} />
    <label className={label}>Requirement type<select name="purpose" className={input} value={purpose} onChange={(event) => { setPurpose(event.target.value); setBrokerageAccepted(false); }} required><option>Rent</option><option>Buy</option></select></label>
    <label className={label}>Property category<select name="category" className={input} value={category} onChange={(event) => { setCategory(event.target.value); setBrokerageAccepted(false); }}><option>Flat</option><option>PG</option><option>Hostel</option><option>Airbnb</option><option>Short Stay</option></select></label>
    <p className="text-xs text-slate-600">Buying is available for flats only.</p>
    <label className={label}>Preferred location<LocalityAutocomplete name="location" className={input} maxLength={120} placeholder="Start typing locality, e.g. Baner" required /></label>
    {category === "Flat" && <label className={label}>Configuration<select name="bedrooms" className={input}><option value="">Any BHK</option>{[1,2,3,4,5].map((n) => <option key={n} value={n}>{n} BHK</option>)}</select></label>}
    {category !== "Flat" && <input type="hidden" name="bedrooms" value="" />}
    <div className="grid gap-3 sm:grid-cols-2"><label className={label}>Minimum budget<input name="min_budget" className={input} type="number" min="0.01" step="0.01" /></label><label className={label}>Maximum budget<input name="max_budget" className={input} type="number" min="0.01" step="0.01" /></label></div>
    <label className={label}>Preferred move-in / possession date<input name="move_in_date" className={input} type="date" /></label>
    <label className={label}>Additional requirements<textarea name="details" className={input} maxLength={2000} rows={3} /></label>
    <ContactFields />
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6"><input type="checkbox" name="brokerage_acknowledged" checked={brokerageAccepted} onChange={(event) => setBrokerageAccepted(event.target.checked)} required className="mt-1 size-4 shrink-0 accent-[#10243A]" /><span>{category === "Flat" ? (purpose === "Buy" ? "I acknowledge buyer brokerage of 2% of the final sale value, plus applicable GST." : "I acknowledge tenant brokerage equal to one month’s rent, plus applicable GST.") : category === "Airbnb" || category === "Short Stay" ? "No guest commission is payable. Host commission is agreed separately with the property owner." : "I acknowledge PG / Hostel tenant brokerage equal to one month’s rent, plus applicable GST. No brokerage or commission is payable by the PG / Hostel Owner."} I have read and accept the applicable terms.</span></label>
    <Result state={state} /><button disabled={!ready || pending || state.status === "success" || !brokerageAccepted} className={button}>{pending ? "Saving..." : "Submit requirement"}</button>
  </form>;
}
export function LoanForm({ ready, types, defaultTypeId }: { ready: boolean; types: { id: string; name: string }[]; defaultTypeId?: string }) {
  const [state, action, pending] = useActionState(submitRequirement.bind(null, "loan"), initial);
  return <form action={action} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
    <h2 className="text-xl font-bold text-[#10243A]">Create loan requirement</h2><Notice ready={ready} /><ContactFields email />
    <label className={label}>Loan type<select name="loan_type_id" className={input} defaultValue={defaultTypeId ?? ""} required><option value="" disabled>Choose loan type</option>{types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label>
    <label className={label}>Required loan amount (INR)<input name="amount" className={input} type="number" min="0.01" step="0.01" required /></label>
    <label className={label}>Property location (optional)<LocalityAutocomplete name="property_location" className={input} maxLength={120} placeholder="Start typing locality" /></label>
    <label className={label}>Property value (optional)<input name="property_value" className={input} type="number" min="0.01" step="0.01" /></label>
    <label className={label}>Employment type<select name="employment" className={input} defaultValue="" required><option value="" disabled>Choose employment type</option><option>Salaried</option><option>Self-employed</option><option>Business</option><option>Other</option></select></label>
    <label className={label}>Additional details<textarea name="details" className={input} maxLength={2000} rows={3} /></label>
    <p className="text-sm text-slate-600">This is a request for assistance, not a loan approval.</p><Result state={state} /><button disabled={!ready || pending || state.status === "success"} className={button}>{pending ? "Saving..." : "Submit loan requirement"}</button>
  </form>;
}
export function CloseMatchForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(closeMatch, initial);
  return <form action={action} className="mt-3"><input type="hidden" name="id" value={id} /><button className={button} disabled={pending}>Close requirement</button><Result state={state} /></form>;
}
export function AdminRequirementForm({ id, kind, status, remarks, assigned }: { id: string; kind: "match" | "loan"; status: string; remarks: string; assigned: string }) {
  const [state, action, pending] = useActionState(updateRequirement, initial);
  const statuses = kind === "match" ? ["New","Contacted","Closed"] : ["New","Contacted","Documents Pending","Under Process","Approved","Rejected","Closed"];
  return <form action={action} className="mt-3 space-y-3"><input type="hidden" name="id" value={id} /><input type="hidden" name="kind" value={kind} />
    <label className={label}>Status<select className={input} name="status" defaultValue={status}>{statuses.map((item) => <option key={item}>{item}</option>)}</select></label>
    <label className={label}>Assigned profile ID (optional)<input className={input} name="assigned_to" defaultValue={assigned} maxLength={36} /></label>
    <label className={label}>Internal follow-up<textarea className={input} name="remarks" maxLength={2000} defaultValue={remarks} rows={3} /></label>
    <button disabled={pending} className={button}>Save follow-up</button><Result state={state} />
  </form>;
}

export function AdminRequirementDelete({ id, kind }: { id: string; kind: "match" | "loan" }) {
  const [state, action, pending] = useActionState(deleteRequirement, initial);
  return <form action={action} onSubmit={(event) => { if (!window.confirm("Are you sure you want to permanently delete this requirement? This cannot be undone.")) event.preventDefault(); }} className="mt-3 border-t border-rose-100 pt-3">
    <input type="hidden" name="id" value={id} /><input type="hidden" name="kind" value={kind} />
    <button type="submit" disabled={pending} className="min-h-11 rounded-lg border border-rose-300 px-4 py-2 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50">{pending ? "Deleting..." : "Delete requirement"}</button>
    <Result state={state} />
  </form>;
}

export type AdminLoan = { id: string; customer_name: string; phone: string; email: string; loan_type_id: string; amount: number; property_location: string; property_value: number | null; employment: string; details: string };
export function AdminLoanEdit({ loan, types }: { loan: AdminLoan; types: { id: string; name: string; active: boolean }[] }) {
  const [state, action, pending] = useActionState(editLoanRequirement, initial);
  return <details className="mt-4"><summary className="cursor-pointer font-semibold">Edit loan details</summary><form action={action} className="mt-3 space-y-3">
    <input type="hidden" name="id" value={loan.id} />
    <label className={label}>Name<input className={input} name="customer_name" defaultValue={loan.customer_name} maxLength={120} required /></label>
    <label className={label}>Phone<input className={input} name="phone" defaultValue={loan.phone} type="tel" maxLength={13} required /></label>
    <label className={label}>Email<input className={input} name="email" defaultValue={loan.email} type="email" maxLength={254} /></label>
    <label className={label}>Loan type<select className={input} name="loan_type_id" defaultValue={loan.loan_type_id}>{types.map((type) => <option key={type.id} value={type.id}>{type.name}{type.active ? "" : " (inactive)"}</option>)}</select></label>
    <label className={label}>Loan amount<input className={input} name="amount" type="number" min="0.01" step="0.01" defaultValue={loan.amount} required /></label>
    <label className={label}>Property location<LocalityAutocomplete className={input} name="property_location" maxLength={120} defaultValue={loan.property_location} placeholder="Start typing locality" /></label>
    <label className={label}>Property value<input className={input} name="property_value" type="number" min="0.01" step="0.01" defaultValue={loan.property_value ?? ""} /></label>
    <label className={label}>Employment<select className={input} name="employment" defaultValue={loan.employment}><option>Salaried</option><option>Self-employed</option><option>Business</option><option>Other</option></select></label>
    <label className={label}>Additional details<textarea className={input} name="details" maxLength={2000} defaultValue={loan.details} /></label>
    <button className={button} disabled={pending}>Save loan details</button><Result state={state} />
  </form></details>;
}
