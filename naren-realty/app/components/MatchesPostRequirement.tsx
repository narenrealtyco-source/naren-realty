"use client";

import { useActionState, useMemo, useState } from "react";
import { PUNE_LOCALITIES } from "../lib/properties";
import { submitRequirement, type RequirementState } from "../requirements-actions";

const initial: RequirementState = { status: "idle", message: "" };
const input = "mt-1 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-3 text-base text-slate-800 outline-none focus:border-[#FBBF24] focus:ring-2 focus:ring-[#FBBF24]/30";
const label = "block text-sm font-semibold text-[#263238]";
const options = "min-h-10 rounded-full border px-4 py-2 text-sm font-semibold transition-colors";
function Chips({ name, values, value, onChange }: { name: string; values: string[]; value: string; onChange: (v: string) => void }) {
  return <div className="flex flex-wrap gap-2">{values.map((item) => <button key={item} type="button" aria-pressed={value === item} onClick={() => onChange(item)} className={`${options} ${value === item ? "border-[#FBBF24] bg-[#FBBF24] text-[#10243A] shadow-sm" : "border-slate-300 bg-white text-[#10243A] hover:bg-amber-50"}`}>{item}</button>)}<input type="hidden" name={name} value={value} /></div>;
}
function MultiLocationSelect() {
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const choices = useMemo(() => PUNE_LOCALITIES.filter((place) => place.toLowerCase().includes(query.trim().toLowerCase()) && !selected.includes(place)).slice(0, 8), [query, selected]);
  const toggle = (place: string) => setSelected((current) => current.includes(place) ? current.filter((item) => item !== place) : [...current, place]);
  return <div className="mt-1">
    <input className={input} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search and add multiple areas, e.g. Baner, Wakad" autoComplete="off" aria-label="Search localities" />
    {query.trim() && <div className="mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm">{choices.length ? choices.map((place) => <button key={place} type="button" onClick={() => { toggle(place); setQuery(""); }} className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-amber-50">＋ {place}</button>) : <p className="px-3 py-2 text-sm text-slate-500">No more matching localities.</p>}</div>}
    {selected.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{selected.map((place) => <button key={place} type="button" onClick={() => toggle(place)} className="rounded-full border border-[#FBBF24] bg-[#FBBF24] px-3 py-1.5 text-xs font-semibold text-[#10243A]">{place} ×</button>)}</div>}
    <input type="hidden" name="location" value={selected.join(", ")} />
    <p className="mt-1 text-xs text-slate-500">Select one or more locations. Tap a selected area to remove it.</p>
  </div>;
}
export default function MatchesPostRequirement({ ready }: { ready: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(submitRequirement.bind(null, "match"), initial);
  const [purpose, setPurpose] = useState("Rent");
  const [client, setClient] = useState("All");
  const [bhk, setBhk] = useState("Any");
  const [furnishing, setFurnishing] = useState("Any");
  const [brokerageAccepted, setBrokerageAccepted] = useState(false);
  return <div className="relative">
    <button type="button" onClick={() => setOpen(!open)} className="rounded-xl border border-[#FBBF24] bg-[#FBBF24] px-5 py-3 text-sm font-bold text-[#10243A] shadow-sm hover:bg-amber-300">{open ? "Close" : "＋ Post Your Requirement"}</button>
    {open && <form action={action} className="mt-4 space-y-5 rounded-2xl border border-slate-300 bg-white p-4 shadow-sm sm:p-6">
      <div><h2 className="text-xl font-bold text-[#10243A]">Post Your Requirement</h2><p className="mt-1 text-sm text-slate-500">Choose your preferences to find matching properties.</p></div>
      <div><p className={label}>Requirement Type</p><div className="mt-2"><Chips name="purpose" values={["Rent","Buy"]} value={purpose} onChange={(value) => { setPurpose(value); setBrokerageAccepted(false); }} /></div></div>
      <div><p className={label}>Client Type</p><div className="mt-2"><Chips name="client_type" values={["All","Family Only","Bachelors","Girls Only","Boys Only"]} value={client} onChange={setClient} /></div><p className="mt-2 text-xs text-slate-500">Matching follows the selected client preference.</p></div>
      <div><p className={label}>BHK Type</p><div className="mt-2"><Chips name="bhk_choice" values={["Any","1 RK","1 BHK","2 BHK","3 BHK","4 BHK","4+ BHK"]} value={bhk} onChange={setBhk} /></div><input type="hidden" name="bedrooms" value={bhk === "Any" ? "" : bhk === "1 RK" ? "1" : bhk === "4+ BHK" ? "5" : String(Number.parseInt(bhk, 10))} /></div>
      <div><p className={label}>Furnishing</p><div className="mt-2"><Chips name="furnishing_choice" values={["Any","Fully Furnished","Semi Furnished","Unfurnished"]} value={furnishing} onChange={setFurnishing} /></div></div>
      <div className="grid gap-3 sm:grid-cols-2"><label className={label}>Minimum Budget (₹)<input name="min_budget" className={input} type="number" min="0" step="1" placeholder="Minimum budget" /></label><label className={label}>Maximum Budget (₹)<input name="max_budget" className={input} type="number" min="0" step="1" placeholder="Maximum budget" /></label></div>
      <div><p className={label}>Location</p><MultiLocationSelect /></div>
      <label className={label}>Notes<textarea name="notes" className={input} maxLength={1800} rows={3} placeholder="Any other preference..." /></label>
      <label className={label}>Your Name<input name="customer_name" className={input} maxLength={120} autoComplete="name" required /></label>
      <label className={label}>Mobile Number<input name="phone" className={input} type="tel" maxLength={13} autoComplete="tel" required /></label>
      <input type="hidden" name="category" value="Flat" />
      <input type="hidden" name="move_in_date" value="" />
      <input type="hidden" name="details" value="" />
      <p className="text-xs text-slate-500">Client type and furnishing preferences are included with your notes.</p>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-slate-800"><input type="checkbox" name="brokerage_acknowledged" checked={brokerageAccepted} onChange={(event) => setBrokerageAccepted(event.target.checked)} required className="mt-1 size-4 shrink-0 accent-[#10243A]" /><span>{purpose === "Buy" ? "I acknowledge buyer brokerage of 2% of the final sale value, plus applicable GST." : "I acknowledge tenant brokerage equal to one month’s rent, plus applicable GST."} I have read and accept the applicable terms.</span></label>
      {state.message && <p role={state.status === "error" ? "alert" : "status"} className="text-sm">{state.message}</p>}
      <button disabled={!ready || pending || state.status === "success" || !brokerageAccepted} className="w-full rounded-xl bg-[#FBBF24] px-5 py-3.5 font-bold text-[#10243A] shadow-sm hover:bg-amber-300 disabled:opacity-50">{pending ? "Submitting..." : "Post Requirement"}</button>
    </form>}
  </div>;
}
