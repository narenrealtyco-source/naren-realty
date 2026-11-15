"use server";

import { createSupabaseServerClient } from "../lib/supabase-server";
import { validateVendorApplication, validateVendorEnquiry, vendorMarketplaceReady } from "../lib/vendor-marketplace";

export type VendorState = { status: "idle" | "success" | "error"; message: string };

export async function applyAsVendor(_state: VendorState, form: FormData): Promise<VendorState> {
  if (!vendorMarketplaceReady()) return { status: "error", message: "Vendor applications are not available yet. Nothing was saved." };
  let input;
  try { input = validateVendorApplication(form); }
  catch (error) { return { status: "error", message: error instanceof Error ? error.message : "Invalid application." }; }
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { status: "error", message: "Please sign in to apply." };
  const { error } = await supabase.from("service_vendor_applications").insert(input);
  if (error) {
    console.error("[vendor] Application failed", { code: error.code });
    return { status: "error", message: error.code === "23505" ? "An application for this business and category already exists." : "Your application could not be saved. Please try again." };
  }
  return { status: "success", message: "Application received. Our team will review it before it appears publicly." };
}

export async function enquireVendor(_state: VendorState, form: FormData): Promise<VendorState> {
  if (!vendorMarketplaceReady()) return { status: "error", message: "Vendor enquiries are not available yet. Nothing was saved." };
  let input;
  try { input = validateVendorEnquiry(form); }
  catch (error) { return { status: "error", message: error instanceof Error ? error.message : "Invalid enquiry." }; }
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { status: "error", message: "Please sign in to send an enquiry." };
  const { error } = await supabase.from("vendor_enquiries").insert(input);
  if (error) {
    console.error("[vendor] Enquiry failed", { code: error.code });
    return { status: "error", message: "Your enquiry could not be saved. The vendor may no longer be available." };
  }
  return { status: "success", message: "Your enquiry was received. Our team will review it." };
}
