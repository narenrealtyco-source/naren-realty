import { PROPERTY_CATEGORIES, type PropertyListing } from "./properties";
import { validateSubmissionDetails } from "./submission-details";

function text(value: unknown, required = false): string {
  if (typeof value !== "string" || (required && !value.trim())) {
    if (required) throw new Error("Approved property contains invalid required fields.");
    return "";
  }
  return value;
}

function number(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  const result = Number(value);
  if (!Number.isFinite(result) || result < 0) throw new Error("Approved property contains an invalid number.");
  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function mapPublicProperty(value: unknown, publicUrl: (path: string) => string): PropertyListing {
  if (!isRecord(value)) throw new Error("Invalid approved property.");
  const row = value;
  const category = PROPERTY_CATEGORIES.find((candidate) => candidate === row.category);
  if (!category || row.status !== "approved") throw new Error("Property is not approved or has an invalid category.");
  if (row.photos !== null && row.photos !== undefined && (!Array.isArray(row.photos) || !row.photos.every((path) => typeof path === "string" && !/^(?:https?:|data:)/i.test(path)))) {
    throw new Error("Approved property contains invalid photo paths.");
  }
  const paths: string[] = Array.isArray(row.photos) ? row.photos : [];
  const publicListing = isRecord(row.public_listing) ? row.public_listing : null;
  let publicDetails;
  if (publicListing) publicDetails = validateSubmissionDetails(publicListing.details);
  return {
    id: text(row.id, true),
    ownerId: text(row.owner_id, true),
    ownerName: "", ownerEmail: "", ownerMobile: "",
    title: text(row.title, true), type: category,
    locality: text(row.locality, true), price: number(row.price),
    bedrooms: number(row.bedrooms), bathrooms: number(row.bathrooms),
    furnishing: "", description: publicListing ? text(publicListing.description) : "", area: number(row.carpet_area),
    address: publicListing ? text(publicListing.address) : "",
    publicListingDetails: publicDetails,
    availableFrom: publicDetails?.values.common_available_from,
    availabilityConfirmation: publicListing?.availabilityConfirmation === "immediate" || publicListing?.availabilityConfirmation === "date" ? publicListing.availabilityConfirmation : undefined,
    videoUrl: publicListing && typeof publicListing.videoPath === "string" && publicListing.videoPath.trim() ? `/properties/${encodeURIComponent(text(row.id, true))}/video` : undefined,
    photos: paths.map((path, index) => path.startsWith("private-submission/")
      ? `/properties/${encodeURIComponent(text(row.id, true))}/photos/${index}`
      : publicUrl(path.startsWith("property-photos/") ? path.slice("property-photos/".length) : path)),
    status: "Approved", createdAt: text(row.created_at), updatedAt: text(row.updated_at),
  };
}
