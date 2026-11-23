"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import LocalityAutocomplete from "./LocalityAutocomplete";
import {
  AIRBNB_AMENITIES,
  createDefaultCategoryDetails,
  FLAT_AMENITIES,
  PG_AMENITIES,
  PROPERTY_CATEGORIES,
  type FlatBhk,
  type ListingType,
  type PgSharingOption,
  type PropertyCategoryDetails,
  type PropertyDetails,
} from "../lib/properties";

const DIRECTIONS = ["North", "South", "East", "West", "North-East", "North-West", "South-East", "South-West"];
const BHK_OPTIONS: FlatBhk[] = ["1 RK", "1 BHK", "2 BHK", "3 BHK", "4 BHK", "5 BHK"];
const FURNISHING = ["Unfurnished", "Semi-Furnished", "Fully Furnished"];
const PROPERTY_AGES = ["New / Ready to Move", "1–5 Years", "5–10 Years", "10+ Years"];
const SHARING_TYPES = ["Single Sharing (1 Person)", "Double Sharing (2 Persons)", "Triple Sharing (3 Persons)", "Four Sharing (4 Persons)", "Five Sharing (5 Persons)", "Dormitory (Multiple Sharing)", "Private Room"];
const PG_FACILITIES = ["Food Included", "Electricity Included", "Wi-Fi Included", "Maintenance Included", "Attached Bathroom", "AC Available", "Laundry Included", "Housekeeping Included"];

function readPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const source = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, 1400 / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      URL.revokeObjectURL(source);
      if (!context) return reject(new Error("Could not process this photo."));
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.76));
    };
    image.onerror = () => {
      URL.revokeObjectURL(source);
      reject(new Error("Could not read one of the selected photos."));
    };
    image.src = source;
  });
}

function valueAt(details: PropertyCategoryDetails, field: string): unknown {
  return (details as unknown as Record<string, unknown>)[field];
}

function textAt(details: PropertyCategoryDetails, field: string): string {
  const value = valueAt(details, field);
  return typeof value === "string" ? value : "";
}

function numberAt(details: PropertyCategoryDetails, field: string): number {
  const value = valueAt(details, field);
  return typeof value === "number" ? value : 0;
}

function booleanAt(details: PropertyCategoryDetails, field: string): boolean {
  return valueAt(details, field) === true;
}

function arrayAt(details: PropertyCategoryDetails, field: string): string[] {
  const value = valueAt(details, field);
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function detailsMaintenanceExtra(details: PropertyCategoryDetails): boolean {
  return valueAt(details, "maintenanceIncluded") === false;
}

export default function OwnerPropertyForm({
  initialDetails,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  initialDetails: PropertyDetails;
  onSubmit: (details: PropertyDetails) => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  const [draft, setDraft] = useState<PropertyDetails>({
    ...initialDetails,
    categoryDetails: initialDetails.categoryDetails ?? createDefaultCategoryDetails(initialDetails.type, initialDetails.price, initialDetails.bedrooms),
  });
  const [error, setError] = useState("");
  const [brokerageAccepted, setBrokerageAccepted] = useState(false);
  const categoryDetails = draft.categoryDetails ?? createDefaultCategoryDetails(draft.type, draft.price, draft.bedrooms);

  function updateCategory(field: string, value: unknown) {
    setDraft((current) => ({
      ...current,
      categoryDetails: {
        ...(current.categoryDetails ?? createDefaultCategoryDetails(current.type, current.price, current.bedrooms)),
        [field]: value,
      } as PropertyCategoryDetails,
    }));
  }

  function updatePrice(field: string, value: number) {
    setDraft((current) => ({
      ...current,
      price: value,
      categoryDetails: {
        ...(current.categoryDetails ?? createDefaultCategoryDetails(current.type, current.price, current.bedrooms)),
        [field]: value,
      } as PropertyCategoryDetails,
    }));
  }

  function changeCategory(value: ListingType) {
    setBrokerageAccepted(false);
    setDraft((current) => ({
      ...current,
      type: value,
      price: 0,
      bedrooms: value === "PG" ? 0 : 1,
      bathrooms: 1,
      furnishing: value === "Airbnb" ? "Fully Furnished" : "Unfurnished",
      categoryDetails: createDefaultCategoryDetails(value),
    }));
  }

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (draft.photos.length + files.length > 5) {
      setError("You can add up to 5 photos per listing.");
      return;
    }
    try {
      const photos = await Promise.all(files.map(readPhoto));
      setDraft((current) => ({ ...current, photos: [...current.photos, ...photos] }));
      setError("");
    } catch (photoError) {
      setError(photoError instanceof Error ? photoError.message : "Photo upload failed.");
    }
  }

  function toggleAmenity(amenity: string, field = "amenities") {
    const selected = arrayAt(categoryDetails, field);
    updateCategory(field, selected.includes(amenity) ? selected.filter((item) => item !== amenity) : [...selected, amenity]);
  }

  function updateSharingOption(index: number, field: keyof PgSharingOption, value: string | number) {
    const currentOptions = (valueAt(categoryDetails, "sharingOptions") as PgSharingOption[] | undefined) ?? [];
    updateCategory("sharingOptions", currentOptions.map((option, optionIndex) => optionIndex === index ? { ...option, [field]: value } : option));
  }

  function toggleSharingType(sharingType: string, selected: boolean) {
    const currentOptions = (valueAt(categoryDetails, "sharingOptions") as PgSharingOption[] | undefined) ?? [];
    if (selected) {
      updateCategory("sharingOptions", [...currentOptions, { sharingType, monthlyRentPerPerson: 0, securityDeposit: 0, availableUnits: 1 }]);
    } else {
      updateCategory("sharingOptions", currentOptions.filter((option) => option.sharingType !== sharingType));
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim() || !draft.locality.trim() || !draft.address?.trim() || !draft.description.trim() || !draft.availableFrom) {
      setError("Complete the required property details and available-from date.");
      return;
    }
    if (!brokerageAccepted) {
      setError("Read and accept the applicable brokerage / commission terms before submitting.");
      return;
    }
    if (draft.photos.length === 0) {
      setError("Upload at least one property photo.");
      return;
    }
    if (draft.type === "Rental" || draft.type === "Resale") {
      if (numberAt(categoryDetails, "carpetArea") <= 0) {
        setError("Enter the carpet area in square feet.");
        return;
      }
      if (draft.price <= 0) {
        setError("Enter a price greater than zero.");
        return;
      }
    }
    if (draft.type === "PG") {
      const options = (valueAt(categoryDetails, "sharingOptions") as PgSharingOption[] | undefined) ?? [];
      if (!options.length || options.some((option) => option.monthlyRentPerPerson <= 0 || option.availableUnits <= 0)) {
        setError("Select at least one sharing type and enter its rent and availability.");
        return;
      }
    }
    if (draft.type === "Airbnb" && (numberAt(categoryDetails, "guestCapacity") <= 0 || numberAt(categoryDetails, "minimumStayNights") <= 0 || numberAt(categoryDetails, "pricePerNight") <= 0)) {
      setError("Enter guest capacity, nightly price, and minimum stay.");
      return;
    }
      if (draft.type === "Rental" && detailsMaintenanceExtra(categoryDetails) && typeof valueAt(categoryDetails, "monthlyMaintenanceCharges") !== "number") {
        setError("Enter the monthly maintenance charges or set maintenance as included.");
        return;
      }
      if (draft.type === "Airbnb" && numberAt(categoryDetails, "maximumStayNights") > 0 && numberAt(categoryDetails, "maximumStayNights") < numberAt(categoryDetails, "minimumStayNights")) {
        setError("Maximum stay must be at least the minimum stay.");
        return;
      }
    setError("");
    const categoryPrice = draft.type === "Rental"
      ? numberAt(categoryDetails, "monthlyRent")
      : draft.type === "Resale"
        ? numberAt(categoryDetails, "expectedSalePrice")
        : draft.type === "Airbnb"
          ? numberAt(categoryDetails, "pricePerNight")
          : Math.min(...((valueAt(categoryDetails, "sharingOptions") as PgSharingOption[] | undefined) ?? []).map((option) => option.monthlyRentPerPerson));
    onSubmit({ ...draft, price: categoryPrice });
  }

  function toggleFacility(facility: string, included: boolean) {
    const facilities = (valueAt(categoryDetails, "facilities") as Record<string, boolean> | undefined) ?? {};
    updateCategory("facilities", { ...facilities, [facility]: included });
  }

  function amenityOptions() {
    if (draft.type === "Rental" || draft.type === "Resale") return FLAT_AMENITIES;
    if (draft.type === "PG") return PG_AMENITIES;
    return AIRBNB_AMENITIES;
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold tracking-[0.16em] text-[#A71930]">PROPERTY DETAILS</p><h2 className="mt-1 text-xl font-bold text-[#A71930]">{submitLabel === "Submit for approval" ? "New listing" : "Edit listing"}</h2></div><button type="button" onClick={onCancel} aria-label="Close property form" className="px-2 text-2xl leading-none text-slate-500">&times;</button></div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">Property category<select value={draft.type} onChange={(event) => changeCategory(event.target.value as ListingType)} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-normal">{PROPERTY_CATEGORIES.map((category) => <option key={category} value={category}>{category === "Rental" ? "Flat Rental" : category === "Resale" ? "Flat Resale" : category === "PG" ? "PG / Hostel" : "Airbnb / Short Stay"}</option>)}</select></label>
        <label className="text-sm font-semibold">{draft.type === "PG" ? "PG / Hostel Name" : "Property Title"}<input required maxLength={100} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal outline-none focus:border-[#A71930]" /></label>
        <label className="text-sm font-semibold">Locality<LocalityAutocomplete required value={draft.locality} onChange={(event) => setDraft({ ...draft, locality: event.target.value })} placeholder="Start typing locality, e.g. Kharadi" className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-normal" /></label>
        <label className="text-sm font-semibold sm:col-span-2">Full Property Address<input required value={draft.address ?? ""} onChange={(event) => setDraft({ ...draft, address: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal outline-none focus:border-[#A71930]" /></label>
        <label className="text-sm font-semibold">Landmark<input value={draft.landmark ?? ""} onChange={(event) => setDraft({ ...draft, landmark: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal outline-none focus:border-[#A71930]" /></label>
        <label className="text-sm font-semibold">Available From<input required type="date" value={draft.availableFrom ?? ""} onChange={(event) => setDraft({ ...draft, availableFrom: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal outline-none focus:border-[#A71930]" /></label>
        <label className="text-sm font-semibold sm:col-span-2">Property Description<textarea required rows={4} maxLength={2000} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal outline-none focus:border-[#A71930]" /></label>

        {(draft.type === "Rental" || draft.type === "Resale") && <>
          <fieldset className="grid gap-4 sm:col-span-2 sm:grid-cols-2 lg:grid-cols-4"><legend className="mb-1 text-sm font-bold text-[#A71930]">Flat Details</legend>
            <label className="text-sm font-semibold">BHK Configuration<select value={textAt(categoryDetails, "bhkConfiguration") || "1 BHK"} onChange={(event) => { const bedrooms = Number.parseInt(event.target.value, 10) || 0; setDraft({ ...draft, bedrooms, categoryDetails: { ...categoryDetails, bhkConfiguration: event.target.value } as PropertyCategoryDetails }); }} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 font-normal">{BHK_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select></label>
            <label className="text-sm font-semibold">Carpet Area (sq. ft.)<input required type="number" min="1" value={numberAt(categoryDetails, "carpetArea") || ""} onChange={(event) => updateCategory("carpetArea", Number(event.target.value))} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal" /></label>
            <label className="text-sm font-semibold">Number of Bathrooms<input type="number" min="1" value={numberAt(categoryDetails, "bathrooms") || 1} onChange={(event) => { const bathrooms = Number(event.target.value); setDraft({ ...draft, bathrooms, categoryDetails: { ...categoryDetails, bathrooms } as PropertyCategoryDetails }); }} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal" /></label>
            <label className="text-sm font-semibold">Number of Balconies<input type="number" min="0" value={numberAt(categoryDetails, "balconies")} onChange={(event) => updateCategory("balconies", Number(event.target.value))} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal" /></label>
            <label className="text-sm font-semibold">Floor Number<input type="number" min="0" value={numberAt(categoryDetails, "floorNumber")} onChange={(event) => updateCategory("floorNumber", Number(event.target.value))} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal" /></label>
            <label className="text-sm font-semibold">Total Floors in Building<input type="number" min="1" value={numberAt(categoryDetails, "totalFloors") || 1} onChange={(event) => updateCategory("totalFloors", Number(event.target.value))} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal" /></label>
            <label className="text-sm font-semibold">Furnishing Status<select value={textAt(categoryDetails, "furnishingStatus") || "Unfurnished"} onChange={(event) => { setDraft({ ...draft, furnishing: event.target.value, categoryDetails: { ...categoryDetails, furnishingStatus: event.target.value } as PropertyCategoryDetails }); }} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 font-normal">{FURNISHING.map((option) => <option key={option}>{option}</option>)}</select></label>
            <label className="text-sm font-semibold">Property Age<select value={textAt(categoryDetails, "propertyAge") || PROPERTY_AGES[0]} onChange={(event) => updateCategory("propertyAge", event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 font-normal">{PROPERTY_AGES.map((option) => <option key={option}>{option}</option>)}</select></label>
            <label className="text-sm font-semibold">Flat Main Entry Direction<select value={textAt(categoryDetails, "entryDirection") || "North"} onChange={(event) => updateCategory("entryDirection", event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 font-normal">{DIRECTIONS.map((direction) => <option key={direction}>{direction}</option>)}</select></label>
            <label className="text-sm font-semibold">Flat Exit Direction<select value={textAt(categoryDetails, "exitDirection") || "North"} onChange={(event) => updateCategory("exitDirection", event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 font-normal">{DIRECTIONS.map((direction) => <option key={direction}>{direction}</option>)}</select></label>
          </fieldset>
          {draft.type === "Rental" ? <fieldset className="grid gap-4 sm:col-span-2 sm:grid-cols-2 lg:grid-cols-4"><legend className="mb-1 text-sm font-bold text-[#A71930]">Rental Pricing & Preferences</legend>
            <label className="text-sm font-semibold">Monthly Rent (₹)<input required type="number" min="1" value={numberAt(categoryDetails, "monthlyRent") || ""} onChange={(event) => updatePrice("monthlyRent", Number(event.target.value))} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal" /></label>
            <label className="text-sm font-semibold">Security Deposit (₹)<input type="number" min="0" value={numberAt(categoryDetails, "securityDeposit")} onChange={(event) => updateCategory("securityDeposit", Number(event.target.value))} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal" /></label>
            <label className="text-sm font-semibold">Rent Negotiable<select value={booleanAt(categoryDetails, "rentNegotiable") ? "Yes" : "No"} onChange={(event) => updateCategory("rentNegotiable", event.target.value === "Yes")} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 font-normal"><option>No</option><option>Yes</option></select></label>
            <label className="text-sm font-semibold">Is Maintenance Included in Rent?<select value={booleanAt(categoryDetails, "maintenanceIncluded") ? "Yes" : "No"} onChange={(event) => updateCategory("maintenanceIncluded", event.target.value === "Yes")} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 font-normal"><option value="Yes">Yes – Maintenance Included</option><option value="No">No – Maintenance Extra</option></select></label>
            {booleanAt(categoryDetails, "maintenanceIncluded") ? <p className="self-end rounded-md bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-800">Maintenance Included in Rent</p> : <label className="text-sm font-semibold">Monthly Maintenance Charges (₹)<input type="number" min="0" value={numberAt(categoryDetails, "monthlyMaintenanceCharges")} onChange={(event) => updateCategory("monthlyMaintenanceCharges", Number(event.target.value))} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal" /></label>}
            <label className="text-sm font-semibold">Parking Charges (₹, if applicable)<input type="number" min="0" value={numberAt(categoryDetails, "parkingCharges")} onChange={(event) => updateCategory("parkingCharges", Number(event.target.value))} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal" /></label>
            <label className="text-sm font-semibold">Tenant Preference<select value={textAt(categoryDetails, "tenantPreference") || "Any"} onChange={(event) => updateCategory("tenantPreference", event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 font-normal">{["Family", "Bachelor", "Working Professionals", "Any"].map((option) => <option key={option}>{option}</option>)}</select></label>
          </fieldset> : <fieldset className="grid gap-4 sm:col-span-2 sm:grid-cols-2 lg:grid-cols-4"><legend className="mb-1 text-sm font-bold text-[#A71930]">Resale Pricing & Ownership</legend>
            <label className="text-sm font-semibold">Expected Sale Price (₹)<input required type="number" min="1" value={numberAt(categoryDetails, "expectedSalePrice") || ""} onChange={(event) => updatePrice("expectedSalePrice", Number(event.target.value))} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal" /></label>
            <label className="text-sm font-semibold">Price Negotiable<select value={booleanAt(categoryDetails, "priceNegotiable") ? "Yes" : "No"} onChange={(event) => updateCategory("priceNegotiable", event.target.value === "Yes")} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 font-normal"><option>No</option><option>Yes</option></select></label>
            <label className="text-sm font-semibold">Possession Status<select value={textAt(categoryDetails, "possessionStatus") || "Ready to Move"} onChange={(event) => updateCategory("possessionStatus", event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 font-normal"><option>Ready to Move</option><option>Under Construction</option></select></label>
            <label className="text-sm font-semibold">Parking Details<input value={textAt(categoryDetails, "parkingDetails")} onChange={(event) => updateCategory("parkingDetails", event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal" /></label>
            <label className="text-sm font-semibold">Ownership Type<input value={textAt(categoryDetails, "ownershipType")} onChange={(event) => updateCategory("ownershipType", event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal" /></label>
          </fieldset>}
        </>}

        {draft.type === "PG" && <>
          <fieldset className="grid gap-4 sm:col-span-2 sm:grid-cols-2 lg:grid-cols-4"><legend className="mb-1 text-sm font-bold text-[#A71930]">PG / Hostel Details</legend>
            <label className="text-sm font-semibold">Gender Preference<select value={textAt(categoryDetails, "genderPreference") || "Co-Living"} onChange={(event) => updateCategory("genderPreference", event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 font-normal"><option>Boys</option><option>Girls</option><option>Co-Living</option></select></label>
            <label className="text-sm font-semibold">Total Number of Rooms (optional)<input type="number" min="0" value={numberAt(categoryDetails, "totalRooms") || ""} onChange={(event) => updateCategory("totalRooms", Number(event.target.value))} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal" /></label>
            <label className="text-sm font-semibold">Suitable For<select value={textAt(categoryDetails, "suitableFor") || "Both"} onChange={(event) => updateCategory("suitableFor", event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 font-normal"><option>Students</option><option>Working Professionals</option><option>Both</option></select></label>
            <label className="text-sm font-semibold">Curfew Timing (optional)<input value={textAt(categoryDetails, "curfewTiming")} onChange={(event) => updateCategory("curfewTiming", event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal" /></label>
            {["Visitors Allowed", "Smoking Allowed", "Alcohol Allowed"].map((rule) => <label key={rule} className="text-sm font-semibold">{rule}<select value={booleanAt(categoryDetails, rule.replaceAll(" ", "")) ? "Yes" : "No"} onChange={(event) => updateCategory(rule.replaceAll(" ", ""), event.target.value === "Yes")} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 font-normal"><option>No</option><option>Yes</option></select></label>)}
          </fieldset>
          <fieldset className="sm:col-span-2"><legend className="text-sm font-bold text-[#A71930]">Room Sharing Types</legend><div className="mt-3 space-y-3">{SHARING_TYPES.map((sharingType) => { const options = (valueAt(categoryDetails, "sharingOptions") as PgSharingOption[] | undefined) ?? []; const index = options.findIndex((option) => option.sharingType === sharingType); const selected = index >= 0; return <div key={sharingType} className="rounded-md border border-slate-200 p-3"><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={selected} onChange={(event) => toggleSharingType(sharingType, event.target.checked)} className="size-4 accent-[#A71930]" />{sharingType}</label>{selected && <div className="mt-3 grid gap-3 sm:grid-cols-3"><label className="text-xs font-semibold">Monthly Rent per Person (₹)<input required type="number" min="1" value={options[index].monthlyRentPerPerson || ""} onChange={(event) => updateSharingOption(index, "monthlyRentPerPerson", Number(event.target.value))} className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm" /></label><label className="text-xs font-semibold">Security Deposit (₹)<input type="number" min="0" value={options[index].securityDeposit} onChange={(event) => updateSharingOption(index, "securityDeposit", Number(event.target.value))} className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm" /></label><label className="text-xs font-semibold">Available Beds / Rooms<input required type="number" min="1" value={options[index].availableUnits} onChange={(event) => updateSharingOption(index, "availableUnits", Number(event.target.value))} className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm" /></label></div>}</div>; })}</div></fieldset>
          <fieldset className="grid gap-3 sm:col-span-2 sm:grid-cols-2 lg:grid-cols-4"><legend className="mb-1 text-sm font-bold text-[#A71930]">PG / Hostel Facilities</legend>{PG_FACILITIES.map((facility) => <label key={facility} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm"><span>{facility}</span><select aria-label={facility} value={(valueAt(categoryDetails, "facilities") as Record<string, boolean> | undefined)?.[facility] ? "Yes" : "No"} onChange={(event) => toggleFacility(facility, event.target.value === "Yes")} className="rounded border border-slate-300 bg-white px-2 py-1"><option>No</option><option>Yes</option></select></label>)}</fieldset>
        </>}

        {draft.type === "Airbnb" && <fieldset className="grid gap-4 sm:col-span-2 sm:grid-cols-2 lg:grid-cols-4"><legend className="mb-1 text-sm font-bold text-[#A71930]">Airbnb / Short Stay Details</legend>
          <label className="text-sm font-semibold">Property Type<select value={textAt(categoryDetails, "propertyType") || "Entire Apartment"} onChange={(event) => updateCategory("propertyType", event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 font-normal">{["Entire Apartment", "Private Room", "Studio Apartment", "Villa", "Other"].map((option) => <option key={option}>{option}</option>)}</select></label>
          <label className="text-sm font-semibold">Guest Capacity<input required type="number" min="1" value={numberAt(categoryDetails, "guestCapacity") || ""} onChange={(event) => updateCategory("guestCapacity", Number(event.target.value))} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal" /></label>
          <label className="text-sm font-semibold">Bedrooms<input type="number" min="0" value={numberAt(categoryDetails, "bedrooms")} onChange={(event) => { const bedrooms = Number(event.target.value); setDraft({ ...draft, bedrooms, categoryDetails: { ...categoryDetails, bedrooms } as PropertyCategoryDetails }); }} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal" /></label>
          <label className="text-sm font-semibold">Bathrooms<input type="number" min="1" value={numberAt(categoryDetails, "bathrooms") || 1} onChange={(event) => { const bathrooms = Number(event.target.value); setDraft({ ...draft, bathrooms, categoryDetails: { ...categoryDetails, bathrooms } as PropertyCategoryDetails }); }} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal" /></label>
          <label className="text-sm font-semibold">Carpet Area (sq. ft., optional)<input type="number" min="0" value={numberAt(categoryDetails, "carpetArea") || ""} onChange={(event) => updateCategory("carpetArea", Number(event.target.value))} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal" /></label>
          <label className="text-sm font-semibold">Furnishing Status<select value={textAt(categoryDetails, "furnishingStatus") || "Fully Furnished"} onChange={(event) => { setDraft({ ...draft, furnishing: event.target.value, categoryDetails: { ...categoryDetails, furnishingStatus: event.target.value } as PropertyCategoryDetails }); }} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 font-normal">{FURNISHING.map((option) => <option key={option}>{option}</option>)}</select></label>
          <label className="text-sm font-semibold">Price per Night (₹)<input required type="number" min="1" value={numberAt(categoryDetails, "pricePerNight") || ""} onChange={(event) => updatePrice("pricePerNight", Number(event.target.value))} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal" /></label>
          <label className="text-sm font-semibold">Security Deposit (₹, optional)<input type="number" min="0" value={numberAt(categoryDetails, "securityDeposit") || ""} onChange={(event) => updateCategory("securityDeposit", Number(event.target.value))} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal" /></label>
          <label className="text-sm font-semibold">Minimum Stay (Nights)<input required type="number" min="1" value={numberAt(categoryDetails, "minimumStayNights") || 1} onChange={(event) => updateCategory("minimumStayNights", Number(event.target.value))} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal" /></label>
          <label className="text-sm font-semibold">Maximum Stay (Nights, optional)<input type="number" min="1" value={numberAt(categoryDetails, "maximumStayNights") || ""} onChange={(event) => updateCategory("maximumStayNights", Number(event.target.value))} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal" /></label>
          <label className="text-sm font-semibold">Check-in Time<input type="time" value={textAt(categoryDetails, "checkInTime") || "15:00"} onChange={(event) => updateCategory("checkInTime", event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal" /></label>
          <label className="text-sm font-semibold">Check-out Time<input type="time" value={textAt(categoryDetails, "checkOutTime") || "11:00"} onChange={(event) => updateCategory("checkOutTime", event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal" /></label>
          <label className="text-sm font-semibold">Cleaning Charges (₹, optional)<input type="number" min="0" value={numberAt(categoryDetails, "cleaningCharges") || ""} onChange={(event) => updateCategory("cleaningCharges", Number(event.target.value))} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal" /></label>
          <label className="text-sm font-semibold sm:col-span-2 lg:col-span-4">House Rules<textarea rows={3} value={textAt(categoryDetails, "houseRules")} onChange={(event) => updateCategory("houseRules", event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal" /></label>
        </fieldset>}

        <fieldset className="sm:col-span-2"><legend className="text-sm font-bold text-[#A71930]">Available Amenities</legend><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">{amenityOptions().map((amenity) => <label key={amenity} className="flex items-start gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm"><input type="checkbox" checked={arrayAt(categoryDetails, "amenities").includes(amenity)} onChange={() => toggleAmenity(amenity)} className="mt-0.5 size-4 accent-[#A71930]" /><span>{amenity}</span></label>)}</div></fieldset>
        <div className="sm:col-span-2"><p className="text-sm font-semibold">Property Photos (up to 5)</p><input type="file" accept="image/*" multiple onChange={handlePhotoChange} className="mt-2 block w-full text-sm text-slate-700 file:mr-4 file:rounded-md file:border-0 file:bg-[#A71930] file:px-4 file:py-2 file:font-semibold file:text-white" />{draft.photos.length > 0 && <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">{draft.photos.map((photo, index) => <div key={`${index}-${photo.slice(0, 24)}`} className="relative aspect-square overflow-hidden rounded-md border border-slate-200"><img src={photo} alt={`Property photo ${index + 1}`} className="h-full w-full object-cover" /><button type="button" onClick={() => setDraft({ ...draft, photos: draft.photos.filter((_, photoIndex) => photoIndex !== index) })} aria-label={`Remove photo ${index + 1}`} className="absolute right-1 top-1 rounded bg-white px-2 py-1 text-xs font-bold text-rose-700">Remove</button></div>)}</div>}</div>
      </div>
      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-slate-800"><input type="checkbox" checked={brokerageAccepted} onChange={(event) => setBrokerageAccepted(event.target.checked)} className="mt-1 size-4 shrink-0 accent-[#A71930]" /><span>{draft.type === "Resale" ? "I acknowledge seller brokerage of 2% of the final sale value, plus applicable GST, payable on a successful sale facilitated by NAREN REALTY." : draft.type === "Rental" ? "I acknowledge that no owner brokerage is payable for flat rental." : draft.type === "PG" ? "I acknowledge that no brokerage or commission is payable by the PG / Hostel Owner." : "I acknowledge host commission of 10% of accommodation rent for each successful Airbnb / Short-Stay booking introduced or facilitated by NAREN REALTY, plus applicable GST."} I have read and accept the applicable owner-side terms.</span></label>
      {error && <p role="alert" className="mt-4 text-sm text-rose-700">{error}</p>}
      <div className="mt-5 flex flex-wrap gap-3"><button disabled={!brokerageAccepted} className="rounded-lg bg-[#A71930] px-5 py-3 font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50">{submitLabel}</button><button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-5 py-3 font-semibold text-slate-700">Cancel</button></div>
    </form>
  );
}
