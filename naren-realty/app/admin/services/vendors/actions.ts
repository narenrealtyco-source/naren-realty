"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../../lib/supabase-server";
import { uuid, validateVendorApplication, vendorMarketplaceReady } from "../../../lib/vendor-marketplace";
import type { VendorState } from "../../../home-services/vendor-actions";

export async function manageMarketplace(_state: VendorState, form: FormData): Promise<VendorState> {
  if (!vendorMarketplaceReady()) return { status: "error", message: "Marketplace setup is not complete. Nothing was saved." };
  let supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"];
  try { ({ supabase } = await requireAdmin()); }
  catch { return { status: "error", message: "Admin authorization is required." }; }
  const action = form.get("action");
  let error: { code?: string } | null = null;
  if (action === "add-category") {
    const name = form.get("name");
    const slug = form.get("slug");
    if (typeof name !== "string" || !name.trim() || name.trim().length > 100 || typeof slug !== "string" || slug.length > 100 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return { status: "error", message: "Enter a valid name and lowercase hyphenated slug." };
    ({ error } = await supabase.from("service_categories").insert({ name: name.trim(), slug }));
  } else if (action === "remove-category") {
    const id = form.get("id");
    if (typeof id !== "string" || !uuid(id)) return { status: "error", message: "Invalid category." };
    const result = await supabase.from("service_categories").delete().eq("id", id).select("id").maybeSingle();
    error = result.error;
    if (error?.code === "23503") return { status: "error", message: "This category is in use. Deactivate it instead to preserve provider and enquiry records." };
    if (!error && !result.data) return { status: "error", message: "Category was not removed." };
  } else if (action === "enable-category" || action === "disable-category" || action === "rename-category") {
    const id = form.get("id");
    if (typeof id !== "string" || !uuid(id)) return { status: "error", message: "Invalid category." };
    const name = form.get("name");
    if (action === "rename-category" && (typeof name !== "string" || !name.trim() || name.trim().length > 100 || name.includes("\0"))) return { status: "error", message: "Enter a valid category name." };
    const update = action === "rename-category" && typeof name === "string" ? { name: name.trim() } : { active: action === "enable-category" };
    const result = await supabase.from("service_categories").update(update).eq("id", id).select("id").maybeSingle();
    error = result.error;
    if (!error && !result.data) return { status: "error", message: "Category was not updated." };
  } else if (action === "edit-vendor") {
    const id = form.get("id");
    if (typeof id !== "string" || !uuid(id)) return { status: "error", message: "Invalid provider." };
    let data;
    try { data = validateVendorApplication(form); }
    catch (validationError) { return { status: "error", message: validationError instanceof Error ? validationError.message : "Invalid provider details." }; }
    ({ error } = await supabase.rpc("admin_edit_service_vendor", { p_id: id, p_data: data }));
  } else if (typeof action === "string" && ["approve", "reject", "activate", "deactivate"].includes(action)) {
    const id = form.get("id");
    const terms = form.get("terms");
    if (typeof id !== "string" || !uuid(id) || typeof terms !== "string" || terms.length > 1000 || terms.includes("\0")) return { status: "error", message: "Invalid review or commission terms." };
    ({ error } = await supabase.rpc("review_service_vendor", { p_id: id, p_action: action, p_terms: terms.trim() }));
  } else if (action === "update-enquiry") {
    const id = form.get("id");
    const status = form.get("status");
    const remarks = form.get("remarks");
    if (typeof id !== "string" || !uuid(id) || typeof status !== "string" || !["pending", "contacted", "completed", "cancelled"].includes(status) || typeof remarks !== "string" || remarks.length > 2000 || remarks.includes("\0")) return { status: "error", message: "Invalid enquiry status or follow-up." };
    ({ error } = await supabase.rpc("admin_update_vendor_enquiry", { p_id: id, p_status: status, p_remarks: remarks.trim() }));
  } else return { status: "error", message: "Invalid marketplace action." };
  if (error) {
    console.error("[vendor] Admin update failed", { code: error.code });
    return { status: "error", message: "The change could not be saved." };
  }
  revalidatePath("/admin/services/vendors");
  revalidatePath("/home-services/vendors");
  revalidatePath("/home-services");
  return { status: "success", message: "Saved." };
}
