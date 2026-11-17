import { supabase } from "./supabase";
import {
  PROPERTY_CATEGORIES,
  type ListingType,
  type PropertyCategoryDetails,
  type PropertyDetails,
  type PropertyListing,
} from "./properties";

const PROPERTY_COLUMNS = [
  "id",
  "owner_id",
  "title",
  "category",
  "locality",
  "price",
  "details",
  "photos",
  "status",
  "created_at",
  "updated_at",
].join(",");

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(row: JsonRecord, field: string): string {
  const value = row[field];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Supabase property is missing a valid "${field}" value.`);
  }
  return value;
}

function optionalString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown): number {
  const number = typeof value === "number" ? value : Number(value ?? 0);
  if (!Number.isFinite(number)) throw new Error("Supabase property contains an invalid number.");
  return number;
}

function listingType(value: unknown): ListingType {
  if (typeof value === "string" && PROPERTY_CATEGORIES.includes(value as ListingType)) {
    return value as ListingType;
  }
  throw new Error("Supabase property contains an unsupported category.");
}

function listingStatus(value: unknown): PropertyListing["status"] {
  if (value === "pending") return "Pending Approval";
  if (value === "approved") return "Approved";
  if (value === "rejected") return "Rejected";
  throw new Error("Supabase property contains an unsupported status.");
}

function mapListing(value: unknown): PropertyListing {
  if (!isRecord(value)) throw new Error("Supabase returned an invalid property record.");

  const details = isRecord(value.details) ? value.details : {};
  const photos = Array.isArray(value.photos)
    ? value.photos.filter((photo): photo is string => typeof photo === "string").map((path) =>
      path.startsWith("http") ? path : supabase.storage.from("property-photos").getPublicUrl(
        path.startsWith("property-photos/") ? path.slice("property-photos/".length) : path,
      ).data.publicUrl)
    : [];
  const type = listingType(value.category);

  return {
    id: requiredString(value, "id"),
    ownerId: requiredString(value, "owner_id"),
    ownerName: "",
    ownerEmail: "",
    ownerMobile: "",
    title: requiredString(value, "title"),
    type,
    locality: requiredString(value, "locality"),
    address: optionalString(details.address),
    landmark: optionalString(details.landmark),
    availableFrom: optionalString(details.availableFrom),
    price: numberValue(value.price),
    bedrooms: numberValue(details.bedrooms),
    bathrooms: numberValue(details.bathrooms),
    furnishing: optionalString(details.furnishingStatus ?? details.furnishing),
    description: optionalString(details.description),
    photos,
    categoryDetails: details as PropertyCategoryDetails,
    status: listingStatus(value.status),
    createdAt: optionalString(value.created_at),
    updatedAt: optionalString(value.updated_at),
  };
}

async function authenticatedUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Customer authentication is required.");
  return data.user.id;
}

export async function hasSupabaseOwnerCapability(): Promise<boolean> {
  const userId = await authenticatedUserId();
  const { data, error } = await supabase
    .from("profile_capabilities")
    .select("capability")
    .eq("user_id", userId)
    .eq("capability", "owner")
    .maybeSingle();

  if (error) throw new Error("Owner capability could not be verified.");
  return Boolean(data);
}

export async function getSupabaseOwnerListings(): Promise<PropertyListing[]> {
  const userId = await authenticatedUserId();
  const { data, error } = await supabase
    .from("properties")
    .select(PROPERTY_COLUMNS)
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw new Error("Your Supabase Owner listings could not be loaded.");
  return (data ?? []).map(mapListing);
}

function detailsPayload(details: PropertyDetails): JsonRecord {
  return {
    ...(isRecord(details.categoryDetails) ? details.categoryDetails : {}),
    address: details.address ?? "",
    landmark: details.landmark ?? "",
    availableFrom: details.availableFrom ?? "",
    bedrooms: details.bedrooms,
    bathrooms: details.bathrooms,
    furnishingStatus: details.furnishing,
    description: details.description,
  };
}

async function normalizeAndUploadPhotos(photos: string[], userId: string): Promise<{ paths: string[]; uploaded: string[] }> {
  if (!Array.isArray(photos) || photos.length < 1 || photos.length > 5) {
    throw new Error("Upload between 1 and 5 property photos.");
  }
  const paths: string[] = [];
  const uploaded: string[] = [];
  try {
    for (const photo of photos) {
      if (photo.startsWith("data:")) {
        const response = await fetch(photo);
        if (!response.ok) throw new Error("A selected property photo could not be read.");
        const blob = await response.blob();
        if (!["image/jpeg", "image/png", "image/webp"].includes(blob.type) || blob.size < 1 || blob.size > 5 * 1024 * 1024) {
          throw new Error("Each property photo must be JPEG, PNG or WebP under 5 MB.");
        }
        const path = `${userId}/${crypto.randomUUID()}`;
        const { error } = await supabase.storage.from("property-photos").upload(path, blob, {
          contentType: blob.type,
          upsert: false,
        });
        if (error) throw new Error("A property photo could not be uploaded. Please try again.");
        paths.push(path);
        uploaded.push(path);
        continue;
      }

      let path = photo;
      if (/^https?:/i.test(photo)) {
        try {
          const url = new URL(photo);
          const marker = "/storage/v1/object/public/property-photos/";
          const position = url.pathname.indexOf(marker);
          if (position < 0) throw new Error("Invalid property photo URL.");
          path = decodeURIComponent(url.pathname.slice(position + marker.length));
        } catch {
          throw new Error("An existing property photo could not be verified.");
        }
      }
      if (!path.startsWith(`${userId}/`) || path.includes("..") || path.startsWith("/")) {
        throw new Error("An existing property photo could not be verified.");
      }
      paths.push(path);
    }
    return { paths, uploaded };
  } catch (error) {
    if (uploaded.length) await supabase.storage.from("property-photos").remove(uploaded);
    throw error;
  }
}

function propertyPayload(details: PropertyDetails, photos: string[]) {
  return {
    title: details.title.trim(),
    category: details.type,
    locality: details.locality.trim(),
    price: details.price,
    details: detailsPayload(details),
    photos,
    status: "pending" as const,
  };
}

export async function createSupabaseOwnerListing(details: PropertyDetails): Promise<PropertyListing> {
  const userId = await authenticatedUserId();
  const { paths, uploaded } = await normalizeAndUploadPhotos(details.photos, userId);
  const { data, error } = await supabase
    .from("properties")
    .insert({ owner_id: userId, ...propertyPayload(details, paths) })
    .select(PROPERTY_COLUMNS)
    .single();

  if (error || !data) {
    if (uploaded.length) await supabase.storage.from("property-photos").remove(uploaded);
    throw new Error("Your property could not be submitted for approval.");
  }
  return mapListing(data);
}

export async function updateSupabaseOwnerListing(
  listingId: string,
  details: PropertyDetails,
): Promise<PropertyListing> {
  const userId = await authenticatedUserId();
  const { paths, uploaded } = await normalizeAndUploadPhotos(details.photos, userId);
  const { data, error } = await supabase
    .from("properties")
    .update(propertyPayload(details, paths))
    .eq("id", listingId)
    .eq("owner_id", userId)
    .select(PROPERTY_COLUMNS)
    .single();

  if (error || !data) {
    if (uploaded.length) await supabase.storage.from("property-photos").remove(uploaded);
    throw new Error("Your property could not be updated.");
  }
  return mapListing(data);
}
