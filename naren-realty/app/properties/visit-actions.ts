"use server";

import { createSupabaseServerClient } from "../lib/supabase-server";
import { validateVisitInput } from "../lib/visit-requests";
import { POLICY_DOCUMENTS } from "../lib/policies";

export type VisitResult = { status: "idle" | "error" | "success"; message: string };

export async function visitRequestsReady(): Promise<boolean> {
  return process.env.VISIT_REQUESTS_ENABLED === "true";
}

export async function requestVisit(_state: VisitResult, form: FormData): Promise<VisitResult> {
  if (!(await visitRequestsReady())) return { status: "error", message: "Visit requests are not available yet." };
  let input;
  try { input = validateVisitInput(form); } catch (error) { return { status: "error", message: error instanceof Error ? error.message : "Invalid request." }; }
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { status: "error", message: "Please sign in to request a visit." };
  if (form.get("policy_acknowledged") !== "on") {
    return { status: "error", message: "Please review and accept the Site Visit Policy, Customer Terms and Privacy Policy before submitting." };
  }
  const requiredPolicies = ["site_visit_policy", "customer_terms", "privacy_policy"] as const;
  const acceptanceRows = requiredPolicies.map((policyType) => {
    const policy = POLICY_DOCUMENTS.find((item) => item.type === policyType);
    if (!policy) throw new Error("A required policy version is unavailable.");
    return { user_id: user.id, policy_type: policy.type, policy_version: policy.version };
  });
  const { error: acceptanceError } = await supabase.from("policy_acceptances").insert(acceptanceRows);
  if (acceptanceError) {
    console.error("[visit-request] Policy acceptance insert failed", { code: acceptanceError.code });
    return { status: "error", message: "Your policy acceptance could not be recorded. Please try again." };
  }
  const { error } = await supabase.from("visit_requests").insert({
    customer_id: user.id, property_id: input.propertyId, customer_name: input.name,
    mobile_number: input.mobile, message: input.message, visit_date: input.date, visit_time: input.time,
  });
  if (error?.code === "23505") return { status: "error", message: "You already have an active visit request for this property. Contact our team before requesting another." };
  if (error) {
    console.error("[visit-request] Insert failed", { code: error.code });
    return { status: "error", message: "Your request could not be saved. Please try again or contact our team." };
  }
  return { status: "success", message: "Your visit request has been received. Your preferred time is pending confirmation by our team." };
}
