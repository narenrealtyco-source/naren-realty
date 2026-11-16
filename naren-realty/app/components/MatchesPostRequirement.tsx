"use client";

import { useActionState, useState } from "react";
import { submitRequirement, type RequirementState } from "../requirements-actions";
import LocalityAutocomplete from "./LocalityAutocomplete";

const initial: RequirementState = { status: "idle", message: "" };
const input = "mt-1 w-full min-w-0 rounded-xl border border-[#D8C39A] bg-white px-3 py-3 text-base text-slate-800 outline-none focus:border-[#B88A3B] focus:ring-2 focus:ring-[#D8C39A]/40";
const label = "block text-sm font-semibold text-[#263238]";
const options = "min-h-10 rounded-full border px-4 py-2 text-sm font-semibold transition-colors";
function Chips({ name, values, value, onChange }: { name: string; values: string[]; value: string; onChange: (v: string) => void }) {
  return <div className="flex flex-wrap gap-2">{values.map((item) => <button key={item} type="button" aria-pressed={value === item} onClick={() => onChange(item)} className={`${options} ${value === item ? "border-[#B88A3B] bg-[#B88A3B] text-white shadow-sm" : "border-[#D8C39A] bg-white text-[#59482C] hover:bg-[#FBF7EF]"}`}>{item}</button>)}<input type="hidden" name={name} value={value} /></div>;
}
export default function MatchesPostRequirement({ ready }: { ready: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(submitRequirement.bind(null, "match"), initial);
  const [purpose, setPurpose] = useState("Rent");
  const [client, setClient] = useState("All");
  const [bhk, setBhk] = useState("Any");
  const [furnishing, setFurnishing] = useState("Any");
  return <div className="relative">
    <button type="button" onClick={() => setOpen(!open)} className="rounded-xl border border-[#B88A3B] bg-[#B88A3B] px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#A8792E]">{open ? "Close" : "＋ Post Your Requirement"}</button>
    {open && <form action={action} className="mt-4 space-y-5 rounded-2xl border border-[#D8C39A] bg-white p-4 shadow-sm sm:p-6">
      <div><h2 className="text-xl font-bold text-[#7A5A27]">Post Your Requirement</h2><p className="mt-1 text-sm text-slate-500">Choose your preferences to find matching properties.</p></div>
      <div><p className={label}>Requirement Type</p><div className="mt-2"><Chips name="purpose" values={["Rent","Buy"]} value={purpose} onChange={setPurpose} /></div></div>
      <div><p className={label}>Client Type</p><div className="mt-2"><Chips name="client_type" values={["All","Family Only","Bachelors","Girls Only","Boys Only"]} value={client} onChange={setClient} /></div><p className="mt-2 text-xs text-slate-500">Matching follows the selected client preference.</p></div>
      <div><p className={label}>BHK Type</p><div className="mt-2"><Chips name="bhk_choice" values={["Any","1 RK","1 BHK","2 BHK","3 BHK","4 BHK","4+ BHK"]} value={bhk} onChange={setBhk} /></div><input type="hidden" name="bedrooms" value={bhk === "Any" ? "" : bhk === "1 RK" ? "0" : bhk === "4+ BHK" ? "5" : String(Number.parseInt(bhk, 10))} /></div>
      <div><p className={label}>Furnishing</p><div className="mt-2"><Chips name="furnishing_choice" values={["Any","Fully Furnished","Semi Furnished","Unfurnished"]} value={furnishing} onChange={setFurnishing} /></div></div>
      <div className="grid gap-3 sm:grid-cols-2"><label className={label}>Minimum Budget (₹)<input name="min_budget" className={input} type="number" min="0" step="1" placeholder="Minimum budget" /></label><label className={label}>Maximum Budget (₹)<input name="max_budget" className={input} type="number" min="0" step="1" placeholder="Maximum budget" /></label></div>
      <label className={label}>Location<LocalityAutocomplete name="location" className={input} maxLength={120} placeholder="Search locality, e.g. Baner" required /></label>
      <label className={label}>Notes<textarea name="notes" className={input} maxLength={1800} rows={3} placeholder="Any other preference..." /></label>
      <label className={label}>Your Name<input name="customer_name" className={input} maxLength={120} autoComplete="name" required /></label>
      <label className={label}>Mobile Number<input name="phone" className={input} type="tel" maxLength={13} autoComplete="tel" required /></label>
      <input type="hidden" name="category" value="Flat" />
      <input type="hidden" name="move_in_date" value="" />
      <input type="hidden" name="details" value="" />
      <p className="text-xs text-slate-500">Client type and furnishing preferences are included with your notes.</p>
      {state.message && <p role={state.status === "error" ? "alert" : "status"} className="text-sm">{state.message}</p>}
      <button disabled={!ready || pending || state.status === "success"} className="w-full rounded-xl bg-[#B88A3B] px-5 py-3.5 font-bold text-white shadow-sm hover:bg-[#A8792E] disabled:opacity-50">{pending ? "Submitting..." : "Post Requirement"}</button>
    </form>}
  </div>;
}
