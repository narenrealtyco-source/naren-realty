"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../lib/supabase-server";
import { getAdminEnquiriesFromSupabase } from "../../lib/admin-supabase-data";
import { ENQUIRY_STATUSES, type EnquiryRecord } from "../../lib/enquiries";

export async function loadAdminEnquiries(): Promise<EnquiryRecord[]> {
  await requireAdmin();
  return getAdminEnquiriesFromSupabase();
}

export async function updateAdminEnquiryStatus(
  enquiryId: string,
  status: EnquiryRecord["status"],
): Promise<void> {
  const { supabase } = await requireAdmin();
  const normalizedId = enquiryId.trim();
  if (!normalizedId) throw new Error("An enquiry ID is required.");
  if (!ENQUIRY_STATUSES.includes(status)) throw new Error("The enquiry status is invalid.");
  const { data, error } = await supabase
    .from("enquiries")
    .update({ status })
    .eq("id", normalizedId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`Could not update enquiry status in Supabase: ${error.message}`);
  }
  if (!data) throw new Error("The enquiry could not be found.");
  revalidatePath("/admin/enquiries");
}

export async function updateAdminEnquiryDetails(
  enquiryId: string,
  details: Pick<EnquiryRecord, "adminCallNotes" | "nextFollowUpDate">,
): Promise<void> {
  const { supabase } = await requireAdmin();
  const normalizedId = enquiryId.trim();
  if (!normalizedId) throw new Error("An enquiry ID is required.");
  const parsedFollowUpDate = details.nextFollowUpDate
    ? new Date(`${details.nextFollowUpDate}T00:00:00.000Z`)
    : null;
  if (parsedFollowUpDate && Number.isNaN(parsedFollowUpDate.getTime())) {
    throw new Error("The follow-up date is invalid.");
  }
  const followUpDate = parsedFollowUpDate?.toISOString() ?? null;

  const { data, error } = await supabase
    .from("enquiries")
    .update({
      admin_notes: details.adminCallNotes ?? null,
      follow_up_date: followUpDate,
    })
    .eq("id", normalizedId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`Could not update enquiry follow-up details in Supabase: ${error.message}`);
  }
  if (!data) throw new Error("The enquiry could not be found.");
  revalidatePath("/admin/enquiries");
}
