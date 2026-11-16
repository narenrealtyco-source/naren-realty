"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../lib/supabase-server";

function uuid(value: FormDataEntryValue | null): string {
  const id = String(value ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Invalid record ID.");
  return id;
}

export async function reviewVendorApplication(form: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  const applicationId = uuid(form.get("application_id"));
  const decision = String(form.get("decision") ?? "");
  if (decision !== "approved" && decision !== "rejected") throw new Error("Invalid review decision.");
  const notes = String(form.get("admin_notes") ?? "").trim().slice(0, 1000);
  const { error } = await supabase.rpc("admin_review_service_vendor_application", {
    p_application_id: applicationId,
    p_decision: decision,
    p_admin_notes: notes || null,
  });
  if (error) throw new Error("Vendor application review failed. Check database migration and Admin permissions.");
  revalidatePath("/admin/home-services");
  revalidatePath("/home-services");
}

export async function markVendorLeadPaid(form: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  const enquiryId = uuid(form.get("enquiry_id"));
  const reference = String(form.get("payment_reference") ?? "").trim().slice(0, 120);
  const { error } = await supabase.rpc("admin_mark_vendor_lead_paid", {
    p_enquiry_id: enquiryId,
    p_payment_reference: reference || null,
  });
  if (error) throw new Error("Lead payment verification failed. Confirm payment and database setup.");
  revalidatePath("/admin/home-services");
  revalidatePath("/home-services/partner");
}

export async function updateVendorLeadPrice(form: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  const categoryId = uuid(form.get("category_id"));
  const raw = String(form.get("lead_unlock_price") ?? "").trim();
  const price = Number(raw);
  if (!raw || !Number.isFinite(price) || price < 0 || price > 1_000_000) {
    throw new Error("Enter a valid lead price between ₹0 and ₹10,00,000.");
  }
  const { error } = await supabase.rpc("admin_update_service_category_lead_price", {
    p_category_id: categoryId,
    p_lead_unlock_price: price,
  });
  if (error) throw new Error("Lead price could not be updated. Apply the secure pricing migration first.");
  revalidatePath("/admin/home-services");
  revalidatePath("/home-services/partner");
}
