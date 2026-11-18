"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient, requireAdmin } from "./lib/supabase-server";
import { requirementsReady, matchesReady, validateLoan, validateMatch, validUuid } from "./lib/requirements";

export type RequirementState = { status: "idle" | "success" | "error"; message: string };
export async function submitRequirement(kind: "match" | "loan", _state: RequirementState, form: FormData): Promise<RequirementState> {
  if (kind !== "match" && kind !== "loan") return { status: "error", message: "Invalid requirement type." };
  if (kind === "match" ? !matchesReady() : !requirementsReady()) return { status: "error", message: "Requirements are unavailable. Nothing was saved." };

  let input;
  try {
    input = kind === "match" ? validateMatch(form) : validateLoan(form);
    if (kind === "match" && form.get("brokerage_acknowledged") !== "on") throw new Error("Please accept the applicable brokerage terms before submitting.");
  }
  catch (error) { return { status: "error", message: error instanceof Error ? error.message : "Invalid requirement." }; }

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { status: "error", message: "Sign in before submitting a requirement." };

  let error;
  if ("purpose" in input) {
    const payload = {
      customer_id: user.id,
      requirement_type: input.purpose.toLowerCase(),
      property_category: input.category === "Short Stay" ? "short_stay" : input.category.toLowerCase(),
      preferred_location: input.location,
      preferred_bhk: input.bedrooms,
      min_budget: input.min_budget,
      max_budget: input.max_budget,
      move_in_date: input.move_in_date,
      additional_requirements: input.details || null,
      customer_name: input.customer_name,
      customer_phone: input.phone
    };
    ({ error } = await supabase.from("property_requirements").insert(payload));
  } else {
    ({ error } = await supabase.from("loan_requirements").insert(input));
  }

  if (error) {
    console.error("[requirements] Insert failed", { code: error.code });
    return { status: "error", message: "Your requirement could not be saved. Please try again." };
  }
  revalidatePath(kind === "match" ? "/matches" : "/loans");
  return { status: "success", message: "Your requirement was saved. Our team will review it." };
}
export async function closeMatch(_state: RequirementState, form: FormData): Promise<RequirementState> {
  if (!matchesReady()) return { status: "error", message: "Requirements are unavailable. Nothing was changed." };
  const id = form.get("id");
  if (typeof id !== "string" || !validUuid(id)) return { status: "error", message: "Invalid requirement." };
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { status: "error", message: "Please sign in." };
  const { data, error } = await supabase.from("property_requirements").update({ status: "closed" }).eq("id", id).eq("customer_id", user.id).select("id").maybeSingle();
  if (error || !data) {
    console.error("[requirements] Close failed", { code: error?.code });
    return { status: "error", message: "The requirement could not be closed." };
  }
  revalidatePath("/matches");
  return { status: "success", message: "Requirement closed." };
}
export async function updateRequirement(_state: RequirementState, form: FormData): Promise<RequirementState> {
  if (!requirementsReady()) return { status: "error", message: "Requirements are unavailable. Nothing was changed." };
  let supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"];
  try { ({ supabase } = await requireAdmin()); } catch { return { status: "error", message: "Admin authorization is required." }; }
  const id = form.get("id"), kind = form.get("kind"), status = form.get("status"), remarks = form.get("remarks"), assigned = form.get("assigned_to");
  const statuses = kind === "match" ? ["New", "Contacted", "Closed"] : ["New", "Contacted", "Documents Pending", "Under Process", "Approved", "Rejected", "Closed"];
  if (typeof id !== "string" || !validUuid(id) || (kind !== "match" && kind !== "loan") || typeof status !== "string" || !statuses.includes(status) || typeof remarks !== "string" || remarks.length > 2000 || remarks.includes("\0") || typeof assigned !== "string" || (assigned && !validUuid(assigned))) return { status: "error", message: "Invalid status or follow-up." };
  if (kind === "loan") {
    const { error } = await supabase.rpc("admin_update_loan_requirement", { p_id: id, p_status: status, p_remarks: remarks.trim(), p_assigned_to: assigned || null });
    if (error) { console.error("[requirements] Loan admin update failed", { code: error.code }); return { status: "error", message: "The requirement could not be updated." }; }
  } else {
    const { data, error } = await supabase.from("property_requirements").update({ status: status.toLowerCase(), admin_notes: remarks.trim() || null }).eq("id", id).select("id").maybeSingle();
    if (error || !data) { console.error("[requirements] Property admin update failed", { code: error?.code }); return { status: "error", message: "The requirement could not be updated." }; }
  }
  revalidatePath("/admin/requirements");
  return { status: "success", message: "Requirement updated." };
}

export async function editLoanRequirement(_state: RequirementState, form: FormData): Promise<RequirementState> {
  if (!requirementsReady()) return { status: "error", message: "Requirements are unavailable. Nothing was changed." };
  let supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"];
  try { ({ supabase } = await requireAdmin()); } catch { return { status: "error", message: "Admin authorization is required." }; }
  const id = form.get("id");
  if (typeof id !== "string" || !validUuid(id)) return { status: "error", message: "Invalid requirement." };
  let input;
  try { input = validateLoan(form); }
  catch (error) { return { status: "error", message: error instanceof Error ? error.message : "Invalid requirement." }; }
  const { data, error } = await supabase.from("loan_requirements").update(input).eq("id", id).select("id").maybeSingle();
  if (error || !data) { console.error("[requirements] Loan update failed", { code: error?.code }); return { status: "error", message: "The loan requirement could not be updated." }; }
  revalidatePath("/admin/requirements");
  revalidatePath("/loans");
  return { status: "success", message: "Loan details updated." };
}
