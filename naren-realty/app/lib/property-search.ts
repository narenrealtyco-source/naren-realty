import type { PropertyListing } from "./properties";

export function matchesPropertyLocation(listing: PropertyListing, query: string): boolean {
  const searches = query.split(",").map((item) => item.trim().toLocaleLowerCase()).filter(Boolean);
  if (!searches.length) return true;
  const listingLocations = [listing.locality, listing.landmark, listing.publicListingDetails?.values.common_landmark]
    .filter((value): value is string => typeof value === "string").map((value) => value.toLocaleLowerCase());
  return searches.some((search) => listingLocations.some((value) => value.includes(search)));
}
