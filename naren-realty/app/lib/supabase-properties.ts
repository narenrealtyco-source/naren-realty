import "server-only";
import { createSupabaseServerClient } from "./supabase-server";
import { mapPublicProperty } from "./public-property-mapping";
import type { PropertyListing } from "./properties";

export async function getApprovedPropertiesFromSupabase(): Promise<PropertyListing[]> {
  const supabase = await createSupabaseServerClient();
  const listings: PropertyListing[] = [];
  for (;;) {
    const { data, error, count } = await supabase.from("properties")
      .select("id,owner_id,title,category,locality,price,photos,status,created_at,updated_at,carpet_area:details->>carpetArea,bedrooms:details->>bedrooms,bathrooms:details->>bathrooms,furnishing:details->>furnishingStatus,public_listing:details->publicListing", { count: "exact" })
      .eq("status", "approved").order("id").range(listings.length, listings.length + 99);
    if (error || count === null || (!data?.length && listings.length < count)) {
      console.error("[public-properties] Approved property lookup failed", { code: error?.code, missingCount: count === null });
      throw new Error("Approved properties could not be loaded.");
    }
    listings.push(...(data ?? []).map((row) => mapPublicProperty(row, (path) =>
      supabase.storage.from("property-photos").getPublicUrl(path).data.publicUrl)));
    if (listings.length >= count) break;
  }
  return listings;
}
