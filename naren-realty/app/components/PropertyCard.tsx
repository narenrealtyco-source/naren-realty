"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { ListingType, PropertyListing } from "../lib/properties";
import { propertyActionLabel, propertyBadge } from "../lib/property-marketing";
import { sharingTypes } from "../list-property/additional-fields";
import FavoriteButton from "./FavoriteButton";
import VisitRequestForm from "../properties/[id]/VisitRequestForm";

type DetailRecord = Record<string, unknown>;
type CardFact = { label: string; value: string };
type SharingOption = { sharingType: string; rent?: number; deposit?: number; availableUnits?: number };

const categoryLabels: Record<ListingType, string> = {
  Rental: "Flat Rental",
  Resale: "Flat Resale",
  PG: "PG / Hostel",
  Airbnb: "Airbnb / Short Stay",
};

function isRecord(value: unknown): value is DetailRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function detailsRecord(listing: PropertyListing): DetailRecord {
  return isRecord(listing.categoryDetails) ? listing.categoryDetails : {};
}

function firstPresent(...values: unknown[]): unknown {
  return values.find((value) =>
    typeof value === "string" ? value.trim().length > 0
      : typeof value === "number" ? Number.isFinite(value) && value >= 0
        : typeof value === "boolean",
  );
}

function textValue(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value.toLocaleString("en-IN");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return undefined;
}

function numberValue(value: unknown): number | undefined {
  if (typeof value !== "number" && typeof value !== "string") return undefined;
  if (typeof value === "string" && !value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function currency(value: unknown): string | undefined {
  const amount = numberValue(value);
  return amount === undefined || amount <= 0 ? undefined : `₹${amount.toLocaleString("en-IN")}`;
}

function area(value: unknown): string | undefined {
  const amount = numberValue(value);
  return amount === undefined || amount <= 0 ? undefined : `${amount.toLocaleString("en-IN")} sq. ft.`;
}

function categoryValue(listing: PropertyListing, key: string, directKey: string): unknown {
  return firstPresent(listing.publicListingDetails?.values[`${listing.type}_${key}`], detailsRecord(listing)[directKey]);
}

function commonValue(listing: PropertyListing, key: string, directKey: string): unknown {
  const direct = directKey === "landmark" ? listing.landmark
    : directKey === "availableFrom" ? listing.availableFrom
      : detailsRecord(listing)[directKey];
  return firstPresent(listing.publicListingDetails?.values[`common_${key}`], direct);
}

function addFact(facts: CardFact[], label: string, value: unknown): void {
  const text = textValue(value);
  if (text) facts.push({ label, value: text });
}

function addAreaFacts(facts: CardFact[], listing: PropertyListing): void {
  const builtUpArea = area(commonValue(listing, "built_up_area", "builtUpArea"));
  const carpetArea = area(firstPresent(detailsRecord(listing).carpetArea, listing.area));
  if (builtUpArea) facts.push({ label: "Built-up Area", value: builtUpArea });
  if (carpetArea) facts.push({ label: "Carpet Area", value: carpetArea });
}

function furnishing(listing: PropertyListing): string | undefined {
  return textValue(firstPresent(
    categoryValue(listing, "furnishing", "furnishingStatus"),
    listing.furnishing,
  ));
}

function pgSharingOptions(listing: PropertyListing): SharingOption[] {
  if (listing.type !== "PG") return [];
  const values = listing.publicListingDetails?.values ?? {};
  const details = detailsRecord(listing);
  const directOptions = Array.isArray(details.sharingOptions) ? details.sharingOptions.filter(isRecord) : [];
  return sharingTypes.map((sharingType, index) => {
    const direct = directOptions.find((option) => option.sharingType === sharingType);
    return {
      sharingType,
      rent: numberValue(firstPresent(values[`PG_sharing_${index}_rent`], direct?.monthlyRentPerPerson)),
      deposit: numberValue(firstPresent(values[`PG_sharing_${index}_deposit`], direct?.securityDeposit)),
      availableUnits: numberValue(firstPresent(values[`PG_sharing_${index}_units`], direct?.availableUnits)),
    };
  });
}

function pgPriceOption(listing: PropertyListing): SharingOption | undefined {
  return pgSharingOptions(listing)
    .filter((option): option is SharingOption & { rent: number } => option.rent !== undefined && option.rent > 0)
    .sort((first, second) => first.rent - second.rent)[0];
}

function categoryFacts(listing: PropertyListing, pgOption?: SharingOption): CardFact[] {
  const facts: CardFact[] = [];
  if (listing.type === "Rental") {
    addFact(facts, "Security Deposit", currency(categoryValue(listing, "deposit", "securityDeposit")));
    addAreaFacts(facts, listing);
    addFact(facts, "BHK", categoryValue(listing, "bhk", "bhkConfiguration"));
    addFact(facts, "Furnishing", furnishing(listing));
    addFact(facts, "Preferred Tenants", categoryValue(listing, "tenant_preference", "tenantPreference"));
  } else if (listing.type === "Resale") {
    addAreaFacts(facts, listing);
    addFact(facts, "BHK", categoryValue(listing, "bhk", "bhkConfiguration"));
    addFact(facts, "Furnishing", furnishing(listing));
    addFact(facts, "Property Type", commonValue(listing, "property_type", "propertyType"));
  } else if (listing.type === "PG") {
    addFact(facts, "Sharing Type", pgOption?.sharingType);
    addFact(facts, "Security Deposit", pgOption?.deposit === undefined ? undefined : currency(pgOption.deposit) ?? "₹0");
    addFact(facts, "Occupancy / Availability", pgOption?.availableUnits === undefined ? undefined : `${pgOption.availableUnits} available`);
    const facilities = listing.publicListingDetails?.facilities ?? [];
    const amenities = listing.publicListingDetails?.amenities?.PG ?? [];
    const foodIncluded = facilities.includes("Food Included");
    const foodAvailable = amenities.includes("Food / Mess");
    if (foodIncluded || foodAvailable) addFact(facts, "Food", foodIncluded ? "Included" : "Available");
    addFact(facts, "Suitable For", firstPresent(
      categoryValue(listing, "gender", "genderPreference"),
      categoryValue(listing, "suitable", "suitableFor"),
    ));
  } else {
    addFact(facts, "Property Type", categoryValue(listing, "stay_type", "propertyType"));
    addFact(facts, "Guest Capacity", categoryValue(listing, "guests", "guestCapacity"));
    addFact(facts, "Bedrooms", categoryValue(listing, "bedrooms", "bedrooms") ?? (listing.bedrooms > 0 ? listing.bedrooms : undefined));
    addFact(facts, "Bathrooms", categoryValue(listing, "bathrooms", "bathrooms") ?? (listing.bathrooms > 0 ? listing.bathrooms : undefined));
    addFact(facts, "Minimum Stay", categoryValue(listing, "minimum_stay", "minimumStayNights") === undefined
      ? undefined
      : `${textValue(categoryValue(listing, "minimum_stay", "minimumStayNights"))} nights`);
  }
  return facts;
}

function amenities(listing: PropertyListing): string[] {
  const direct = detailsRecord(listing).amenities;
  const saved = listing.publicListingDetails?.amenities?.[listing.type] ?? [];
  const directAmenities = Array.isArray(direct) ? direct.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : [];
  const pgFacilities = listing.type === "PG" ? listing.publicListingDetails?.facilities ?? [] : [];
  return Array.from(new Set([...directAmenities, ...saved, ...pgFacilities]));
}

function categoryHighlights(listing: PropertyListing, listings: PropertyListing[], savedAmenities: string[], facts: CardFact[]): string[] {
  const values: string[] = [];
  const add = (condition: boolean, text: string) => { if (condition && !values.includes(text)) values.push(text); };

  if (listing.type === "Rental") {
    const propertyAge = textValue(categoryValue(listing, "age", "propertyAge"));
    add(listing.availabilityConfirmation === "immediate" || propertyAge === "New / Ready to Move", "Ready to Move");
    add(furnishing(listing) === "Fully Furnished", "Fully Furnished");
    add(propertyBadge(listing, listings) === "Low Deposit", "Low Deposit");
    add(textValue(categoryValue(listing, "negotiable", "rentNegotiable")) === "Yes", "Negotiable");
  } else if (listing.type === "Resale") {
    add(textValue(categoryValue(listing, "possession", "possessionStatus")) === "Ready to Move", "Ready to Move");
    add(textValue(categoryValue(listing, "negotiable", "priceNegotiable")) === "Yes", "Negotiable");
  } else if (listing.type === "PG") {
    const facilities = listing.publicListingDetails?.facilities ?? [];
    add(facilities.includes("Food Included") || savedAmenities.includes("Food / Mess"), "Food Included");
    add(facilities.includes("AC Available") || savedAmenities.includes("Air Conditioning"), "AC");
    add(savedAmenities.includes("Wi-Fi"), "Wi-Fi");
  } else {
    const propertyType = textValue(categoryValue(listing, "stay_type", "propertyType"));
    add(propertyType === "Entire Apartment", "Entire Property");
    add(savedAmenities.includes("Kitchen"), "Kitchen");
    add(savedAmenities.includes("Swimming Pool"), "Pool");
    add(savedAmenities.includes("Workspace"), "Work-Friendly");
  }

  const generalBadge = propertyBadge(listing, listings);
  if (generalBadge && (listing.type !== "Resale" || generalBadge === "Available Now")) add(true, generalBadge);
  return values.filter((highlight) =>
    !(highlight === "Entire Property" && facts.some((fact) =>
      fact.label === "Property Type" && fact.value.toLocaleLowerCase("en-IN") === "entire apartment",
    )) &&
    !facts.some((fact) =>
      `${fact.label} ${fact.value}`.toLocaleLowerCase("en-IN").includes(highlight.toLocaleLowerCase("en-IN")) ||
      fact.value.toLocaleLowerCase("en-IN") === highlight.toLocaleLowerCase("en-IN"),
    ),
  );
}

function CardIcon({ kind }: { kind: "location" | "photos" | "fact" }) {
  return kind === "location"
    ? <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-3 shrink-0"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></svg>
    : kind === "photos"
      ? <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-3"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8.5" cy="10" r="1.5" /><path d="m21 15-5-5L5 19" /></svg>
      : <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-2.5 shrink-0 text-amber-700"><path d="M4 20V8l8-5 8 5v12M8 20v-6h8v6M8 9h.01M12 9h.01M16 9h.01" /></svg>;
}

function PropertyCard({ listing, listings, visitsReady }: { listing: PropertyListing; listings: PropertyListing[]; visitsReady: boolean }) {
  const [visitOpen, setVisitOpen] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const category = categoryLabels[listing.type];
  const pgOption = listing.type === "PG" ? pgPriceOption(listing) : undefined;
  const priceValue = listing.type === "PG" ? pgOption?.rent ?? listing.price : listing.price;
  const price = currency(priceValue);
  const priceLabel = listing.type === "Rental" ? "Monthly Rent"
    : listing.type === "Resale" ? "Sale Price"
      : listing.type === "PG" ? "Rent per person / month" : "Price per night";
  const facts = categoryFacts(listing, pgOption);
  const highlights = categoryHighlights(listing, listings, amenities(listing), facts);
  const fullyFurnished = facts.some((fact) => fact.label === "Furnishing" && fact.value === "Fully Furnished");
  if (fullyFurnished) highlights.push("Furnishing: Fully Furnished");
  const displayedFacts = fullyFurnished ? facts.filter((fact) => fact.label !== "Furnishing") : facts;
  const photos = Array.isArray(listing.photos) ? listing.photos.filter((photo) => typeof photo === "string" && photo.trim()) : [];
  const detailHref = `/properties/${encodeURIComponent(listing.id)}`;

  return <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-lg">
    <div className="relative h-[150px] w-full shrink-0 bg-slate-100 sm:h-[180px]">
      <Link href={detailHref} aria-label={`View ${listing.title}`} className="absolute inset-0 overflow-hidden">
        {photos[0] && !photoFailed
          ? <Image src={photos[0]} alt={listing.title} fill sizes="(max-width: 767px) 100vw, 50vw" loading="lazy" decoding="async" onError={() => setPhotoFailed(true)} className="object-cover transition-transform duration-300 hover:scale-[1.03]" />
          : <div className="flex size-full items-center justify-center px-2 text-center text-xs font-medium text-slate-500">Photo unavailable</div>}
        <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md bg-slate-950/75 px-1.5 py-1 text-[9px] font-semibold text-white backdrop-blur">
          <CardIcon kind="photos" />{photos.length ? `${photos.length} ${photos.length === 1 ? "photo" : "photos"}` : "No photos"}
        </span>
      </Link>
      <div className="absolute right-2 top-2"><FavoriteButton propertyId={listing.id} title={listing.title} locality={listing.locality} type={category} price={price ?? ""} bedrooms={listing.bedrooms || undefined} /></div>
    </div>

    <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3 sm:gap-2 sm:p-4 lg:p-5">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-1.5">
          <p className="mt-0.5 w-fit max-w-[42%] shrink-0 rounded-full bg-[#A71930] px-1.5 py-0.5 text-[8px] font-bold leading-tight text-amber-300 sm:px-2 sm:text-[9px]">{category}</p>
          <h3 className="min-w-0 break-words text-[13px] font-bold leading-tight text-[#A71930] sm:text-base"><Link href={detailHref} className="hover:text-amber-800">{listing.title}</Link></h3>
        </div>
        {price && <div className="min-w-[108px] shrink-0 border-l border-slate-200 pl-2 text-right">
          <p className="text-[8px] font-semibold uppercase leading-tight tracking-wide text-slate-500 sm:text-[9px]">{priceLabel}</p>
          <p className="text-[14px] font-extrabold leading-tight tracking-tight text-[#A71930] sm:text-base">{price}<span className="ml-1 text-[8px] font-semibold text-slate-500 sm:text-[10px]">{listing.type === "Rental" ? "/ month" : listing.type === "Resale" || listing.type === "PG" ? "" : "/ night"}</span></p>
        </div>}
      </div>
      <p className="flex min-w-0 items-start gap-1 break-words text-[10px] leading-tight text-slate-600 sm:text-xs"><CardIcon kind="location" /><span>{listing.locality}, Pune</span></p>

      {displayedFacts.length > 0 && <dl className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 xl:grid-cols-3">
        {displayedFacts.map((fact) => <div key={`${fact.label}-${fact.value}`} className="min-w-0">
          <dt className="flex min-w-0 items-start gap-0.5 text-[9px] font-semibold uppercase leading-tight tracking-[0.02em] text-slate-500 sm:text-[10px]"><span className="hidden shrink-0 sm:inline-flex"><CardIcon kind="fact" /></span><span className="break-words">{fact.label}</span></dt>
          <dd className="mt-0.5 break-words text-[11px] font-semibold leading-tight text-slate-800 sm:text-[13px]">{fact.value}</dd>
        </div>)}
      </dl>}

      {highlights.length > 0 && <ul aria-label="Property highlights" className="mt-1 flex flex-wrap gap-1">
        {highlights.map((highlight) => <li key={highlight} className="property-highlight max-w-full rounded-full border border-amber-200 bg-amber-50 px-1 py-0.5 text-[8px] font-bold leading-tight text-amber-900 sm:px-2 sm:text-[10px]">{highlight}</li>)}
      </ul>}

    </div>
    <div className="mt-auto grid grid-cols-2 gap-1 border-t border-slate-100 bg-white p-3 pt-1 sm:p-4">
      <Link href={detailHref} className="flex min-h-10 min-w-0 items-center justify-center rounded-lg bg-[#A71930] px-2 py-2 text-[10px] font-bold leading-tight text-white transition hover:bg-[#861326] sm:text-xs">View Details</Link>
      <button type="button" disabled={!visitsReady} onClick={() => setVisitOpen(true)} className="min-h-10 min-w-0 rounded-lg bg-[#A71930] px-2 py-2 text-[9px] font-bold leading-tight text-white transition hover:bg-[#861326] disabled:cursor-not-allowed disabled:opacity-50 sm:text-xs">{propertyActionLabel(listing.type)}</button>
      {!visitsReady && <p className="col-span-2 text-[9px] leading-tight text-slate-500">Visit requests are not available yet.</p>}
    </div>
    {visitOpen && <VisitRequestForm propertyId={listing.id} title={listing.title} onClose={() => setVisitOpen(false)} />}
  </article>;
}

export default PropertyCard;
