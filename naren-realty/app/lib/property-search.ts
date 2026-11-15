import type { PropertyListing } from "./properties";

export function matchesPropertyLocation(listing: PropertyListing, query: string): boolean {
  const search = query.trim().toLocaleLowerCase();
  if (!search) return true;
  return [listing.locality, listing.landmark, listing.publicListingDetails?.values.common_landmark]
    .some((value) => typeof value === "string" && value.toLocaleLowerCase().includes(search));
}
