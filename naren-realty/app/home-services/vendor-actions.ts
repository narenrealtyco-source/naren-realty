"use server";

import { createSupabaseServerClient } from "../lib/supabase-server";
import { validateVendorApplication, validateVendorEnquiry, vendorMarketplaceReady } from "../lib/vendor-marketplace";

export type VendorState = { status: "idle" | "success" | "error"; message: string };

async function sendVendorApplicationEmail(email: string, name: string, businessName: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[vendor] Confirmation email skipped: RESEND_API_KEY is missing.");
    return false;
  }
  const dashboardUrl = "https://narenrealty.co/services/vendor/dashboard";
  const loginUrl = "https://narenrealty.co/account#login";
  const safe = (value: string) => value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#182B40;line-height:1.6"><div style="background:#10243A;color:white;padding:22px"><h2>NAREN REALTY</h2><p>Home Services · Service Partner Registration</p></div><div style="padding:24px;border:1px solid #ddd"><p>Hello ${safe(name)},</p><p>Thank you for registering <strong>${safe(businessName)}</strong> with NAREN REALTY Home Services.</p><p>Your application has been received and is pending review by our team. We will notify you when its status changes.</p><p><a href="${dashboardUrl}" style="display:inline-block;background:#10243A;color:#fff;padding:12px 18px;text-decoration:none;border-radius:8px">Open Vendor Dashboard</a></p><p>Sign in with the same account used during registration:</p><p><a href="${loginUrl}">Vendor Login</a></p><p>Dashboard: <a href="${dashboardUrl}">${dashboardUrl}</a></p><p>Regards,<br>NAREN REALTY Team</p></div></div>`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "NAREN REALTY <noreply@narenrealty.co>",
      to: [email],
      subject: "NAREN REALTY – Vendor Registration Received",
      html,
      text: `Hello ${name}, your application for ${businessName} has been received and is pending review. Vendor dashboard: ${dashboardUrl} Login: ${loginUrl} Regards, NAREN REALTY Team.`,
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    console.error("[vendor] Confirmation email provider error", { status: response.status });
    return false;
  }
  return true;
}

export async function applyAsVendor(_state: VendorState, form: FormData): Promise<VendorState> {
  if (!vendorMarketplaceReady()) return { status: "error", message: "Vendor applications are not available yet. Nothing was saved." };
  let input;
  try { input = validateVendorApplication(form); }
  catch (error) { return { status: "error", message: error instanceof Error ? error.message : "Invalid application." }; }
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { status: "error", message: "Please sign in to apply." };
  const { category_ids, ...application } = input;
  const { data, error } = await supabase.rpc("submit_service_vendor_applications", {
    p_category_ids: category_ids,
    p_application: application,
  });
  if (error || !data?.length) {
    console.error("[vendor] Application failed", { code: error?.code ?? "empty_result" });
    return { status: "error", message: error?.code === "23505" ? "An application for this business and one of the selected categories already exists." : "Your application could not be saved. Please try again." };
  }
  const emailSent = user.email
    ? await sendVendorApplicationEmail(user.email, application.contact_person, application.business_name)
    : false;
  return {
    status: "success",
    message: emailSent
      ? "Application received. A confirmation email with your Vendor Dashboard login link has been sent to your registered email."
      : "Application received. Your Vendor Dashboard is available after signing in. Email delivery could not be confirmed; please check your registered email address.",
  };
}

export async function enquireVendor(_state: VendorState, form: FormData): Promise<VendorState> {
  if (!vendorMarketplaceReady()) return { status: "error", message: "Vendor enquiries are not available yet. Nothing was saved." };
  let input;
  try { input = validateVendorEnquiry(form); }
  catch (error) { return { status: "error", message: error instanceof Error ? error.message : "Invalid enquiry." }; }
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { status: "error", message: "Please sign in to send an enquiry." };
  const { error } = await supabase.rpc("submit_vendor_enquiry", {
    p_vendor_id: input.vendor_id,
    p_customer_name: input.customer_name,
    p_mobile: input.mobile,
    p_locality: input.locality,
    p_full_address: input.full_address,
    p_message: input.message,
    p_contact_consent: input.contact_consent,
  });
  if (error) {
    console.error("[vendor] Enquiry failed", { code: error.code });
    return { status: "error", message: "Your enquiry could not be saved. The vendor may no longer be available." };
  }
  return { status: "success", message: "Your enquiry was received. Our team will review it." };
}


export async function respondToVendorLead(form: FormData): Promise<void> {
  const enquiryId = form.get("enquiry_id");
  const decision = form.get("decision");
  if (typeof enquiryId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(enquiryId)) {
    throw new Error("Invalid service lead.");
  }
  if (decision !== "accept" && decision !== "decline") {
    throw new Error("Choose accept or decline.");
  }
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Please sign in to manage service leads.");
  const { error } = await supabase.rpc("vendor_respond_to_enquiry", {
    p_enquiry_id: enquiryId,
    p_decision: decision,
  });
  if (error) {
    console.error("[vendor] Lead response failed", { code: error.code });
    throw new Error("This service lead could not be updated. Refresh and try again.");
  }
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/services/vendor/dashboard");
  revalidatePath("/admin/services/vendors");
}
