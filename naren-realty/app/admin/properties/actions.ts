"use server";

import { revalidatePath } from "next/cache";
import {
  getAdminPropertiesFromSupabase,
  type AdminPropertyRecord,
} from "../../lib/admin-supabase-data";
import { requireAdmin } from "../../lib/supabase-server";

type AdminPropertyStatus = "approved" | "rejected";

export async function loadAdminProperties(): Promise<AdminPropertyRecord[]> {
  await requireAdmin();
  return getAdminPropertiesFromSupabase();
}

export async function approveAdminProperty(propertyId: string): Promise<void> {
  const { supabase } = await requireAdmin();
  await updatePropertyStatus(supabase, propertyId, "approved");
  revalidatePath("/admin/properties");
  revalidatePath("/properties");
  revalidatePath(`/properties/${propertyId}`);
}

export async function rejectAdminProperty(propertyId: string): Promise<void> {
  const { supabase } = await requireAdmin();
  await updatePropertyStatus(supabase, propertyId, "rejected");
  revalidatePath("/admin/properties");
  revalidatePath("/properties");
  revalidatePath(`/properties/${propertyId}`);
}

async function updatePropertyStatus(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  propertyId: string,
  status: AdminPropertyStatus,
): Promise<void> {
  const normalizedId = propertyId.trim();
  if (!normalizedId) {
    throw new Error("A property ID is required.");
  }

  const { data, error } = await supabase
    .from("properties")
    .update({ status })
    .eq("id", normalizedId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`Could not update property status in Supabase: ${error.message}`);
  }
  if (!data) {
    throw new Error("The property could not be found.");
  }
}
