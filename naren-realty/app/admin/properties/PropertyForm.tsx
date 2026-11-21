"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import AdditionalDetails, { emptyDetails } from "../../list-property/AdditionalDetails";
import { categoryLabel } from "../../list-property/additional-fields";
import { SUBMISSION_CATEGORIES } from "../../lib/property-submission-validation";
import type { SubmissionDetails } from "../../lib/submission-details";
import { saveDirectProperty, type DirectState } from "./direct-actions";
import LocalityAutocomplete from "../../components/LocalityAutocomplete";

export type EditProperty = {
  id: string; title: string; category: string; locality: string; price: number;
  address: string; description: string; area: number; details: SubmissionDetails; photoCount: number; availabilityConfirmation?: "immediate" | "date";
};
const input = "mt-1 block w-full rounded-md border border-slate-400 bg-white p-3 font-normal text-slate-950";
const initialState: DirectState = { status: "idle", message: "" };

export default function PropertyForm({ property }: { property?: EditProperty }) {
  const [category, setCategory] = useState(property?.category ?? "");
  const [details, setDetails] = useState(property?.details ?? emptyDetails());
  const [state, action, pending] = useActionState(saveDirectProperty, initialState);
  if (state.status === "success") return <section className="rounded border bg-white p-4 sm:p-6"><p role="status">{state.message}</p><Link className="mt-4 inline-block underline" href="/admin/properties">Go to Property Management</Link></section>;
  return <form action={action} className="min-w-0 space-y-5 rounded-xl border bg-white p-4 text-slate-950 sm:p-6">
    {property && <input type="hidden" name="property_id" value={property.id} />}
    <p className="text-sm text-amber-900">Photos are uploaded to the public photo bucket, even before publishing. Enter only information and photos intended for public display; do not include private contact details.</p>
    <div className="grid min-w-0 gap-4 sm:grid-cols-2">
      <label className="font-semibold">Category<select name="category" value={category} onChange={(event) => setCategory(event.target.value)} required className={input}><option value="">Select category</option>{SUBMISSION_CATEGORIES.map((item) => <option value={item} key={item}>{categoryLabel(item)}</option>)}</select></label>
      <label className="font-semibold">Property title<input name="title" defaultValue={property?.title} maxLength={120} required className={input} /></label>
      <label className="font-semibold">Locality<LocalityAutocomplete name="locality" defaultValue={property?.locality} maxLength={120} required className={input} placeholder="Start typing locality" /></label>
      <label className="font-semibold">Price (INR)<input name="price" type="number" step="any" min="0.01" max="1000000000000" defaultValue={property?.price} required className={input} /></label>
      <label className="font-semibold">Carpet area (sq. ft.)<input name="area" type="number" step="any" min="0.01" max="10000000" defaultValue={property?.area} required className={input} /></label>
      <label className="font-semibold sm:col-span-2">Public address<textarea name="address" defaultValue={property?.address} maxLength={500} required className={input} /></label>
      <label className="font-semibold sm:col-span-2">Description<textarea name="description" defaultValue={property?.description} maxLength={2000} required rows={4} className={input} /></label>
    </div>
    <AdditionalDetails category={category} details={details} onChange={setDetails} />
    <label className="block font-semibold">Verified availability
      <select name="availability_confirmation" defaultValue={property?.availabilityConfirmation ?? ""} className={input}>
        <option value="">Not verified / unknown</option>
        <option value="immediate">Available immediately</option>
        <option value="date">Available from the date entered above</option>
      </select>
      <span className="mt-1 block text-sm font-normal text-slate-600">Confirm only after verifying availability and update it when it changes. For a date, fill in Available from above. Immediate availability cannot have a future date. Rental and short-stay deposits are entered above; PG deposits are entered per sharing option.</span>
    </label>
    <label className="block font-semibold">Property photos<input name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple required={!property} className={input} /></label>
    <p className="text-sm text-slate-600">1–5 photos total, each up to 5 MB. {property ? `${property.photoCount} existing photos will be retained.` : ""}</p>
    {state.message && <p role="alert" className="text-rose-700">{state.message}</p>}
    <button disabled={pending} className="rounded bg-[#10243A] px-5 py-3 font-semibold text-white disabled:opacity-50">{pending ? "Saving..." : property ? "Save changes" : "Save property"}</button>
  </form>;
}
