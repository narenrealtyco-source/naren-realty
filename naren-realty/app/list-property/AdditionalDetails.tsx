"use client";

import { additionalFields, amenitiesForCategory, commonFields, pgFacilities, sharingFields, type AdditionalField } from "./additional-fields";
import type { SubmissionDetails } from "../lib/submission-details";

type DetailsSection = "basic" | "location" | "pricing" | "facilities" | "all";

const labelClass = "block min-w-0 text-sm font-semibold text-slate-900";
const inputClass = "mt-2 block min-w-0 w-full max-w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-normal text-slate-950 shadow-sm focus:border-[#A71930] focus:outline-none focus:ring-2 focus:ring-[#A71930]/20";
const choiceTiles = new Set(["furnishing", "wifi_available", "bhk", "gender", "suitable", "food_availability"]);

export function emptyDetails(): SubmissionDetails {
  return { version: 1, values: {}, amenities: {}, facilities: [] };
}

function isParkingAmenitySelected(category: string, details: SubmissionDetails): boolean {
  return (details.amenities[category] ?? []).some((item) => item.toLowerCase().includes("parking"));
}

function fieldIsVisible(field: AdditionalField, category: string, details: SubmissionDetails, section: DetailsSection): boolean {
  if (section !== "all" && (field.group ?? "basic") !== section) return false;
  const value = (key: string) => details.values[`${category}_${key}`] ?? "";
  const hasSavedWifiDetails = ["wifi_billing", "wifi_monthly_charges", "wifi_coverage", "wifi_speed"].some((key) => Boolean(value(key)));
  if (field.key.startsWith("wifi_") && field.key !== "wifi_available" && value("wifi_available") !== "Yes" && !hasSavedWifiDetails) return false;
  if (field.key === "wifi_monthly_charges" && value("wifi_billing") !== "Extra Charges" && !value(field.key)) return false;
  const hasSavedParkingDetails = ["parking_details", "parking_slots", "parking_charges"].some((key) => Boolean(value(key)));
  if ((field.key === "parking_slots" || field.key === "parking_charges") &&
      !isParkingAmenitySelected(category, details) && !hasSavedParkingDetails) return false;
  if (field.key === "food_charges" && value("food_availability") !== "Extra Charges" && !value(field.key)) return false;
  return true;
}

function OptionTiles({ options, value, onChange, label }: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return <div role="group" aria-label={label} className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
    {options.map((option) => <button
      key={option}
      type="button"
      aria-pressed={value === option}
      onClick={() => onChange(value === option ? "" : option)}
      className={`min-h-11 rounded-xl border px-3 py-2 text-left text-sm font-semibold transition-colors ${value === option
        ? "border-[#A71930] bg-[#A71930] text-white shadow-sm"
        : "border-slate-300 bg-white text-slate-800 hover:border-[#A71930] hover:bg-[#FDF5F6]"}`}
    >{option}</button>)}
  </div>;
}

function ToggleTile({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className={`group flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${checked
    ? "border-[#A71930] bg-[#FDF5F6] text-[#A71930]"
    : "border-slate-200 bg-white text-slate-800 hover:border-[#A71930]"}`}>
    <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="peer sr-only" />
    <span aria-hidden="true" className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${checked ? "bg-[#A71930] text-[#F8E9EC]" : "bg-slate-100 text-slate-500"}`}>
      {checked ? <svg viewBox="0 0 20 20" fill="none" className="size-4"><path d="m4 10 4 4 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        : <svg viewBox="0 0 20 20" fill="none" className="size-4"><path d="M10 3v14M3 10h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>}
    </span>
    <span className="min-w-0 flex-1">{label}</span>
    <span className={`size-2.5 shrink-0 rounded-full ${checked ? "bg-[#FDF5F6]0" : "bg-slate-200"}`} aria-hidden="true" />
  </label>;
}

export default function AdditionalDetails({ category, details, onChange, section = "all" }: {
  category: string;
  details: SubmissionDetails;
  onChange: (value: SubmissionDetails) => void;
  section?: DetailsSection;
}) {
  function updateValue(key: string, value: string) {
    onChange({ ...details, values: { ...details.values, [key]: value } });
  }

  function fields(items: AdditionalField[], scope: string) {
    return items.filter((field) => fieldIsVisible(field, category, details, section)).map((field) => {
      const key = `${scope}_${field.key}`;
      const value = details.values[key] ?? "";
      const change = (nextValue: string) => updateValue(key, nextValue);
      return <label key={key} className={labelClass}>{field.label}
        {field.options && choiceTiles.has(field.key)
          ? <OptionTiles options={field.options} value={value} onChange={change} label={field.label} />
          : field.options
            ? <select value={value} onChange={(event) => change(event.target.value)} className={inputClass}><option value="">Not selected</option>{field.options.map((option) => <option key={option}>{option}</option>)}</select>
            : <input type={field.type ?? "text"} min={field.type === "number" ? 0 : undefined} step={field.type === "number" ? "any" : undefined} maxLength={2000} value={value} onChange={(event) => change(event.target.value)} className={inputClass} />}
      </label>;
    });
  }

  const common = commonFields.filter((field) => section === "all" || (field.group ?? "basic") === section);
  const categoryFields = additionalFields(category);
  const fieldsForSection = categoryFields.filter((field) => fieldIsVisible(field, category, details, section));
  const sectionTitles: Record<DetailsSection, string> = {
    basic: "Property configuration",
    location: "Location details",
    pricing: "Pricing and availability",
    facilities: "Furnishing, Wi-Fi and facilities",
    all: "Additional property details",
  };
  const selectedAmenities = details.amenities[category] ?? [];
  const showAmenities = Boolean(category) && (section === "all" || section === "facilities");

  return <section className="min-w-0 space-y-5">
    <div>
      <h3 className="text-lg font-bold text-[#A71930]">{sectionTitles[section]}</h3>
      {section === "all" && <p className="mt-1 text-sm leading-6 text-slate-600">Category-specific details are retained if you change the listing category.</p>}
    </div>
    {(common.length > 0 || fieldsForSection.length > 0) && <div className="grid min-w-0 gap-4 sm:grid-cols-2">
      {fields(common, "common")}
      {fields(categoryFields, category)}
    </div>}
    {category === "PG" && (section === "all" || section === "pricing") && <fieldset className="min-w-0 space-y-2">
      <legend className="font-semibold text-slate-900">Room sharing and per-person pricing</legend>
      <p className="text-sm text-slate-600">Add rent, deposit and available units for each sharing option you offer.</p>
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">{fields(sharingFields, "PG")}</div>
    </fieldset>}
    {showAmenities && <fieldset className="min-w-0 space-y-2">
      <legend className="font-semibold text-slate-900">Amenities and facilities</legend>
      <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3">
        {amenitiesForCategory(category).map((item) => <ToggleTile key={`${category}-${item}`} label={item} checked={selectedAmenities.includes(item)} onChange={(checked) => onChange({
          ...details,
          amenities: {
            ...details.amenities,
            [category]: checked ? [...selectedAmenities, item] : selectedAmenities.filter((selected) => selected !== item),
          },
        })} />)}
      </div>
    </fieldset>}
    {category === "PG" && showAmenities && <fieldset className="min-w-0 space-y-2">
      <legend className="font-semibold text-slate-900">Included PG services</legend>
      <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3">
        {pgFacilities.map((item) => <ToggleTile key={`facility-${item}`} label={item} checked={details.facilities.includes(item)} onChange={(checked) => onChange({
          ...details,
          facilities: checked ? [...details.facilities, item] : details.facilities.filter((selected) => selected !== item),
        })} />)}
      </div>
    </fieldset>}
    <input type="hidden" name="details" value={JSON.stringify(details)} />
  </section>;
}
