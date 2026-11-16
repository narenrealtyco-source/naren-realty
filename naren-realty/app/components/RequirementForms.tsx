"use client";

import { useActionState, useState } from "react";
import { closeMatch, editLoanRequirement, submitRequirement, updateRequirement, type RequirementState } from "../requirements-actions";
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
"use client";

import { useActionState, useState } from "react";
import { closeMatch, editLoanRequirement, submitRequirement, updateRequirement, type RequirementState } from "../requirements-actions";
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
const choiceBase = "rounded-lg border px-3 py-2 text-sm font-semibold transition";
const bhkChoices = [{label:"1 RK",value:"0"},{label:"1 BHK",value:"1"},{label:"2 BHK",value:"2"},{label:"3 BHK",value:"3"},{label:"4 BHK",value:"4"},{label:"4+ BHK",value:"6"}];
export function MatchForm({ ready, onClose }: { ready: boolean; onClose: () => void }) {
  const [state, action, pending] = useActionState(submitRequirement.bind(null, "match"), initial);
  const [listingType, setListingType] = useState("Rental");
  const [clientType, setClientType] = useState("All");
  const [bhk, setBhk] = useState("1");
  const [furnished, setFurnished] = useState(false);
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="post-requirement-title">
    <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl sm:p-6">
      <div className="flex items-start justify-between gap-3"><div><h2 id="post-requirement-title" className="text-xl font-bold text-[#10243A] sm:text-2xl">Post Your Requirement</h2><p className="mt-1 text-sm text-slate-600">Share your property requirement to find a suitable match.</p></div><button type="button" onClick={onClose} className="rounded-lg border px-3 py-2 text-sm font-semibold" aria-label="Close form">✕</button></div>
      <form action={action} className="mt-5 space-y-5">
        <Notice ready={ready} />
        <input type="hidden" name="purpose" value={listingType === "Rental" ? "Rent" : "Buy"} />
        <input type="hidden" name="category" value="Flat" />
        <input type="hidden" name="bedrooms" value={bhk} />
        <input type="hidden" name="details" value={""} />
        <div><p className={label}>Requirement type</p><div className="mt-2 grid grid-cols-2 gap-2">{["Rental","Resale"].map((item)=><button key={item} type="button" aria-pressed={listingType===item} onClick={()=>setListingType(item)} className={choiceBase+" "+(listingType===item?"border-[#10243A] bg-[#10243A] text-white":"border-slate-300 bg-white text-slate-700")}>{item}</button>)}</div></div>
        <div><p className={label}>Client type</p><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">{["All","Family Only","Bachelors","Girls Only","Boys Only"].map((item)=><button key={item} type="button" aria-pressed={clientType===item} onClick={()=>setClientType(item)} className={choiceBase+" "+(clientType===item?"border-[#10243A] bg-[#10243A] text-white":"border-slate-300 bg-white text-slate-700")}>{item}</button>)}</div></div>
        <div><p className={label}>BHK type</p><div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">{bhkChoices.map((item)=><button key={item.value} type="button" aria-pressed={bhk===item.value} onClick={()=>setBhk(item.value)} className={choiceBase+" "+(bhk===item.value?"border-[#10243A] bg-[#10243A] text-white":"border-slate-300 bg-white text-slate-700")}>{item.label}</button>)}</div></div>
        <div><p className={label}>Furnishing</p><button type="button" aria-pressed={furnished} onClick={()=>setFurnished(!furnished)} className={choiceBase+" mt-2 "+(furnished?"border-[#10243A] bg-[#10243A] text-white":"border-slate-300 bg-white text-slate-700")}>F · Furnished only {furnished?"✓":""}</button></div>
        <div className="grid gap-3 sm:grid-cols-2"><label className={label}>Minimum budget (₹)<input name="min_budget" className={input} type="number" min="0.01" step="1" placeholder="e.g. 10000" /></label><label className={label}>Maximum budget (₹)<input name="max_budget" className={input} type="number" min="0.01" step="1" placeholder="e.g. 25000" /></label></div>
        <label className={label}>Preferred location<LocalityAutocomplete name="location" className={input} maxLength={120} placeholder="Start typing locality, e.g. Wakad" required /></label>
        <label className={label}>Notes / additional requirements<textarea name="requirement_notes" className={input} maxLength={1800} rows={3} placeholder="Any other preferences..." /></label>
        <ContactFields />
        <input type="hidden" name="client_type" value={clientType} />
        <input type="hidden" name="furnished_only" value={furnished ? "true" : "false"} />
        <Result state={state} />
        {state.status==="success" ? <button type="button" onClick={onClose} className={button}>Done</button> : <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="min-h-11 rounded-lg border border-slate-300 px-4 py-3 text-sm font-semibold">Cancel</button><button disabled={!ready||pending} className={button}>{pending?"Posting...":"Post requirement"}</button></div>}
      </form>
    </div>
  </div>;
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
