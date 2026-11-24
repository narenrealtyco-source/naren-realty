"use client";

import Image from "next/image";
import { startTransition, useActionState, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { createPropertyVideoUpload, submitProperty, type SubmissionState } from "./actions";
import { supabase } from "../lib/supabase";
import {
  MAX_SUBMISSION_PHOTO_BYTES,
  MAX_SUBMISSION_VIDEO_BYTES,
  MAX_SUBMISSION_PHOTOS,
  SUBMISSION_CATEGORIES,
  validatePropertySubmission,
  validateSubmissionPhotoCount,
} from "../lib/property-submission-validation";
import { categoryLabel } from "./additional-fields";
import AdditionalDetails, { emptyDetails } from "./AdditionalDetails";
import { validateSubmissionDetails, type SubmissionDetails } from "../lib/submission-details";
import type { ListingType } from "../lib/properties";
import { validatePropertyOwnerDetails, type PropertyOwnerDetails } from "../lib/property-submission-owner-validation";
import {
  deletePropertySubmissionDraft,
  loadPropertySubmissionDraft,
  savePropertySubmissionDraft,
  type DraftActionState,
  type DraftPayload,
} from "./draft-actions";
import SavedDetails from "./SavedDetails";
import LocalityAutocomplete from "../components/LocalityAutocomplete";

type FormValues = {
  title: string;
  locality: string;
  address: string;
  price: string;
  area: string;
  description: string;
};
type OwnerValues = Omit<PropertyOwnerDetails, "version">;
type PhotoItem = { id: string; file: File; url: string };
type VideoItem = { file: File; url: string };
type OwnerDocumentItem = { id: string; file: File };
const MAX_OWNER_DOCUMENTS = 5;
const MAX_OWNER_DOCUMENT_BYTES = 10 * 1024 * 1024;
const OWNER_DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const initialState: SubmissionState = { status: "idle", message: "" };
const inputClass = "mt-2 block min-w-0 w-full max-w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-normal text-slate-950 shadow-sm placeholder:text-slate-500 focus:border-[#A71930] focus:outline-none focus:ring-2 focus:ring-[#A71930]/20";
const labelClass = "block min-w-0 text-sm font-semibold text-slate-900";
const STEPS = [
  "Category",
  "Property basics",
  "Location",
  "Pricing",
  "Facilities",
  "Photos & preview",
  "Owner & submit",
];
const EMPTY_VALUES: FormValues = { title: "", locality: "", address: "", price: "", area: "", description: "" };
const EMPTY_OWNER: OwnerValues = { fullName: "", mobile: "", email: "", relationship: "Owner", authorizationDetails: "" };
const OWNER_RELATIONSHIPS: OwnerValues["relationship"][] = ["Owner", "Power of Attorney", "Authorized Representative"];

function priceLabel(category: string): string {
  if (category === "Rental") return "Monthly rent";
  if (category === "Resale") return "Expected sale price";
  if (category === "Airbnb") return "Price per night";
  if (category === "PG") return "Price per person";
  return "Price";
}

function CategoryIcon({ category }: { category: string }) {
  const paths: Record<string, string> = {
    Rental: "M3 10.5 12 3l9 7.5M5.5 9v11h13V9M9 20v-6h6v6",
    Resale: "M3 20h18M5 20V8l7-4 7 4v12M9 10h1m4 0h1m-6 4h1m4 0h1",
    PG: "M4 20V8l8-5 8 5v12M8 20v-5h8v5M9 9h.01M15 9h.01",
    Airbnb: "M12 3 4 7v5c0 4.5 3.2 7.6 8 9 4.8-1.4 8-4.5 8-9V7l-8-4ZM9 12h6",
  };
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-7">
    <path d={paths[category] ?? paths.Rental} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}

function initialOwnerValues(details?: Partial<OwnerValues>): OwnerValues {
  return {
    fullName: details?.fullName ?? "",
    mobile: details?.mobile ?? "",
    email: details?.email ?? "",
    relationship: details?.relationship ?? "Owner",
    authorizationDetails: details?.authorizationDetails ?? "",
  };
}

function StepIcon({ index, active, complete }: { index: number; active: boolean; complete: boolean }) {
  return <span className={`flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${active
    ? "border-[#A71930] bg-[#A71930] text-white"
    : complete ? "border-[#A71930] bg-[#F8E9EC] text-[#A71930]" : "border-slate-300 bg-white text-slate-500"}`}>
    {complete ? <svg viewBox="0 0 20 20" fill="none" className="size-4"><path d="m4 10 4 4 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg> : index + 1}
  </span>;
}

export default function SubmissionForm({
  available,
  draftsAvailable = false,
  unavailableMessage,
  initialOwnerDetails,
}: {
  available: boolean;
  draftsAvailable?: boolean;
  unavailableMessage?: string;
  initialOwnerDetails?: Partial<OwnerValues>;
}) {
  const attemptId = useRef<string | null>(null);
  const photoUrls = useRef<string[]>([]);
  const videoUrl = useRef<string | null>(null);
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState("");
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [details, setDetails] = useState<SubmissionDetails>(emptyDetails);
  const [owner, setOwner] = useState<OwnerValues>(() => initialOwnerValues(initialOwnerDetails));
  const [ownerConfirmed, setOwnerConfirmed] = useState(false);
  const [listingDeclaration, setListingDeclaration] = useState(false);
  const [brokerageAccepted, setBrokerageAccepted] = useState(false);
  const [photoItems, setPhotoItems] = useState<PhotoItem[]>([]);
  const [videoItem, setVideoItem] = useState<VideoItem | null>(null);
  const [ownerDocuments, setOwnerDocuments] = useState<OwnerDocumentItem[]>([]);
  const [videoUploading, setVideoUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [stepError, setStepError] = useState("");
  const [draft, setDraft] = useState<DraftActionState | null>(null);
  const [draftMessage, setDraftMessage] = useState("");
  const [draftPending, setDraftPending] = useState(false);
  const [draftLoading, setDraftLoading] = useState(draftsAvailable);
  const [state, action, pending] = useActionState(async (previous: SubmissionState, data: FormData): Promise<SubmissionState> => {
    try {
      const result = await submitProperty(previous, data);
      if (result.status === "success") {
        photoItems.forEach((item) => URL.revokeObjectURL(item.url));
        if (videoUrl.current) URL.revokeObjectURL(videoUrl.current);
        videoUrl.current = null;
        setVideoItem(null);
        photoUrls.current = [];
        setPhotoItems([]);
        setCategory("");
        setValues(EMPTY_VALUES);
        setDetails(emptyDetails());
        setStep(0);
        setOwner(initialOwnerValues(initialOwnerDetails));
        setOwnerConfirmed(false);
        setListingDeclaration(false);
        setBrokerageAccepted(false);
        setOwnerDocuments([]);
        attemptId.current = null;
        if (draftsAvailable && draft?.payload) {
          const deletion = await deletePropertySubmissionDraft();
          if (deletion.status === "error") setDraftMessage(deletion.message);
          else setDraft(null);
        }
      }
      return result;
    } catch (error) {
      console.error("[property-submission] Request failed", error);
      return { status: "error", message: "The submission could not be confirmed. Check your submissions before retrying." };
    }
  }, initialState);

  useEffect(() => {
    if (!draftsAvailable) return;
    let active = true;
    loadPropertySubmissionDraft().then((result) => {
      if (active) {
        setDraft(result.status === "loaded" ? result : null);
        if (result.status === "error") setDraftMessage(result.message);
      }
    }).catch((error: unknown) => {
      console.error("[property-submission] Draft lookup request failed", error);
      if (active) setDraftMessage("Your saved draft could not be loaded. Please try again.");
    }).finally(() => {
      if (active) setDraftLoading(false);
    });
    return () => { active = false; };
  }, [draftsAvailable]);

  useEffect(() => () => {
    photoUrls.current.forEach((url) => URL.revokeObjectURL(url));
    if (videoUrl.current) URL.revokeObjectURL(videoUrl.current);
  }, []);

  function setField<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setStepError("");
  }

  function setOwnerField<K extends keyof OwnerValues>(key: K, value: OwnerValues[K]) {
    setOwner((current) => ({ ...current, [key]: value }));
    setStepError("");
  }

  function requireCurrentStep(): boolean {
    try {
      if (step === 0 && !SUBMISSION_CATEGORIES.some((candidate) => candidate === category)) {
        throw new Error("Choose a property category to continue.");
      }
      if (step === 1) {
        validatePropertySubmission({
          title: values.title,
          category,
          locality: "Required location",
          address: "Required address",
          price: 1,
          area: Number(values.area),
          description: values.description,
        });
      }
      if (step === 2) {
        validatePropertySubmission({
          title: values.title,
          category,
          locality: values.locality,
          address: values.address,
          price: 1,
          area: Number(values.area),
          description: values.description,
        });
      }
      if (step === 3) {
        const price = Number(values.price);
        if (!Number.isFinite(price) || price <= 0 || price > 1_000_000_000_000) throw new Error(`Enter a valid ${priceLabel(category).toLowerCase()}.`);
        validateSubmissionDetails(details);
      }
      if (step === 4) validateSubmissionDetails(details);
      if (step === 5) {
        validateSubmissionPhotoCount(photoItems.length);
        if (photoItems.some(({ file }) => file.size === 0 || file.size > MAX_SUBMISSION_PHOTO_BYTES ||
          !["image/jpeg", "image/png", "image/webp"].includes(file.type))) {
          throw new Error("Choose JPEG, PNG or WebP photos, each up to 5 MB.");
        }
        validatePropertySubmission({
          title: values.title, category, locality: values.locality, address: values.address,
          price: Number(values.price), area: Number(values.area), description: values.description,
        });
      }
      setStepError("");
      return true;
    } catch (error) {
      setStepError(error instanceof Error ? error.message : "Complete the required fields to continue.");
      return false;
    }
  }

  function nextStep() {
    if (requireCurrentStep()) setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  function selectFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    if (photoItems.length + files.length > MAX_SUBMISSION_PHOTOS) {
      setPhotoError(`You can upload a maximum of ${MAX_SUBMISSION_PHOTOS} photos.`);
      return;
    }
    const invalid = files.find((file) => file.size === 0 || file.size > MAX_SUBMISSION_PHOTO_BYTES ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type));
    if (invalid) {
      setPhotoError("Choose JPEG, PNG or WebP photos, each up to 5 MB.");
      return;
    }
    const added = files.map((file) => {
      const url = URL.createObjectURL(file);
      photoUrls.current.push(url);
      return { id: crypto.randomUUID(), file, url };
    });
    setPhotoItems((current) => [...current, ...added]);
    setPhotoError("");
    setStepError("");
  }


  function selectOwnerDocuments(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    if (ownerDocuments.length + files.length > MAX_OWNER_DOCUMENTS) { setStepError("Upload up to 5 ownership / authority documents."); return; }
    if (files.some((file) => file.size < 1 || file.size > MAX_OWNER_DOCUMENT_BYTES || !OWNER_DOCUMENT_TYPES.includes(file.type))) { setStepError("Choose PDF, JPEG, PNG or WebP documents, each up to 10 MB."); return; }
    setOwnerDocuments((current) => [...current, ...files.map((file) => ({ id: crypto.randomUUID(), file }))]);
    setStepError("");
  }

  function selectVideo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0] ?? null;
    event.currentTarget.value = "";
    if (!file) return;
    if (file.type !== "video/mp4" || !file.name.toLowerCase().endsWith(".mp4") || file.size < 12 || file.size > MAX_SUBMISSION_VIDEO_BYTES) {
      setPhotoError("Choose one MP4 video up to 50 MB.");
      return;
    }
    void file.slice(4, 8).text().then((brand) => {
      if (brand !== "ftyp") { setPhotoError("This file is not a valid MP4 video."); return; }
      if (videoUrl.current) URL.revokeObjectURL(videoUrl.current);
      const url = URL.createObjectURL(file);
      videoUrl.current = url;
      setVideoItem({ file, url });
      setPhotoError("");
      setStepError("");
    });
  }

  function removeVideo() {
    if (videoUrl.current) URL.revokeObjectURL(videoUrl.current);
    videoUrl.current = null;
    setVideoItem(null);
  }

  function removePhoto(id: string) {
    const removed = photoItems.find((photo) => photo.id === id);
    if (removed) {
      URL.revokeObjectURL(removed.url);
      photoUrls.current = photoUrls.current.filter((url) => url !== removed.url);
    }
    setPhotoItems((current) => current.filter((photo) => photo.id !== id));
  }

  function reorderPhoto(index: number, target: number) {
    setPhotoItems((current) => {
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  }

  function buildDraft(): DraftPayload {
    return {
      version: 1,
      step: step + 1,
      category,
      values,
      details,
      ownerDetails: owner,
    };
  }

  async function saveDraft() {
    if (!draftsAvailable) return;
    setDraftPending(true);
    setDraftMessage("");
    try {
      const result = await savePropertySubmissionDraft(buildDraft());
      setDraftMessage(result.message);
      if (result.status === "saved") setDraft({ ...result, payload: buildDraft() });
    } catch (error) {
      console.error("[property-submission] Draft save request failed", error);
      setDraftMessage("Your draft could not be saved. Please try again.");
    } finally {
      setDraftPending(false);
    }
  }

  function restoreDraft() {
    if (!draft?.payload) return;
    setCategory(draft.payload.category);
    setValues(draft.payload.values);
    setDetails(draft.payload.details);
    const relationship = OWNER_RELATIONSHIPS.find((item) => item === draft.payload?.ownerDetails.relationship) ?? "Owner";
    setOwner({ ...EMPTY_OWNER, ...draft.payload.ownerDetails, relationship });
    setStep(Math.min(draft.payload.step - 1, STEPS.length - 1));
    setOwnerConfirmed(false);
    setListingDeclaration(false);
    setBrokerageAccepted(false);
    setOwnerDocuments([]);
    setDraftMessage("Draft restored. Select your photos and ownership / authority documents again; files are not stored in drafts.");
    setStepError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step !== STEPS.length - 1) return;
    try {
      const validated = validatePropertySubmission({
        title: values.title, category, locality: values.locality, address: values.address,
        price: Number(values.price), area: Number(values.area), description: values.description,
      });
      const validatedDetails = validateSubmissionDetails(details);
      const validatedOwner = validatePropertyOwnerDetails({ version: 1, ...owner });
      validateSubmissionPhotoCount(photoItems.length);
      if (ownerDocuments.length < 1 || ownerDocuments.length > MAX_OWNER_DOCUMENTS || ownerDocuments.some(({file}) => file.size < 1 || file.size > MAX_OWNER_DOCUMENT_BYTES || !OWNER_DOCUMENT_TYPES.includes(file.type))) throw new Error("Upload at least one valid ownership / authority document (PDF, JPEG, PNG or WebP, up to 10 MB each).");
      if (!ownerConfirmed || !listingDeclaration || !brokerageAccepted) throw new Error("Confirm your authority, listing declaration and applicable brokerage terms.");
      if (photoItems.some(({ file }) => file.size === 0 || file.size > MAX_SUBMISSION_PHOTO_BYTES ||
        !["image/jpeg", "image/png", "image/webp"].includes(file.type))) {
        throw new Error("Choose JPEG, PNG or WebP photos, each up to 5 MB.");
      }
      const data = new FormData();
      for (const [key, value] of Object.entries(validated)) data.set(key, String(value));
      data.set("details", JSON.stringify(validatedDetails));
      data.set("owner_details", JSON.stringify(validatedOwner));
      data.set("owner_confirmed", "on");
      data.set("listing_declaration", "on");
      data.set("brokerage_acknowledged", "on");

      for (const photo of photoItems) data.append("photos", photo.file);
      for (const document of ownerDocuments) data.append("owner_documents", document.file);
      if (!attemptId.current) attemptId.current = crypto.randomUUID();
      data.set("submission_id", attemptId.current);
      if (videoItem) {
        setVideoUploading(true);
        const digestBuffer = await crypto.subtle.digest("SHA-256", await videoItem.file.arrayBuffer());
        const digest = Array.from(new Uint8Array(digestBuffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
        const uploadRequest = new FormData();
        uploadRequest.set("submission_id", attemptId.current);
        uploadRequest.set("digest", digest);
        const signed = await createPropertyVideoUpload(uploadRequest);
        if (!signed.path || !signed.token) throw new Error(signed.error || "Could not prepare the video upload.");
        const { error: uploadError } = await supabase.storage.from("private-property-submissions").uploadToSignedUrl(signed.path, signed.token, videoItem.file, { contentType: "video/mp4", upsert: true });
        if (uploadError) throw new Error("Video upload failed. Check your connection and try again.");
        data.set("video_path", signed.path);
        data.set("video_size", String(videoItem.file.size));
        data.set("video_digest", digest);
      }
      setStepError("");
      startTransition(() => action(data));
    } catch (error) {
      setStepError(error instanceof Error ? error.message : "Review the required details before submitting.");
    } finally {
      setVideoUploading(false);
    }
  }

  const displayPrice = Number(values.price);
  return <form onSubmit={handleSubmit} noValidate className="min-w-0 rounded-2xl border border-slate-200 bg-white text-slate-950 shadow-[0_16px_50px_-36px_rgba(16,36,58,0.55)] [overflow-wrap:anywhere]">
    <div className="rounded-t-2xl bg-[#A71930] px-4 py-5 text-white sm:px-7">
      <p className="text-xs font-bold tracking-[0.16em] text-[#F8E9EC]">NAREN REALTY · CUSTOMER LISTINGS</p>
      <h2 className="mt-2 text-2xl font-bold sm:text-3xl">List your property</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200">A guided, secure submission. Your property, photos and optional video stay private while Admin reviews your listing.</p>
    </div>

    <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-3 py-3 backdrop-blur sm:px-6">
      <ol aria-label="Submission progress" className="flex min-w-0 items-start gap-1 overflow-x-auto pb-1">
        {STEPS.map((title, index) => <li key={title} aria-current={index === step ? "step" : undefined} className="flex min-w-[72px] flex-1 flex-col items-center gap-1.5 text-center sm:min-w-0">
          <StepIcon index={index} active={index === step} complete={index < step} />
          <span className={`max-w-24 text-[10px] font-semibold leading-3 sm:text-xs ${index === step ? "text-[#A71930]" : "text-slate-500"}`}>{title}</span>
        </li>)}
      </ol>
    </div>

    <div className="space-y-6 p-4 pb-8 sm:p-7">
      {draftLoading && <p role="status" className="text-sm text-slate-600">Checking for a saved draft…</p>}
      {draft?.payload && <section className="flex flex-col gap-3 rounded-xl border border-[#E8B5BF] bg-[#FDF5F6] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h3 className="font-bold text-[#A71930]">A saved draft is available</h3><p className="mt-1 text-sm text-slate-700">Restore your saved form data and continue where you left off.</p></div>
        <button type="button" onClick={restoreDraft} className="min-h-11 shrink-0 rounded-lg border border-[#A71930] px-4 text-sm font-bold text-[#A71930] hover:bg-white">Restore draft</button>
      </section>}
      {draftMessage && <p role={draftMessage.includes("could not") ? "alert" : "status"} className="text-sm text-slate-700">{draftMessage}</p>}

      <section aria-labelledby="step-title" className="min-h-72">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#861326]">Step {step + 1} of {STEPS.length}</p>
          <h3 id="step-title" className="mt-1 text-xl font-bold text-[#A71930] sm:text-2xl">{STEPS[step]}</h3>
        </div>

        {step === 0 && <fieldset className="min-w-0">
          <legend className="text-sm font-semibold text-slate-800">What type of property are you listing?</legend>
          <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
            {SUBMISSION_CATEGORIES.map((item) => <button key={item} type="button" aria-pressed={category === item} onClick={() => { setCategory(item); setBrokerageAccepted(false); setStepError(""); }}
              className={`flex min-h-24 min-w-0 items-center gap-4 rounded-2xl border p-4 text-left transition-colors ${category === item
                ? "border-[#A71930] bg-[#FDF5F6] ring-2 ring-[#A71930]/20"
                : "border-slate-200 bg-white hover:border-[#A71930] hover:bg-[#FDF5F6]/50"}`}>
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#A71930] text-[#F8E9EC]"><CategoryIcon category={item} /></span>
              <span className="min-w-0"><span className="block font-bold text-[#A71930]">{categoryLabel(item)}</span><span className="mt-1 block text-xs leading-5 text-slate-600">{item === "Rental" ? "Long-term home rental" : item === "Resale" ? "Property for sale" : item === "PG" ? "PG / hostel accommodation" : "Short-stay accommodation"}</span></span>
              {category === item && <span className="ml-auto shrink-0 text-[#A71930]" aria-hidden="true">✓</span>}
            </button>)}
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-600">PG and Hostel listings use the existing PG category.</p>
        </fieldset>}

        {step === 1 && <div className="space-y-4">
          <label className={labelClass}>{category === "PG" ? "PG / Hostel name" : "Property title"}
            <input autoComplete="off" maxLength={120} value={values.title} onChange={(event) => setField("title", event.target.value)} placeholder="e.g. Spacious apartment near the park" className={inputClass} />
          </label>
          <label className={labelClass}>Property description
            <textarea rows={4} maxLength={2000} value={values.description} onChange={(event) => setField("description", event.target.value)} placeholder="Describe the property and what makes it suitable for a tenant, buyer or guest." className={inputClass} />
          </label>
          <label className={labelClass}>Carpet / usable area (sq. ft.)
            <input type="number" min="0.01" max="10000000" step="any" value={values.area} onChange={(event) => setField("area", event.target.value)} placeholder="Enter area" className={inputClass} />
          </label>
          <AdditionalDetails category={category} details={details} onChange={setDetails} section="basic" />
        </div>}

        {step === 2 && <div className="space-y-4">
          <label className={labelClass}>Locality
            <LocalityAutocomplete autoComplete="off" maxLength={120} value={values.locality} onChange={(event) => setField("locality", event.target.value)} placeholder="Type a Pune locality, e.g. Wakad" className={inputClass} />
          </label>
          <label className={labelClass}>Full property address
            <textarea autoComplete="street-address" rows={3} maxLength={500} value={values.address} onChange={(event) => setField("address", event.target.value)} placeholder="Street, building and address details" className={inputClass} />
          </label>
          <AdditionalDetails category={category} details={details} onChange={setDetails} section="location" />
          <p className="rounded-xl bg-[#F4F1EF] p-3 text-xs leading-5 text-slate-600">The full address is visible on the public listing after approval. Do not enter private details that you do not want published.</p>
        </div>}

        {step === 3 && <div className="space-y-5">
          <label className={labelClass}>{priceLabel(category)} (INR)
            <span className="relative mt-2 block"><span aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-slate-500">₹</span><input type="number" min="0.01" max="1000000000000" step="any" value={values.price} onChange={(event) => setField("price", event.target.value)} placeholder="Enter amount" className={`${inputClass} pl-9 text-lg font-bold`} /></span>
          </label>
          <AdditionalDetails category={category} details={details} onChange={setDetails} section="pricing" />
        </div>}

        {step === 4 && <div className="space-y-5">
          <p className="text-sm leading-6 text-slate-600">Select only the furnishing, Wi-Fi, amenities and services available at this property. These details will be visible after approval.</p>
          <AdditionalDetails category={category} details={details} onChange={setDetails} section="facilities" />
        </div>}

        {step === 5 && <div className="space-y-6">
          <section className="space-y-3">
            <div><h4 className="font-semibold text-slate-900">Property photos</h4><p className="mt-1 text-sm text-slate-600">Add 1–5 clear JPEG, PNG or WebP photos, up to 5 MB each. The first photo is the cover image.</p></div>
            <label className={`${labelClass} max-w-xl`}>Choose photos
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={selectFiles} className="mt-2 block min-h-12 min-w-0 w-full max-w-full rounded-xl border border-slate-300 bg-white p-2 text-sm text-slate-900 file:mr-3 file:min-h-9 file:rounded-lg file:border-0 file:bg-[#A71930] file:px-4 file:font-semibold file:text-white" />
            </label>

            <label className={`${labelClass} mt-4 max-w-xl`}>Property video (optional · 1 MP4, up to 50 MB)
              <input type="file" accept="video/mp4,.mp4" onChange={selectVideo} className="mt-2 block min-h-12 min-w-0 w-full max-w-full rounded-xl border border-slate-300 bg-white p-2 text-sm text-slate-900 file:mr-3 file:min-h-9 file:rounded-lg file:border-0 file:bg-[#A71930] file:px-4 file:font-semibold file:text-white" />
            </label>
            {videoItem && <div className="mt-3 max-w-xl rounded-xl border border-slate-200 p-3">
              <video src={videoItem.url} controls playsInline preload="metadata" className="max-h-64 w-full rounded-lg bg-black" />
              <div className="mt-2 flex items-center justify-between gap-3"><p className="min-w-0 truncate text-xs text-slate-600">{videoItem.file.name} · {(videoItem.file.size / (1024 * 1024)).toFixed(1)} MB</p><button type="button" onClick={removeVideo} className="shrink-0 rounded-md border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">Remove video</button></div>
            </div>}
            {photoError && <p role="alert" className="text-sm font-semibold text-rose-700">{photoError}</p>}
            {photoItems.length > 0 && <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3">
              {photoItems.map((photo, index) => <article key={photo.id} className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
                <Image src={photo.url} alt={`Selected property photo ${index + 1}`} width={800} height={600} unoptimized className="aspect-[4/3] w-full object-cover" />
                <div className="space-y-2 p-2">
                  <p className="truncate text-xs text-slate-600" title={photo.file.name}>{index === 0 ? "Cover photo · " : ""}{photo.file.name}</p>
                  <div className="flex flex-wrap gap-1">
                    {index > 0 && <button type="button" onClick={() => reorderPhoto(index, 0)} className="min-h-9 rounded-md border border-slate-300 px-2 text-xs font-semibold">Set as cover</button>}
                    <button type="button" aria-label={`Move photo ${index + 1} earlier`} disabled={index === 0} onClick={() => reorderPhoto(index, index - 1)} className="min-h-9 rounded-md border border-slate-300 px-2 text-xs font-semibold disabled:opacity-40">Move up</button>
                    <button type="button" aria-label={`Move photo ${index + 1} later`} disabled={index === photoItems.length - 1} onClick={() => reorderPhoto(index, index + 1)} className="min-h-9 rounded-md border border-slate-300 px-2 text-xs font-semibold disabled:opacity-40">Move down</button>
                    <button type="button" aria-label={`Remove photo ${index + 1}`} onClick={() => removePhoto(photo.id)} className="min-h-9 rounded-md border border-rose-200 px-2 text-xs font-semibold text-rose-700">Remove</button>
                  </div>
                </div>
              </article>)}
            </div>}
          </section>
          <section aria-label="Live property preview" className="rounded-2xl border border-[#E8B5BF] bg-[#FDF5F6]/60 p-4 sm:p-5">
            <h4 className="text-lg font-bold text-[#A71930]">Listing preview</h4>
            <p className="mt-1 text-sm text-slate-600">Check your details before moving to owner contact and final submission.</p>
            <div className="mt-4 flex min-w-0 gap-4">
              {photoItems[0] && <Image src={photoItems[0].url} alt="Cover preview" width={800} height={600} unoptimized className="aspect-[4/3] w-28 shrink-0 rounded-xl object-cover sm:w-40" />}
              <div className="min-w-0">
                <p className="font-bold text-[#A71930]">{values.title || "Property title"}{category && <span className="font-medium text-slate-600"> · {categoryLabel(category as ListingType)}</span>}</p>
                <p className="mt-1 text-sm text-slate-600">{values.locality || "Locality"}</p>
                {Number.isFinite(displayPrice) && displayPrice > 0 && <p className="mt-2 text-lg font-bold text-[#A71930]">₹{displayPrice.toLocaleString("en-IN")} <span className="text-xs font-medium text-slate-600">{category === "Rental" ? "/ month" : category === "Airbnb" ? "/ night" : category === "PG" ? "/ person" : ""}</span></p>}
                {values.area && <p className="mt-1 text-xs text-slate-600">{values.area} sq. ft.</p>}
              </div>
            </div>
            {values.description && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{values.description}</p>}
            <SavedDetails value={details} />
          </section>
        </div>}

        {step === 6 && <div className="space-y-5">
          <p className="text-sm leading-6 text-slate-600">Provide the contact details Admin can use during the review. The information below is stored privately with this submission and is not included in the public listing.</p>
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <label className={labelClass}>Owner / authorized contact name
              <input autoComplete="name" maxLength={120} value={owner.fullName} onChange={(event) => setOwnerField("fullName", event.target.value)} className={inputClass} />
            </label>
            <label className={labelClass}>Mobile number
              <input autoComplete="tel" type="tel" inputMode="tel" maxLength={24} value={owner.mobile} onChange={(event) => setOwnerField("mobile", event.target.value)} placeholder="10-digit Indian mobile number" className={inputClass} />
            </label>
            <label className={labelClass}>Email address
              <input autoComplete="email" type="email" maxLength={254} value={owner.email} onChange={(event) => setOwnerField("email", event.target.value)} className={inputClass} />
            </label>
            <label className={labelClass}>Your relationship to the property
              <select value={owner.relationship} onChange={(event) => setOwnerField("relationship", event.target.value as OwnerValues["relationship"])} className={inputClass}>
                <option>Owner</option><option>Power of Attorney</option><option>Authorized Representative</option>
              </select>
            </label>
          </div>
          {owner.relationship !== "Owner" && <label className={labelClass}>Authorization details
            <textarea rows={3} maxLength={1000} value={owner.authorizationDetails} onChange={(event) => setOwnerField("authorizationDetails", event.target.value)} placeholder="Describe your authority to list this property" className={inputClass} />
          </label>}
          <section className="rounded-xl border border-[#E8B5BF] bg-[#FDF5F6] p-4">
            <h3 className="font-bold text-[#A71930]">Ownership / authority documents (Required)</h3>
            <p className="mt-1 text-sm leading-6 text-slate-700">Upload at least one document supporting ownership or your authority to list this property, such as a recent property record, registered deed extract, property tax record, Power of Attorney or owner authorisation. Admin may request additional documents. Files are stored privately for verification and are not displayed on the public listing.</p>
            <input type="file" multiple required accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" onChange={selectOwnerDocuments} className="mt-3 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[#A71930] file:px-3 file:py-2 file:font-semibold file:text-white" />
            <p className="mt-2 text-xs text-slate-600">PDF / JPG / PNG / WebP · Maximum 5 files · 10 MB each</p>
            {ownerDocuments.length > 0 && <ul className="mt-3 space-y-2">{ownerDocuments.map(({id,file}) => <li key={id} className="flex items-center justify-between gap-2 rounded-lg bg-white p-2 text-sm"><span className="min-w-0 break-all">{file.name}</span><button type="button" onClick={() => setOwnerDocuments((current) => current.filter((item) => item.id !== id))} className="shrink-0 font-semibold text-rose-700 underline">Remove</button></li>)}</ul>}
            {ownerDocuments.length === 0 && <p className="mt-2 text-sm font-semibold text-rose-700">At least one document is required before submission.</p>}
          </section>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-[#F4F1EF] p-4 text-sm leading-6 text-slate-800">
            <input type="checkbox" checked={ownerConfirmed} onChange={(event) => setOwnerConfirmed(event.target.checked)} className="mt-1 size-4 shrink-0 accent-[#A71930]" />
            <span>{category === "Resale" ? "I confirm this is a genuine resale property offered by its existing owner, that I am the owner or duly authorised representative, and that it is not builder / promoter unsold inventory or a new project sale. I can provide ownership / authority documents for Admin verification." : "I confirm that I am the owner or am authorized to list this property and that the information provided is accurate."}</span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-[#F4F1EF] p-4 text-sm leading-6 text-slate-800">
            <input type="checkbox" checked={listingDeclaration} onChange={(event) => setListingDeclaration(event.target.checked)} className="mt-1 size-4 shrink-0 accent-[#A71930]" />
            <span>I agree that Admin may review this submission and, if approved, publish the property details, full address, selected amenities, photos and optional property video on NAREN REALTY.</span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E8B5BF] bg-[#FDF5F6] p-4 text-sm leading-6 text-slate-800">
            <input type="checkbox" checked={brokerageAccepted} onChange={(event) => setBrokerageAccepted(event.target.checked)} className="mt-1 size-4 shrink-0 accent-[#A71930]" />
            <span>{category === "Resale" ? "I acknowledge seller brokerage of 1% of the final agreed sale value if the completed transaction value is above ₹1 crore. For a transaction of ₹1 crore or below, the rate will be separately agreed in writing. Applicable GST, if any, is additional." : category === "Rental" ? "I acknowledge that no owner brokerage is payable for flat rental." : category === "PG" ? "I acknowledge owner commission of 10% of accommodation rent for each successful PG / Hostel booking introduced or facilitated by NAREN REALTY, plus applicable GST." : "I acknowledge host commission of 10% of accommodation rent for each successful Airbnb / Short-Stay booking introduced or facilitated by NAREN REALTY, plus applicable GST."} I have read and accept the applicable owner-side terms.</span>
          </label>
          <div className="rounded-xl bg-[#F4F1EF] p-4 text-sm">
            <p className="font-semibold text-[#A71930]">Ready to submit?</p>
            <p className="mt-1 text-slate-700">{values.title || "Your property"} · {category ? categoryLabel(category as ListingType) : "Select a category"} · {values.locality || "Add locality"}</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">Your contact information stays private for Admin review. Your listing remains pending until it is reviewed.</p>
          </div>
        </div>}
      </section>

      {stepError && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm font-semibold text-rose-800">{stepError}</p>}
      {state.message && <p role={state.status === "error" ? "alert" : "status"} className={state.status === "error" ? "rounded-lg bg-rose-50 p-3 text-sm font-semibold text-rose-800" : "rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-800"}>{state.message}</p>}
      {!available && <p role="status" className="rounded-lg bg-[#FDF5F6] p-3 text-sm font-semibold text-[#861326]">{unavailableMessage ?? "Private submission setup is not yet verified. Nothing will be saved."}</p>}
    </div>

    <div className="sticky bottom-0 z-10 rounded-b-2xl border-t border-slate-200 bg-white/95 p-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] backdrop-blur sm:px-6">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2">
        <button type="button" disabled={step === 0 || pending || draftPending} onClick={() => { setStep((current) => Math.max(0, current - 1)); setStepError(""); }}
          className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-800 hover:bg-[#F4F1EF] disabled:cursor-not-allowed disabled:opacity-40">Back</button>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <button type="button" disabled={!draftsAvailable || draftPending || pending} onClick={saveDraft}
            className="min-h-11 rounded-xl border border-[#A71930] px-3 text-sm font-bold text-[#A71930] hover:bg-[#F4F1EF] disabled:cursor-not-allowed disabled:opacity-50">{draftPending ? "Saving…" : "Save draft"}</button>
          {step < STEPS.length - 1
            ? <button type="button" disabled={pending} onClick={nextStep} className="min-h-11 rounded-xl bg-[#A71930] px-5 text-sm font-bold text-white shadow-sm hover:bg-[#861326] disabled:opacity-50">Continue</button>
            : <button type="submit" disabled={pending || videoUploading || !available || !ownerConfirmed || !listingDeclaration || !brokerageAccepted || ownerDocuments.length < 1} className="min-h-11 rounded-xl bg-[#A71930] px-5 text-sm font-bold text-white shadow-sm hover:bg-[#861326] disabled:cursor-not-allowed disabled:bg-[#F4F1EF]0">{videoUploading ? "Uploading video…" : pending ? "Submitting securely…" : "Submit for Admin review"}</button>}
        </div>
      </div>
    </div>
  </form>;
}
