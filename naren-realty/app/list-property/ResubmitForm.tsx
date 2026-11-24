"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { createOwnerDocumentUpload, resubmitProperty, type SubmissionState } from "./actions";
import { supabase } from "../lib/supabase";
import { SUBMISSION_CATEGORIES } from "../lib/property-submission-validation";
import { validateSubmissionDetails, type SubmissionDetails } from "../lib/submission-details";
import AdditionalDetails from "./AdditionalDetails";
import LocalityAutocomplete from "../components/LocalityAutocomplete";
import { validatePropertyOwnerDetails, type PropertyOwnerDetails } from "../lib/property-submission-owner-validation";

type OwnerValues = Omit<PropertyOwnerDetails, "version">;
type Values = {
  id: string; title: string; category: string; locality: string; address: string;
  price: number; area: number; description: string; details: SubmissionDetails; owner_details?: unknown;
};

const initialState: SubmissionState = { status: "idle", message: "" };
const inputClass = "mt-1 block min-w-0 w-full max-w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-base font-normal";
const MAX_OWNER_DOCUMENTS = 5;
const MAX_OWNER_DOCUMENT_BYTES = 10 * 1024 * 1024;
const OWNER_DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

function ownerDefaults(value: unknown): { values: OwnerValues | null; invalid: boolean } {
  if (value === null || value === undefined) return { values: null, invalid: false };
  try {
    const owner = validatePropertyOwnerDetails(value);
    return { values: {
        fullName: owner.fullName,
        mobile: owner.mobile,
        email: owner.email,
        relationship: owner.relationship,
        authorizationDetails: owner.authorizationDetails,
      }, invalid: false };
  } catch {
    return { values: null, invalid: true };
  }
}

export default function ResubmitForm({ submission, available, initialOwnerDetails }: {
  submission: Values;
  available: boolean;
  initialOwnerDetails?: Partial<OwnerValues>;
}) {
  const savedOwner = ownerDefaults(submission.owner_details);
  const [category, setCategory] = useState(submission.category);
  const [details, setDetails] = useState(submission.details);
  const [owner, setOwner] = useState<OwnerValues>(() => ({
    fullName: initialOwnerDetails?.fullName ?? "",
    mobile: initialOwnerDetails?.mobile ?? "",
    email: initialOwnerDetails?.email ?? "",
    relationship: initialOwnerDetails?.relationship ?? "Owner",
    authorizationDetails: initialOwnerDetails?.authorizationDetails ?? "",
    ...savedOwner.values,
  }));
  const [ownerDetailsInvalid, setOwnerDetailsInvalid] = useState(savedOwner.invalid);
  const [ownerConfirmed, setOwnerConfirmed] = useState(false);
  const [listingDeclaration, setListingDeclaration] = useState(false);
  const [brokerageAccepted, setBrokerageAccepted] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [state, action, pending] = useActionState(async (previous: SubmissionState, data: FormData): Promise<SubmissionState> => {
    try {
      return await resubmitProperty(previous, data);
    } catch (error) {
      console.error("[property-submission] Resubmission request failed", { errorType: error instanceof Error ? error.name : typeof error });
      return { status: "error", message: "Resubmission could not be confirmed. Refresh your submissions before retrying." };
    }
  }, initialState);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try { validateSubmissionDetails(details); setDetailError(""); }
    catch (error) { setDetailError(error instanceof Error ? error.message : "Additional details are invalid."); return; }
    const data = new FormData(event.currentTarget);
    const documents = data.getAll("owner_documents");
    try {
      validatePropertyOwnerDetails({ version: 1, ...owner });
      if (!ownerConfirmed || !listingDeclaration || !brokerageAccepted) throw new Error("Confirm your authority, listing declaration and applicable brokerage terms.");
      if (documents.length < 1 || documents.length > MAX_OWNER_DOCUMENTS || documents.some((item) => !(item instanceof File) || item.size < 1 || item.size > MAX_OWNER_DOCUMENT_BYTES || !OWNER_DOCUMENT_TYPES.includes(item.type))) throw new Error("Upload between 1 and 5 valid ownership / authority documents (PDF, JPEG, PNG or WebP, up to 10 MB each).");
      data.set("brokerage_acknowledged", "on");
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : "Owner contact details are invalid.");
      return;
    }
    try {
      const manifest: { path: string; filename: string; contentType: string; size: number; sha256: string }[] = [];
      for (const document of documents as File[]) {
        const digestBuffer = await crypto.subtle.digest("SHA-256", await document.arrayBuffer());
        const digest = Array.from(new Uint8Array(digestBuffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
        const request = new FormData();
        request.set("submission_id", submission.id);
        request.set("filename", document.name);
        request.set("content_type", document.type);
        request.set("size", String(document.size));
        request.set("digest", digest);
        const signed = await createOwnerDocumentUpload(request);
        if (!signed.path || !signed.token) throw new Error(signed.error || "Could not prepare a secure ownership document upload.");
        const { error: uploadError } = await supabase.storage.from("private-property-owner-documents")
          .uploadToSignedUrl(signed.path, signed.token, document, { contentType: document.type, upsert: false });
        if (uploadError) throw new Error("Ownership document upload failed. Check your connection and try again.");
        manifest.push({ path: signed.path, filename: document.name, contentType: document.type, size: document.size, sha256: digest });
      }
      data.delete("owner_documents");
      data.set("owner_document_manifest", JSON.stringify(manifest));
      setOwnerDetailsInvalid(false);
      startTransition(() => action(data));
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : "Ownership documents could not be uploaded.");
    }
  }
  return <details className="mt-4"><summary className="min-h-11 cursor-pointer py-3 font-semibold">Edit and resubmit</summary>
    <form onSubmit={submit} className="mt-3 space-y-3">
      <input type="hidden" name="submission_id" value={submission.id} />
      <label className="block text-sm font-semibold">Title<input name="title" defaultValue={submission.title} required maxLength={120} className={inputClass} /></label>
      <label className="block text-sm font-semibold">Category<select name="category" value={category} onChange={(event) => { setCategory(event.target.value); setBrokerageAccepted(false); }} required className={inputClass}>{SUBMISSION_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
      <label className="block text-sm font-semibold">Locality<LocalityAutocomplete name="locality" defaultValue={submission.locality} required maxLength={120} className={inputClass} placeholder="Start typing locality" /></label>
      <label className="block text-sm font-semibold">Full address<textarea name="address" defaultValue={submission.address} required maxLength={500} className={inputClass} /></label>
      <label className="block text-sm font-semibold">Price (INR)<input name="price" type="number" defaultValue={submission.price} min="0.01" max="1000000000000" step="any" required className={inputClass} /></label>
      <label className="block text-sm font-semibold">Carpet area (sq. ft.)<input name="area" type="number" defaultValue={submission.area} min="0.01" max="10000000" step="any" required className={inputClass} /></label>
      <label className="block text-sm font-semibold">Description<textarea name="description" defaultValue={submission.description} required maxLength={2000} className={inputClass} /></label>
      <AdditionalDetails category={category} details={details} onChange={setDetails} />
      <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4">
        <legend className="px-1 font-bold text-[#A71930]">Owner contact and declaration</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-semibold">Owner / authorized contact name<input autoComplete="name" value={owner.fullName} onChange={(event) => { setOwnerDetailsInvalid(false); setOwner((current) => ({ ...current, fullName: event.target.value })); }} maxLength={120} className={inputClass} /></label>
          <label className="block text-sm font-semibold">Mobile number<input autoComplete="tel" type="tel" inputMode="tel" value={owner.mobile} onChange={(event) => { setOwnerDetailsInvalid(false); setOwner((current) => ({ ...current, mobile: event.target.value })); }} maxLength={24} className={inputClass} /></label>
          <label className="block text-sm font-semibold">Email address<input autoComplete="email" type="email" value={owner.email} onChange={(event) => { setOwnerDetailsInvalid(false); setOwner((current) => ({ ...current, email: event.target.value })); }} maxLength={254} className={inputClass} /></label>
          <label className="block text-sm font-semibold">Relationship to property<select value={owner.relationship} onChange={(event) => { setOwnerDetailsInvalid(false); setOwner((current) => ({ ...current, relationship: event.target.value as OwnerValues["relationship"] })); }} className={inputClass}><option>Owner</option><option>Power of Attorney</option><option>Authorized Representative</option></select></label>
        </div>
        {owner.relationship !== "Owner" && <label className="block text-sm font-semibold">Authorization details<textarea rows={3} value={owner.authorizationDetails} onChange={(event) => { setOwnerDetailsInvalid(false); setOwner((current) => ({ ...current, authorizationDetails: event.target.value })); }} maxLength={1000} className={inputClass} /></label>}
        <section className="rounded-xl border border-[#E8B5BF] bg-[#FDF5F6] p-4">
          <h3 className="font-bold text-[#A71930]">Ownership / authority documents (Required)</h3>
          <p className="mt-1 text-sm leading-6 text-slate-700">Upload at least one supporting ownership or authority document. Documents remain private and are visible only to authorised Admin reviewers.</p>
          <input type="file" name="owner_documents" multiple required accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" className="mt-3 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[#A71930] file:px-3 file:py-2 file:font-semibold file:text-white" />
          <p className="mt-2 text-xs text-slate-600">PDF / JPG / PNG / WebP · Maximum 5 files · 10 MB each</p>
        </section>
        <input type="hidden" name="owner_details" value={JSON.stringify({ version: 1, ...owner })} />
        {ownerDetailsInvalid && <p role="alert" className="text-sm text-rose-700">Saved owner contact details could not be read. Review and re-enter them before resubmitting.</p>}
        <label className="flex items-start gap-3 text-sm leading-6"><input name="owner_confirmed" type="checkbox" checked={ownerConfirmed} onChange={(event) => setOwnerConfirmed(event.target.checked)} className="mt-1 size-4 accent-[#A71930]" /><span>{category === "Resale" ? "I confirm this is a genuine resale property offered by its existing owner, that I am the owner or duly authorised representative, and that it is not builder / promoter unsold inventory or a new project sale. I can provide ownership / authority documents for Admin verification." : "I confirm that I am the owner or am authorized to list this property and that the information is accurate."}</span></label>
        <label className="flex items-start gap-3 text-sm leading-6"><input name="listing_declaration" type="checkbox" checked={listingDeclaration} onChange={(event) => setListingDeclaration(event.target.checked)} className="mt-1 size-4 accent-[#A71930]" /><span>I agree that Admin may review the submission and publish its approved details, address and photos.</span></label>
        <label className="flex items-start gap-3 rounded-lg bg-[#FDF5F6] p-3 text-sm leading-6"><input type="checkbox" checked={brokerageAccepted} onChange={(event) => setBrokerageAccepted(event.target.checked)} className="mt-1 size-4 accent-[#A71930]" /><span>{category === "Resale" ? "I acknowledge seller brokerage of 1% of the final agreed sale value if the completed transaction value is above ₹1 crore. For a transaction of ₹1 crore or below, the rate will be separately agreed in writing. Applicable GST, if any, is additional." : category === "Rental" ? "I acknowledge that no owner brokerage is payable for flat rental." : category === "PG" ? "I acknowledge that no brokerage or commission is payable by the PG / Hostel Owner." : "I acknowledge host commission of 10% of accommodation rent for each successful Airbnb / Short-Stay booking, plus applicable GST."} I accept the applicable terms.</span></label>
      </fieldset>
      {detailError && <p role="alert" className="text-sm text-rose-700">{detailError}</p>}
      <p className="text-sm text-slate-600">Existing private photos are retained; photo replacement is not available yet.</p>
      {!available && <p role="status" className="text-sm text-[#861326]">Resubmission is unavailable until private submission setup is verified. Nothing will be saved.</p>}
      {state.message && <p role={state.status === "error" ? "alert" : "status"} className="text-sm">{state.message}</p>}
      <button disabled={pending || !available || !ownerConfirmed || !listingDeclaration || !brokerageAccepted} className="min-h-11 w-full rounded-md bg-[#A71930] px-4 py-2 text-sm sm:w-auto font-semibold text-white disabled:opacity-50">{pending ? "Resubmitting..." : "Resubmit for review"}</button>
    </form>
  </details>;
}
