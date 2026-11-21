"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../lib/supabase-server";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type AdminDeleteKind = "enquiry" | "home-service" | "visit" | "task" | "google-form-requirement" | "referral" | "vendor-application" | "vendor-enquiry";

const config: Record<AdminDeleteKind, { table: string; paths: string[] }> = {
  enquiry: { table: "enquiries", paths: ["/admin/enquiries", "/admin/tasks", "/admin/analytics"] },
  "home-service": { table: "home_service_enquiries", paths: ["/admin/services"] },
  visit: { table: "visit_requests", paths: ["/admin/visits", "/manager"] },
  task: { table: "pending_tasks", paths: ["/admin/tasks", "/admin/analytics"] },
  "google-form-requirement": { table: "google_form_property_requirements", paths: ["/admin/google-form-requirements", "/admin/referrals"] },
  referral: { table: "referral_attributions", paths: ["/admin/referrals", "/admin/referral-rewards", "/account/referrals"] },
  "vendor-application": { table: "service_vendor_applications", paths: ["/admin/services/vendors", "/home-services/vendors"] },
  "vendor-enquiry": { table: "vendor_enquiries", paths: ["/admin/services/vendors", "/home-services/vendors"] },
};

export async function deleteAdminRecord(kind: AdminDeleteKind, id: string): Promise<{ ok: boolean; message: string }> {
  const { supabase } = await requireAdmin();
  if (!(kind in config) || typeof id !== "string" || !uuid.test(id)) {
    return { ok: false, message: "Invalid record selection." };
  }
  const item = config[kind];
  if (kind === "referral") {
    const { data: row, error: lookupError } = await supabase.from("referral_attributions").select("id,status").eq("id", id).maybeSingle();
    if (lookupError || !row || !["pending", "rejected"].includes(row.status)) return { ok: false, message: "Only pending or rejected referrals without reward activity can be deleted." };
    const { data: claim, error: claimError } = await supabase.from("referral_reward_claims").select("id").eq("referral_id", id).limit(1).maybeSingle();
    if (claimError || claim) return { ok: false, message: "This referral has a reward claim/history and is protected." };
  }
  if (kind === "vendor-application") {
    const { data: row, error: lookupError } = await supabase.from("service_vendor_applications").select("id,status").eq("id", id).maybeSingle();
    if (lookupError || !row || !["pending", "rejected"].includes(row.status)) return { ok: false, message: "Only pending or rejected applications can be deleted." };
    const { data: vendor, error: vendorError } = await supabase.from("service_vendors").select("id").eq("application_id", id).limit(1).maybeSingle();
    if (vendorError || vendor) return { ok: false, message: "This application has an active or historical vendor record and is protected." };
  }
  if (kind === "vendor-enquiry") {
    const { data: row, error: lookupError } = await supabase.from("vendor_enquiries").select("id,payment_status").eq("id", id).maybeSingle();
    if (lookupError || !row || row.payment_status === "paid") return { ok: false, message: "Paid or unverifiable vendor leads are protected from deletion." };
  }
  const { data, error } = await supabase.from(item.table).delete().eq("id", id).select("id").maybeSingle();
  if (error) {
    console.error("[admin-record-delete] Delete failed", { kind, code: error.code });
    return { ok: false, message: "Record could not be deleted. It may be linked to protected records." };
  }
  if (!data) return { ok: false, message: "Record not found or already deleted." };
  for (const path of item.paths) revalidatePath(path);
  return { ok: true, message: "Record deleted successfully." };
}
