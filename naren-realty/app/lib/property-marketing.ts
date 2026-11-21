import type { ListingType, PropertyListing } from "./properties";

export type AvailabilityConfirmation = "immediate" | "date";
export type PropertyBadge = "Available Now" | "Quick Move-in" | "Low Deposit" | "Budget Friendly";

export function propertyActionLabel(type: ListingType): string {
  if (type === "PG") return "Book a Visit";
  if (type === "Airbnb") return "Check Availability";
  return "Schedule a Visit";
}

export function indiaCalendarDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function median(values: number[]): number | undefined {
  if (values.length < 3) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function deposit(listing: PropertyListing): number | undefined {
  const value = listing.type === "Rental" ? listing.publicListingDetails?.values.Rental_deposit
    : listing.type === "Airbnb" ? listing.publicListingDetails?.values.Airbnb_deposit : undefined;
  if (typeof value !== "string" || !/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(value)) return undefined;
  const result = Number(value);
  return Number.isFinite(result) && result >= 0 ? result : undefined;
}

export function propertyBadge(listing: PropertyListing, activeListings: PropertyListing[], now = new Date()): PropertyBadge | undefined {
  if (listing.status !== "Approved") return undefined;
  const todayString = indiaCalendarDate(now);
  if (listing.availabilityConfirmation === "immediate" && (!listing.availableFrom || listing.availableFrom <= todayString)) return "Available Now";
  if (listing.availabilityConfirmation === "date" && listing.availableFrom && /^\d{4}-\d{2}-\d{2}$/.test(listing.availableFrom)) {
    const date = Date.parse(`${listing.availableFrom}T00:00:00Z`);
    const today = Date.parse(`${todayString}T00:00:00Z`);
    if (Number.isFinite(date) && new Date(date).toISOString().slice(0, 10) === listing.availableFrom && date >= today && date - today <= 7 * 86400000) return "Quick Move-in";
  }
  if (!listing.locality.trim()) return undefined;
  const peers = activeListings.filter((item) => item.id !== listing.id && item.status === "Approved" && item.type === listing.type && item.locality.trim().toLocaleLowerCase("en-IN") === listing.locality.trim().toLocaleLowerCase("en-IN"));
  if (listing.type === "Rental" || listing.type === "Airbnb") {
    const ownDeposit = deposit(listing);
    const depositMedian = median(peers.map(deposit).filter((value): value is number => value !== undefined));
    if (ownDeposit !== undefined && depositMedian !== undefined && depositMedian > 0 && ownDeposit <= depositMedian * 0.8) return "Low Deposit";
  }
  // Rental and PG listing prices are monthly; short-stay prices and resale prices are not rent.
  if (listing.type !== "Rental" && listing.type !== "PG") return undefined;
  const rentMedian = median(peers.map((item) => item.price).filter((value) => Number.isFinite(value) && value > 0));
  if (Number.isFinite(listing.price) && listing.price > 0 && rentMedian !== undefined && listing.price <= rentMedian * 0.9) return "Budget Friendly";
  return undefined;
}
