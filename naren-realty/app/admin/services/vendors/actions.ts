"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../../lib/supabase-server";
import { uuid, vendorMarketplaceReady } from "../../../lib/vendor-marketplace";
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
    if (error?.code === "23503") return { status: "error", message: "This category is in use. Deactivate it instead." };
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
  } else if (action === "approve" || action === "reject") {
    const id = form.get("id");
    const notes = form.get("notes");
    if (typeof id !== "string" || !uuid(id) || typeof notes !== "string" || notes.length > 1000 || notes.includes("\0")) return { status: "error", message: "Invalid application review details." };
    const result = await supabase.rpc("admin_review_service_vendor_application", {
      p_application_id: id,
      p_decision: action === "approve" ? "approved" : "rejected",
      p_admin_notes: notes.trim() || null,
    });
    error = result.error;
  } else if (action === "mark-lead-paid") {
    const id = form.get("id");
    const reference = form.get("payment_reference");
    if (typeof id !== "string" || !uuid(id) || typeof reference !== "string" || reference.length > 120 || reference.includes("\0")) return { status: "error", message: "Invalid lead payment details." };
    const result = await supabase.rpc("admin_mark_vendor_lead_paid", {
      p_enquiry_id: id,
      p_payment_reference: reference.trim() || null,
    });
    error = result.error;
  } else {
    return { status: "error", message: "This marketplace action is not available in the current database workflow." };
  }

  if (error) {
    console.error("[vendor] Admin update failed", { code: error.code });
    return { status: "error", message: "The change could not be saved." };
  }
  revalidatePath("/admin/services/vendors");
  revalidatePath("/home-services/vendors");
  revalidatePath("/home-services");
  return { status: "success", message: "Saved." };
}
