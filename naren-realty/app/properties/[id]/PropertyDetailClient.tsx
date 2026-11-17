"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import ContactButton from "../../components/ContactButton";
import EnquiryModal from "../../components/EnquiryModal";
import VisitRequestForm from "./VisitRequestForm";
import FavoriteButton from "../../components/FavoriteButton";
import PropertyPhotoGallery from "./PropertyPhotoGallery";
import { type ListingType, type PropertyListing } from "../../lib/properties";
import { loadApprovedProperties } from "../actions";
import { visitRequestsReady } from "../visit-actions";
import { indiaCalendarDate } from "../../lib/property-marketing";
import { additionalFields, commonFields, sharingTypes, type AdditionalField } from "../../list-property/additional-fields";

type DetailRecord = Record<string, unknown>;
type FactIcon = "bed" | "bath" | "building" | "area" | "calendar" | "compass" | "currency" | "home" | "location" | "shield" | "water" | "wifi" | "fitness" | "leaf" | "sparkles" | "car" | "users" | "check" | "share";
type PropertyFact = { label: string; value: string; icon: FactIcon };

const categoryLabels: Record<ListingType, string> = {
  Rental: "Flat Rental",
  Resale: "Flat Resale",
  PG: "PG / Hostel",
  Airbnb: "Airbnb / Short Stay",
};

const priceSuffixes: Record<ListingType, string> = {
  Rental: " / month",
  Resale: "",
  PG: " / person / month",
  Airbnb: " / night",
};

const directFieldKeys: Record<string, string> = {
  property_type: "propertyType",
  bhk: "bhkConfiguration",
  bedrooms: "bedrooms",
  bathrooms: "bathrooms",
  balconies: "balconies",
  floor: "floorNumber",
  total_floors: "totalFloors",
  furnishing: "furnishingStatus",
  age: "propertyAge",
  entry: "entryDirection",
  exit: "exitDirection",
  deposit: "securityDeposit",
  maintenance_included: "maintenanceIncluded",
  maintenance: "monthlyMaintenanceCharges",
  parking_charges: "parkingCharges",
  tenant_preference: "tenantPreference",
  parking_details: "parkingDetails",
  ownership: "ownershipType",
  possession: "possessionStatus",
  rooms: "totalRooms",
  gender: "genderPreference",
  suitable: "suitableFor",
  curfew: "curfewTiming",
  visitors: "visitorsAllowed",
  smoking: "smokingAllowed",
  alcohol: "alcoholAllowed",
  stay_type: "propertyType",
  guests: "guestCapacity",
  minimum_stay: "minimumStayNights",
  maximum_stay: "maximumStayNights",
  check_in: "checkInTime",
  check_out: "checkOutTime",
  rules: "houseRules",
  cleaning: "cleaningCharges",
};

function isRecord(value: unknown): value is DetailRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function propertyDetails(listing: PropertyListing): DetailRecord {
  return isRecord(listing.categoryDetails) ? listing.categoryDetails : {};
}

function firstPresent(...values: unknown[]): unknown {
  return values.find((value) =>
    typeof value === "string" ? value.trim().length > 0
      : typeof value === "number" ? Number.isFinite(value) && value >= 0
        : typeof value === "boolean",
  );
}

function fieldValue(listing: PropertyListing, key: string, common = false): unknown {
  const prefix = common ? "common" : listing.type;
  const directKey = common
    ? ({ property_type: "propertyType", built_up_area: "builtUpArea", available_from: "availableFrom", landmark: "landmark" } as Record<string, string>)[key]
    : directFieldKeys[key];
  return firstPresent(
    listing.publicListingDetails?.values[`${prefix}_${key}`],
    directKey ? common && directKey === "availableFrom" ? listing.availableFrom : common && directKey === "landmark" ? listing.landmark : propertyDetails(listing)[directKey] : undefined,
  );
}

function categoryValue(listing: PropertyListing, publicKey: string, directKey: string): unknown {
  return firstPresent(
    listing.publicListingDetails?.values[`${listing.type}_${publicKey}`],
    propertyDetails(listing)[directKey],
  );
}

function displayText(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value.toLocaleString("en-IN");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return undefined;
}

function numericValue(value: unknown): number | undefined {
  if (typeof value !== "number" && typeof value !== "string") return undefined;
  if (typeof value === "string" && !value.trim()) return undefined;
  const result = Number(value);
  return Number.isFinite(result) && result >= 0 ? result : undefined;
}

function formatCurrency(value: unknown): string | undefined {
  const amount = numericValue(value);
  return amount === undefined ? undefined : `₹${amount.toLocaleString("en-IN")}`;
}

function formatArea(value: unknown): string | undefined {
  const area = numericValue(value);
  return area === undefined || area <= 0 ? undefined : `${area.toLocaleString("en-IN")} sq. ft.`;
}

function formatDate(value: unknown): string | undefined {
  const text = displayText(value);
  if (!text) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const timestamp = Date.parse(`${text}T00:00:00Z`);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== text) return undefined;
  return new Date(timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}

function formatField(field: AdditionalField, value: unknown): string | undefined {
  if (field.type === "date") return formatDate(value);
  if (field.type === "number") {
    if (/INR/i.test(field.label)) return formatCurrency(value);
    if (/sq\. ft/i.test(field.label)) return formatArea(value);
    const number = numericValue(value);
    return number === undefined ? undefined : number.toLocaleString("en-IN");
  }
  return displayText(value);
}

function factIcon(label: string): FactIcon {
  const normalized = label.toLowerCase();
  if (/bed|bhk|room|guest|capacity/.test(normalized)) return "bed";
  if (/bath/.test(normalized)) return "bath";
  if (/area|square|built-up|carpet/.test(normalized)) return "area";
  if (/floor|property type|category/.test(normalized)) return "building";
  if (/date|available|time|stay|curfew/.test(normalized)) return "calendar";
  if (/direction|entry|exit/.test(normalized)) return "compass";
  if (/rent|price|deposit|charge|maintenance/.test(normalized)) return "currency";
  if (/locality|address|landmark|city/.test(normalized)) return "location";
  if (/security|visitor|smoking|alcohol/.test(normalized)) return "shield";
  if (/water|geyser|pool/.test(normalized)) return "water";
  if (/wifi|wi-fi|internet/.test(normalized)) return "wifi";
  if (/gym|fitness|sports/.test(normalized)) return "fitness";
  if (/garden|solar|rain|walking/.test(normalized)) return "leaf";
  if (/clubhouse|games|play|food/.test(normalized)) return "sparkles";
  if (/parking|car/.test(normalized)) return "car";
  if (/preference|suitable|sharing|person/.test(normalized)) return "users";
  return "home";
}

function PropertyIcon({ name }: { name: FactIcon }) {
  let shape: ReactNode;
  switch (name) {
    case "bed": shape = <><path d="M3 19v-8h18v8M3 15h18M6 11V7a2 2 0 0 1 2-2h3v6M13 11V8a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3" /><path d="M5 19v2m14-2v2" /></>; break;
    case "bath": shape = <><path d="M4 12h16v3a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5v-3ZM7 12V6a3 3 0 0 1 6 0v1" /><path d="M10 19v2m4-2v2" /></>; break;
    case "building": shape = <><path d="M4 21V4h11v17M15 10h5v11" /><path d="M7 8h2m3 0h1M7 12h2m3 0h1M7 16h2m3 0h1m4-3h1m-1 4h1" /></>; break;
    case "area": shape = <><path d="M4 4h16v16H4zM8 4v3m4-3v2m4-2v3M4 8h3m-3 4h2m-2 4h3" /><path d="m8 16 8-8" /></>; break;
    case "calendar": shape = <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>; break;
    case "compass": shape = <><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" /></>; break;
    case "currency": shape = <><path d="M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></>; break;
    case "location": shape = <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>; break;
    case "shield": shape = <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>; break;
    case "water": shape = <><path d="M12 22a7 7 0 0 0 7-7c0-4-7-13-7-13S5 11 5 15a7 7 0 0 0 7 7Z" /><path d="M9 16a3 3 0 0 0 3 3" /></>; break;
    case "wifi": shape = <><path d="M5 9a11 11 0 0 1 14 0M8 12a6.5 6.5 0 0 1 8 0m-5 4h2" /><circle cx="12" cy="19" r="1" /></>; break;
    case "fitness": shape = <><path d="M6 9v6m12-6v6M3 10v4m18-4v4M6 12h12" /><path d="m9 9 3-3 3 3m-6 6 3 3 3-3" /></>; break;
    case "leaf": shape = <><path d="M20 4c-9 0-15 3-15 10a6 6 0 0 0 6 6c7 0 9-7 9-16Z" /><path d="M4 21c3-5 7-8 12-11" /></>; break;
    case "sparkles": shape = <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" /></>; break;
    case "car": shape = <><path d="m5 11 1.5-5h11l1.5 5M3 11h18v7H3z" /><path d="M6 18v2m12-2v2M6 14h.01M18 14h.01" /></>; break;
    case "users": shape = <><circle cx="9" cy="8" r="3" /><path d="M3 20v-1a6 6 0 0 1 12 0v1M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v1" /></>; break;
    case "check": shape = <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></>; break;
    case "share": shape = <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.7 10.7 6.6-4.4m-6.6 7.4 6.6 4.4" /></>; break;
    case "home": shape = <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-6v-7h-4v7H4a1 1 0 0 1-1-1V10Z" /></>; break;
  }
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-5">{shape}</svg>;
}

function FactCard({ fact }: { fact: PropertyFact }) {
  return <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <span className="inline-flex size-10 items-center justify-center rounded-lg bg-amber-50 text-amber-800"><PropertyIcon name={fact.icon} /></span>
    <p className="mt-3 text-xs font-semibold text-slate-500">{fact.label}</p>
    <p className="mt-1 break-words text-sm font-bold text-[#10243A]">{fact.value}</p>
  </div>;
}

function PropertySection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <h2 className="text-xl font-bold text-[#10243A] sm:text-2xl">{title}</h2>
    {children}
  </section>;
}

function buildHighlights(listing: PropertyListing): PropertyFact[] {
  const details = propertyDetails(listing);
  const facts: PropertyFact[] = [];
  const bhk = displayText(categoryValue(listing, "bhk", "bhkConfiguration"));
  const bedrooms = numericValue(firstPresent(
    listing.publicListingDetails?.values[`${listing.type}_bedrooms`],
    details.bedrooms,
    listing.bedrooms > 0 ? listing.bedrooms : undefined,
  ));
  if (bhk || bedrooms !== undefined) {
    const bhkNumber = bhk?.match(/\d+/)?.[0];
    const value = bhk && bedrooms !== undefined && bhkNumber && Number(bhkNumber) !== bedrooms
      ? `${bhk} · ${bedrooms.toLocaleString("en-IN")} bedrooms`
      : bhk ?? `${bedrooms?.toLocaleString("en-IN")} bedroom${bedrooms === 1 ? "" : "s"}`;
    facts.push({ label: "Bedrooms / BHK", value, icon: "bed" });
  }

  const bathrooms = numericValue(firstPresent(
    listing.publicListingDetails?.values[`${listing.type}_bathrooms`],
    details.bathrooms,
    listing.bathrooms > 0 ? listing.bathrooms : undefined,
  ));
  if (bathrooms !== undefined && bathrooms > 0) facts.push({ label: "Bathrooms", value: bathrooms.toLocaleString("en-IN"), icon: "bath" });

  const balconies = numericValue(categoryValue(listing, "balconies", "balconies"));
  if (balconies !== undefined) facts.push({ label: "Balconies", value: balconies.toLocaleString("en-IN"), icon: "home" });

  const builtUpArea = formatArea(fieldValue(listing, "built_up_area", true));
  if (builtUpArea) facts.push({ label: "Built-up Area", value: builtUpArea, icon: "area" });
  const carpetArea = formatArea(firstPresent(details.carpetArea, listing.area));
  if (carpetArea) facts.push({ label: "Carpet Area", value: carpetArea, icon: "area" });

  const floor = displayText(categoryValue(listing, "floor", "floorNumber"));
  const totalFloors = displayText(categoryValue(listing, "total_floors", "totalFloors"));
  if (floor) facts.push({ label: "Floor Number", value: floor, icon: "building" });
  if (totalFloors) facts.push({ label: "Total Floors", value: totalFloors, icon: "building" });

  if (listing.type === "PG") {
    const rooms = displayText(categoryValue(listing, "rooms", "totalRooms"));
    if (rooms) facts.push({ label: "Total Rooms", value: rooms, icon: "building" });
  }
  if (listing.type === "Airbnb") {
    const capacity = displayText(categoryValue(listing, "guests", "guestCapacity"));
    if (capacity) facts.push({ label: "Guest Capacity", value: capacity, icon: "users" });
  }
  return facts;
}

function directKeyForField(listing: PropertyListing, key: string): string {
  if (key === "negotiable") return listing.type === "Rental" ? "rentNegotiable" : "priceNegotiable";
  return directFieldKeys[key] ?? key;
}

function detailFacts(listing: PropertyListing): PropertyFact[] {
  const reservedCommon = new Set(["purpose", "landmark", "built_up_area"]);
  if (listing.type === "Rental") reservedCommon.add("available_from");
  const reservedCategory = new Set(["bhk", "bedrooms", "bathrooms", "balconies", "floor", "total_floors"]);
  if (listing.type === "PG") reservedCategory.add("rooms");
  if (listing.type === "Airbnb") reservedCategory.add("guests");
  if (listing.type === "Rental") {
    for (const key of ["deposit", "negotiable", "maintenance_included", "maintenance", "parking_charges", "tenant_preference"]) reservedCategory.add(key);
  }

  const commonFacts = commonFields
    .filter((field) => !reservedCommon.has(field.key))
    .flatMap((field) => {
      const value = formatField(field, fieldValue(listing, field.key, true));
      return value ? [{ label: field.label, value, icon: factIcon(field.label) }] : [];
    });
  const categoryFacts = additionalFields(listing.type)
    .filter((field) => !reservedCategory.has(field.key))
    .flatMap((field) => {
      const value = formatField(field, firstPresent(
        listing.publicListingDetails?.values[`${listing.type}_${field.key}`],
        propertyDetails(listing)[directKeyForField(listing, field.key)],
      ));
      return value ? [{ label: field.label, value, icon: factIcon(field.label) }] : [];
    });
  return [...commonFacts, ...categoryFacts, ...sharingFacts(listing)];
}

function sharingFacts(listing: PropertyListing): PropertyFact[] {
  if (listing.type !== "PG") return [];
  const values = listing.publicListingDetails?.values ?? {};
  const directOptions = Array.isArray(propertyDetails(listing).sharingOptions) ? propertyDetails(listing).sharingOptions as unknown[] : [];
  const directByType = new Map(directOptions.filter(isRecord).map((option) => [displayText(option.sharingType), option]).filter((entry): entry is [string, DetailRecord] => Boolean(entry[0])));
  return sharingTypes.flatMap((sharingType, index) => {
    const direct = directByType.get(sharingType);
    const rent = firstPresent(values[`PG_sharing_${index}_rent`], direct?.monthlyRentPerPerson);
    const deposit = firstPresent(values[`PG_sharing_${index}_deposit`], direct?.securityDeposit);
    const units = firstPresent(values[`PG_sharing_${index}_units`], direct?.availableUnits);
    const entries = [
      formatCurrency(rent) ? `${formatCurrency(rent)} / person / month` : undefined,
      formatCurrency(deposit) ? `Deposit ${formatCurrency(deposit)}` : undefined,
      displayText(units) ? `${displayText(units)} available units` : undefined,
    ].filter((entry): entry is string => Boolean(entry));
    return entries.length ? [{ label: sharingType, value: entries.join(" · "), icon: "users" as const }] : [];
  });
}

function rentalFacts(listing: PropertyListing): PropertyFact[] {
  if (listing.type !== "Rental") return [];
  const facts: PropertyFact[] = [];
  const rent = firstPresent(categoryValue(listing, "monthlyRent", "monthlyRent"), listing.price);
  const monthlyRent = formatCurrency(rent);
  if (monthlyRent) facts.push({ label: "Monthly Rent", value: monthlyRent, icon: "currency" });

  const deposit = formatCurrency(categoryValue(listing, "deposit", "securityDeposit"));
  if (deposit) facts.push({ label: "Security Deposit", value: deposit, icon: "currency" });

  const negotiable = displayText(categoryValue(listing, "negotiable", "rentNegotiable"));
  if (negotiable) facts.push({ label: "Rent Negotiable", value: negotiable, icon: "check" as FactIcon });

  const maintenance = displayText(categoryValue(listing, "maintenance_included", "maintenanceIncluded"));
  if (maintenance) facts.push({ label: "Maintenance Included", value: maintenance, icon: "check" });

  const maintenanceCharges = formatCurrency(categoryValue(listing, "maintenance", "monthlyMaintenanceCharges"));
  if (maintenanceCharges) facts.push({ label: "Monthly Maintenance Charges", value: maintenanceCharges, icon: "currency" });

  const parkingCharges = formatCurrency(categoryValue(listing, "parking_charges", "parkingCharges"));
  if (parkingCharges) facts.push({ label: "Parking Charges", value: parkingCharges, icon: "car" });

  const availableFrom = formatDate(firstPresent(fieldValue(listing, "available_from", true), listing.availableFrom));
  if (availableFrom) facts.push({ label: "Available From", value: availableFrom, icon: "calendar" });

  const tenantPreference = displayText(categoryValue(listing, "tenant_preference", "tenantPreference"));
  if (tenantPreference) facts.push({ label: "Tenant Preference", value: tenantPreference, icon: "users" });

  const purpose = displayText(fieldValue(listing, "purpose", true)) ?? "Rent";
  facts.push({ label: "Listing Purpose", value: purpose, icon: "home" });
  return facts;
}

function amenityIcon(name: string): FactIcon {
  return factIcon(name);
}

function listingAmenities(listing: PropertyListing): string[] {
  const direct = propertyDetails(listing).amenities;
  const publicAmenities = listing.publicListingDetails?.amenities[listing.type];
  const facilities = propertyDetails(listing).facilities;
  const directFacilities = isRecord(facilities)
    ? Object.entries(facilities).filter(([, enabled]) => enabled === true).map(([name]) => name)
    : [];
  return Array.from(new Set([
    ...(Array.isArray(direct) ? direct.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : []),
    ...(Array.isArray(publicAmenities) ? publicAmenities.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : []),
    ...directFacilities,
    ...(listing.publicListingDetails?.facilities ?? []),
  ]));
}

function availabilityLabel(listing: PropertyListing): string | undefined {
  if (listing.availabilityConfirmation === "immediate" &&
      (!listing.availableFrom || listing.availableFrom <= indiaCalendarDate())) return "Available Now";
  if (listing.availableFrom && /^\d{4}-\d{2}-\d{2}$/.test(listing.availableFrom) && listing.availableFrom >= indiaCalendarDate()) {
    const date = formatDate(listing.availableFrom);
    return date ? `Available From ${date}` : undefined;
  }
  return undefined;
}

function PropertyDetailClient({ listingId }: { listingId: string }) {
  const [listing, setListing] = useState<PropertyListing | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [completedRequest, setCompletedRequest] = useState("");
  const [loadFailure, setLoadFailure] = useState<{ key: string; message: string } | null>(null);
  const [visitOpen, setVisitOpen] = useState(false);
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [visitsReady, setVisitsReady] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const requestKey = `${listingId}:${loadAttempt}`;
  const loading = completedRequest !== requestKey;
  const loadError = loadFailure?.key === requestKey ? loadFailure.message : "";

  useEffect(() => {
    let active = true;
    visitRequestsReady().then((ready) => { if (active) setVisitsReady(ready); }).catch(() => { if (active) setVisitsReady(false); });
    loadApprovedProperties().then((items) => { if (active) setListing(items.find((property) => property.id === listingId) ?? null); })
      .catch(() => { if (active) setLoadFailure({ key: `${listingId}:${loadAttempt}`, message: "Property could not be loaded. Please try again." }); })
      .finally(() => { if (active) setCompletedRequest(`${listingId}:${loadAttempt}`); });
    return () => { active = false; };
  }, [listingId, loadAttempt]);

  async function shareProperty() {
    if (!listing) return;
    const url = `https://narenrealty.co/properties/${encodeURIComponent(listing.id)}`;
    setShareMessage("Preparing property card...");
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1350;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas is unavailable");

      context.fillStyle = "#071a32";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#d9a83f";
      context.fillRect(0, 0, canvas.width, 18);

      const photos = Array.isArray(listing.photos) ? listing.photos.filter((photo) => typeof photo === "string" && photo.trim()) : [];
      if (photos[0]) {
        try {
          const photo = new Image();
          photo.crossOrigin = "anonymous";
          photo.src = photos[0];
          await new Promise<void>((resolve, reject) => {
            photo.onload = () => resolve();
            photo.onerror = () => reject(new Error("Property photo could not be loaded"));
          });
          const scale = Math.max(1080 / photo.naturalWidth, 650 / photo.naturalHeight);
          const width = photo.naturalWidth * scale;
          const height = photo.naturalHeight * scale;
          context.save();
          context.beginPath();
          context.rect(0, 18, 1080, 650);
          context.clip();
          context.drawImage(photo, (1080 - width) / 2, 18 + (650 - height) / 2, width, height);
          context.restore();
        } catch {
          context.fillStyle = "#173554";
          context.fillRect(0, 18, 1080, 650);
        }
      } else {
        context.fillStyle = "#173554";
        context.fillRect(0, 18, 1080, 650);
      }

      const drawText = (value: string, x: number, y: number, maxWidth: number, lineHeight: number, font: string, color: string, maxLines = 2) => {
        context.font = font;
        context.fillStyle = color;
        const words = value.split(/\\s+/);
        let line = "";
        let lineNumber = 0;
        for (const word of words) {
          const candidate = line ? `${line} ${word}` : word;
          if (context.measureText(candidate).width > maxWidth && line) {
            context.fillText(line, x, y + lineNumber * lineHeight);
            lineNumber += 1;
            line = word;
            if (lineNumber >= maxLines - 1) break;
          } else {
            line = candidate;
          }
        }
        if (line && lineNumber < maxLines) {
          const remaining = words.slice(words.indexOf(line.split(" ")[0])).join(" ");
          context.fillText(lineNumber === maxLines - 1 && context.measureText(remaining).width > maxWidth ? `${line.slice(0, Math.max(0, line.length - 3))}…` : line, x, y + lineNumber * lineHeight);
        }
      };

      context.fillStyle = "#071a32";
      context.fillRect(0, 668, 1080, 682);
      context.fillStyle = "#e5b84e";
      context.font = "bold 42px Arial";
      context.fillText("NAREN REALTY", 64, 735);
      context.fillStyle = "#ffffff";
      context.font = "24px Arial";
      context.fillText("BUY  •  SELL  •  RENT  •  INVEST", 66, 780);

      context.fillStyle = "#e5b84e";
      context.font = "bold 25px Arial";
      context.fillText(purposeLabel.toUpperCase(), 66, 850);
      drawText(listing.title, 66, 915, 940, 58, "bold 48px Arial", "#ffffff", 2);
      context.fillStyle = "#dce6f1";
      context.font = "30px Arial";
      context.fillText(`${listing.locality}, Pune`, 66, 1045);

      context.fillStyle = "#e5b84e";
      context.font = "bold 54px Arial";
      context.fillText(price, 66, 1135);
      context.fillStyle = "#ffffff";
      context.font = "25px Arial";
      context.fillText(categoryLabel, 66, 1185);

      const facts = highlights.slice(0, 3).map((fact) => `${fact.label}: ${fact.value}`);
      context.fillStyle = "#dce6f1";
      context.font = "22px Arial";
      facts.forEach((fact, index) => context.fillText(fact.slice(0, 58), 66, 1240 + index * 30));

      context.fillStyle = "#e5b84e";
      context.fillRect(0, 1310, 1080, 4);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => result ? resolve(result) : reject(new Error("Image export failed")), "image/png");
      });
      const imageFile = new File([blob], `naren-realty-${listing.id}.png`, { type: "image/png" });
      const downloadCard = () => {
        const downloadUrl = URL.createObjectURL(blob);
        const downloadLink = document.createElement("a");
        downloadLink.href = downloadUrl;
        downloadLink.download = imageFile.name;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        downloadLink.remove();
        window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
      };

      try {
        await navigator.clipboard?.writeText(url);
      } catch {
        // Clipboard access can be blocked by mobile browser permissions.
      }

      if (navigator.share && navigator.canShare?.({ files: [imageFile] })) {
        try {
          await navigator.share({ files: [imageFile], title: listing.title });
          setShareMessage("Property card shared successfully.");
          return;
        } catch (shareError) {
          if (shareError instanceof DOMException && shareError.name === "AbortError") {
            setShareMessage("Sharing cancelled.");
            return;
          }
          // Some mobile browsers lose share permission while the image is being prepared.
          downloadCard();
          setShareMessage("Property card downloaded successfully.");
          return;
        }
      }

      downloadCard();
      setShareMessage("Property card downloaded successfully.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShareMessage("Share could not start. Please tap Share again.");
    }
  }

  const displayPrice = listing
    ? listing.type === "Rental" ? numericValue(firstPresent(categoryValue(listing, "monthlyRent", "monthlyRent"), listing.price)) ?? 0
      : listing.type === "Resale" ? numericValue(firstPresent(categoryValue(listing, "expectedSalePrice", "expectedSalePrice"), listing.price)) ?? 0
        : listing.type === "Airbnb" ? numericValue(firstPresent(categoryValue(listing, "pricePerNight", "pricePerNight"), listing.price)) ?? 0
          : listing.price
    : 0;
  const categoryLabel = listing ? categoryLabels[listing.type] : "";
  const purposeLabel = listing?.type === "Rental" ? "For Rent" : listing?.type === "Resale" ? "For Sale" : listing?.type === "PG" ? "PG / Hostel" : "Short Stay";
  const price = `₹${displayPrice.toLocaleString("en-IN")}${listing ? priceSuffixes[listing.type] : ""}`;
  const highlights = listing ? buildHighlights(listing) : [];
  const details = listing ? detailFacts(listing) : [];
  const rental = listing ? rentalFacts(listing) : [];
  const amenities = listing ? listingAmenities(listing) : [];
  const commonLandmark = listing ? displayText(firstPresent(fieldValue(listing, "landmark", true), listing.landmark)) : undefined;
  const availability = listing ? availabilityLabel(listing) : undefined;

  return (
    <main className="min-h-screen bg-slate-50 pb-24 text-slate-900 lg:pb-10">
      <header className="bg-[#10243A] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5">
          <Link href="/" className="text-base font-bold tracking-wide sm:text-xl sm:tracking-widest">NAREN <span className="text-amber-400">REALTY</span></Link>
          <Link href="/properties" className="shrink-0 rounded-lg border border-amber-400 px-3 py-3 text-xs font-semibold text-amber-400 transition hover:bg-amber-400 hover:text-slate-950 sm:px-4 sm:text-sm">Browse Properties</Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-9 lg:px-8">
        <Link href="/properties" className="text-sm font-semibold text-[#10243A] hover:text-amber-700">&larr; All approved properties</Link>
        {loading ? <p role="status" className="mt-8 text-slate-600">Loading property...</p>
          : loadError ? <div role="alert" className="mt-8 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800"><p>{loadError}</p><button type="button" onClick={() => setLoadAttempt((attempt) => attempt + 1)} className="mt-3 rounded-lg bg-rose-800 px-4 py-2 font-semibold text-white hover:bg-rose-700">Retry</button></div>
            : !listing ? <div className="mt-8 rounded-2xl border border-slate-200 bg-white px-5 py-14"><h1 className="text-2xl font-bold text-[#10243A]">Property unavailable</h1><p className="mt-2 text-slate-600">This property may no longer be approved for browsing.</p></div>
              : <>
                <div className="mt-5">
                  <PropertyPhotoGallery title={listing.title} photos={listing.photos} videoUrl={listing.videoUrl} />
                </div>

                <div className="mt-7 grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_20rem] xl:gap-9">
                  <div className="min-w-0 space-y-6">
                    <section className="min-w-0">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full bg-[#10243A] px-3 py-1.5 text-xs font-bold text-white">{purposeLabel}</span>
                            <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900">{categoryLabel}</span>
                            {availability && <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">{availability}</span>}
                          </div>
                          <h1 className="mt-4 break-words text-2xl font-bold leading-tight text-[#10243A] sm:text-3xl lg:text-4xl">{listing.title}</h1>
                          <p className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-600 sm:text-base">
                            <PropertyIcon name="location" />
                            <span>{listing.locality}, Pune</span>
                          </p>
                          {listing.address?.trim() && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-600">{listing.address}</p>}
                          <p className="mt-4 text-2xl font-bold text-[#10243A] lg:hidden">{price}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <FavoriteButton propertyId={listing.id} title={listing.title} locality={listing.locality} type={categoryLabel} price={price} bedrooms={listing.bedrooms || undefined} />
                          <button type="button" onClick={() => void shareProperty()} aria-label="Share property" className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-[#10243A] shadow-sm transition hover:border-amber-400 hover:text-amber-800">
                            <PropertyIcon name="share" /><span>Share</span>
                          </button>
                        </div>
                      </div>
                      {shareMessage && <p role="status" className="mt-3 text-sm text-slate-600">{shareMessage}</p>}

                    </section>

                    {highlights.length > 0 && (
                      <PropertySection title="Key Property Highlights">
                        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                          {highlights.map((fact) => <FactCard key={fact.label} fact={fact} />)}
                        </div>
                      </PropertySection>
                    )}

                    {listing.description.trim() && (
                      <PropertySection title="Property Overview">
                        <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700 sm:text-base">{listing.description}</p>
                      </PropertySection>
                    )}

                    {details.length > 0 && (
                      <PropertySection title="Interior & Property Details">
                        <dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {details.map((fact) => (
                            <div key={`${fact.label}-${fact.value}`} className="flex min-w-0 items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-amber-800 shadow-sm"><PropertyIcon name={fact.icon} /></span>
                              <div className="min-w-0"><dt className="text-xs font-semibold text-slate-500">{fact.label}</dt><dd className="mt-1 break-words text-sm font-semibold text-[#10243A]">{fact.value}</dd></div>
                            </div>
                          ))}
                        </dl>
                      </PropertySection>
                    )}

                    {rental.length > 0 && (
                      <PropertySection title="Rental Terms">
                        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {rental.map((fact) => (
                            <div key={fact.label} className="flex min-w-0 items-start gap-3 rounded-xl border border-amber-100 bg-amber-50/50 p-4">
                              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-amber-800 shadow-sm"><PropertyIcon name={fact.icon} /></span>
                              <div className="min-w-0"><p className="text-xs font-semibold text-slate-500">{fact.label}</p><p className="mt-1 break-words text-sm font-bold text-[#10243A]">{fact.value}</p></div>
                            </div>
                          ))}
                        </div>
                      </PropertySection>
                    )}

                    {amenities.length > 0 && (
                      <PropertySection title="Amenities & Facilities">
                        <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                          {amenities.map((amenity) => (
                            <li key={amenity} className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-700">
                              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-amber-800"><PropertyIcon name={amenityIcon(amenity)} /></span>
                              <span className="break-words">{amenity}</span>
                            </li>
                          ))}
                        </ul>
                      </PropertySection>
                    )}

                    <PropertySection title="Location">
                      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                        {listing.address?.trim() && <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Address</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm font-medium text-slate-800">{listing.address}</dd></div>}
                        <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Locality</dt><dd className="mt-1 break-words text-sm font-medium text-slate-800">{listing.locality}</dd></div>
                        {commonLandmark && <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Landmark</dt><dd className="mt-1 break-words text-sm font-medium text-slate-800">{commonLandmark}</dd></div>}
                        <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">City</dt><dd className="mt-1 text-sm font-medium text-slate-800">Pune</dd></div>
                      </dl>
                    </PropertySection>
                  </div>

                  <aside className="hidden self-start lg:sticky lg:top-6 lg:block">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg xl:p-6">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">NAREN REALTY</p>
                      <p className="mt-3 break-words text-lg font-bold text-[#10243A]">{listing.title}</p>
                      <p className="mt-1 break-words text-sm text-slate-600">{listing.locality}, Pune</p>
                      <p className="mt-5 text-3xl font-bold text-[#10243A]">{price}</p>
                      <div className="mt-6 space-y-3">
                        <button type="button" disabled={!visitsReady} onClick={() => setVisitOpen(true)} className="min-h-12 w-full rounded-lg bg-amber-400 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50">Book a Site Visit</button>
                        <button type="button" onClick={() => setEnquiryOpen(true)} className="min-h-12 w-full rounded-lg bg-[#10243A] px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-700">Send Enquiry</button>
                        <div className="flex flex-col items-center gap-1 border-t border-slate-100 pt-4">
                          <p className="text-sm font-semibold text-[#10243A]">Contact NAREN REALTY</p>
                          <ContactButton label="Contact NAREN REALTY" />
                        </div>
                      </div>
                      <p className="mt-4 text-xs leading-5 text-slate-500">{visitsReady ? "Visit requests are subject to confirmation." : "Visit requests are not available yet."} Owner contact details are not displayed.</p>
                    </div>
                  </aside>
                </div>
              </>}
      </section>

      {listing && !loading && (
        <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
          <div className="mx-auto grid max-w-lg grid-cols-2 gap-3">
            <button type="button" disabled={!visitsReady} onClick={() => setVisitOpen(true)} className="min-h-12 rounded-lg bg-amber-400 px-3 py-3 text-sm font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">Book Visit</button>
            <button type="button" onClick={() => setEnquiryOpen(true)} className="min-h-12 rounded-lg bg-[#10243A] px-3 py-3 text-sm font-bold text-white">Enquire Now</button>
          </div>
        </div>
      )}

      {visitOpen && listing && <VisitRequestForm propertyId={listing.id} title={listing.title} onClose={() => setVisitOpen(false)} />}
      {enquiryOpen && listing && <EnquiryModal propertyId={listing.id} propertyName={listing.title} locality={listing.locality} listing={listing} onClose={() => setEnquiryOpen(false)} />}
    </main>
  );
}

export default PropertyDetailClient;
