"use server";

import { getApprovedPropertiesFromSupabase } from "../lib/supabase-properties";
import type { PropertyListing } from "../lib/properties";

export async function loadApprovedProperties(): Promise<PropertyListing[]> {
  return getApprovedPropertiesFromSupabase();
}
