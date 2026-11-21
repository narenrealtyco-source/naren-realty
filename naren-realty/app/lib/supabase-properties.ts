import "server-only";
import { createSupabaseServerClient } from "./supabase-server";
import { mapPublicProperty } from "./public-property-mapping";
import type { PropertyListing } from "./properties";

export async function getApprovedPropertiesFromSupabase(): Promise<PropertyListing[]> {
  const supabase = await createSupabaseServerClient();
  const listings: PropertyListing[] = [];
  for (;;) {
    const { data, error, count } = await supabase.from("properties")
      .select("id,owner_id,title,category,locality,price,photos,status,created_at,updated_at,carpet_area:details->>carpetArea,bedrooms:details->>bedrooms,bathrooms:details->>bathrooms,public_listing:details->publicListing")
      .eq("status", "approved").order("id").range(listings.length, listings.length + 99);
    if (error) {
      console.error("[public-properties] Approved property lookup failed", { code: error.code });
      throw new Error("Approved properties could not be loaded.");
    }
    const batch = data ?? [];
    listings.push(...batch.map((row) => mapPublicProperty(row, (path) =>
      supabase.storage.from("property-photos").getPublicUrl(path).data.publicUrl)));
    if (batch.length < 100) break;
  }
  return listings;
}
