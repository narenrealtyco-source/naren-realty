"use server";

import { createSupabaseServerClient } from "../lib/supabase-server";
import { validateVendorApplication, vendorMarketplaceReady } from "../lib/vendor-marketplace";
import { revalidatePath } from "next/cache";

export type VendorState = { status: "idle" | "success" | "error"; message: string; enquiryId?: string };

export async function applyAsVendor(_state: VendorState, form: FormData): Promise<VendorState> {
  if (!vendorMarketplaceReady()) return { status: "error", message: "Vendor applications are not available yet. Nothing was saved." };
  let input;
  try { input = validateVendorApplication(form); }
  catch (error) { return { status: "error", message: error instanceof Error ? error.message : "Invalid application." }; }
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { status: "error", message: "Please sign in to apply." };
  const { category_ids, ...application } = input;
  const { data, error } = await supabase.rpc("submit_service_vendor_applications", { p_category_ids: category_ids, p_application: application });
  if (error || !data?.length) {
    console.error("[vendor] Application failed", { code: error?.code ?? "empty_result" });
    return { status: "error", message: error?.code === "23505" ? "An application for this business and one of the selected categories already exists." : "Your application could not be saved. Please try again." };
  }
  return { status: "success", message: "Application received for all selected categories. Our team will review it before it appears publicly." };
}

export async function enquireVendor(_state: VendorState, form: FormData): Promise<VendorState> {
  if (!vendorMarketplaceReady()) return { status: "error", message: "Vendor enquiries are not available yet. Nothing was saved." };
  const vendor_id = String(form.get("vendor_id") ?? "");
  const customer_name = String(form.get("customer_name") ?? "").trim();
  const mobile = String(form.get("mobile") ?? "").trim();
  const locality = String(form.get("locality") ?? "").trim();
  const full_address = String(form.get("full_address") ?? "").trim();
  const message = String(form.get("message") ?? "").trim();
  const contact_consent = form.get("contact_consent") === "on";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(vendor_id)
    || customer_name.length < 2 || customer_name.length > 120
    || !/^(?:[6-9]\d{9}|\+91[6-9]\d{9})$/.test(mobile)
    || locality.length < 2 || locality.length > 120
    || full_address.length < 5 || full_address.length > 500
    || message.length < 5 || message.length > 2000 || !contact_consent) {
    return { status: "error", message: "Please complete all fields and give contact-sharing consent." };
  }
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { status: "error", message: "Please sign in to send an enquiry." };
  const { data, error } = await supabase.rpc("submit_vendor_enquiry", {
    p_vendor_id: vendor_id, p_customer_name: customer_name, p_mobile: mobile,
    p_locality: locality, p_full_address: full_address, p_message: message,
    p_contact_consent: true,
  });
  if (error || typeof data !== "string") {
    console.error("[vendor] Enquiry failed", { code: error?.code ?? "empty_result" });
    return { status: "error", message: error?.message?.includes("verified") ? "This provider is not currently available." : "Your enquiry could not be saved. Please try again." };
  }
  revalidatePath("/home-services/vendor/requests");
  return { status: "success", message: "Your request has been sent to this provider. They have 60 seconds to respond.", enquiryId: data };
}

export async function respondToVendorEnquiry(enquiryId: string, decision: "accept" | "decline") {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { ok: false, message: "Please sign in." };
  const { data, error } = await supabase.rpc("respond_to_vendor_enquiry", { p_enquiry_id: enquiryId, p_decision: decision });
  if (error) return { ok: false, message: error.message || "Could not respond to this request." };
  revalidatePath("/home-services/vendor/requests");
  return { ok: true, status: data as string, message: decision === "accept" ? "Request accepted." : "Request declined. Customer can choose another provider." };
}
