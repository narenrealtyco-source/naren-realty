"use server";

import { SUBMISSION_CATEGORIES } from "../lib/property-submission-validation";
import { validateSubmissionDetails, type SubmissionDetails } from "../lib/submission-details";
import { createSupabaseServerClient } from "../lib/supabase-server";

export type DraftPayload = {
  version: 1;
  step: number;
  category: string;
  values: Record<"title" | "locality" | "address" | "price" | "area" | "description", string>;
  details: SubmissionDetails;
  ownerDetails: Record<"fullName" | "mobile" | "email" | "relationship" | "authorizationDetails", string>;
};

export type DraftActionState = {
  status: "saved" | "loaded" | "empty" | "deleted" | "error";
  message: string;
  payload?: DraftPayload;
  updatedAt?: string;
};

const VALUE_KEYS = ["title", "locality", "address", "price", "area", "description"] as const;
const OWNER_KEYS = ["fullName", "mobile", "email", "relationship", "authorizationDetails"] as const;
const RELATIONSHIPS = ["Owner", "Power of Attorney", "Authorized Representative"];

function validateDraftPayload(input: unknown): DraftPayload {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Saved draft is invalid.");
  const value = input as Record<string, unknown>;
  if (Object.keys(value).some((key) => !["version", "step", "category", "values", "details", "ownerDetails"].includes(key)) ||
      value.version !== 1 || typeof value.step !== "number" || !Number.isInteger(value.step) || value.step < 1 || value.step > 7 ||
      typeof value.category !== "string" || (value.category !== "" && !SUBMISSION_CATEGORIES.some((item) => item === value.category)) ||
      !value.values || typeof value.values !== "object" || Array.isArray(value.values) ||
      !value.ownerDetails || typeof value.ownerDetails !== "object" || Array.isArray(value.ownerDetails)) {
    throw new Error("Saved draft is invalid.");
  }
  const values = value.values as Record<string, unknown>;
  const ownerDetails = value.ownerDetails as Record<string, unknown>;
  if (Object.keys(values).some((key) => !VALUE_KEYS.includes(key as (typeof VALUE_KEYS)[number])) ||
      VALUE_KEYS.some((key) => typeof values[key] !== "string" || (values[key] as string).length > (key === "description" ? 2000 : 500)) ||
      Object.keys(ownerDetails).some((key) => !OWNER_KEYS.includes(key as (typeof OWNER_KEYS)[number])) ||
      OWNER_KEYS.some((key) => typeof ownerDetails[key] !== "string" || (ownerDetails[key] as string).length > 1000) ||
      (ownerDetails.relationship && !RELATIONSHIPS.includes(ownerDetails.relationship as string))) {
    throw new Error("Saved draft is invalid.");
  }
  return {
    version: 1,
    step: value.step,
    category: value.category,
    values: Object.fromEntries(VALUE_KEYS.map((key) => [key, values[key]])) as DraftPayload["values"],
    details: validateSubmissionDetails(value.details),
    ownerDetails: Object.fromEntries(OWNER_KEYS.map((key) => [key, ownerDetails[key]])) as DraftPayload["ownerDetails"],
  };
}

async function customerClient() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { supabase, user: null };
  const { data: profile, error: profileError } = await supabase.from("profiles")
    .select("role").eq("id", user.id).maybeSingle();
  if (profileError || profile?.role !== "customer") return { supabase, user: null };
  return { supabase, user };
}

export async function loadPropertySubmissionDraft(): Promise<DraftActionState> {
  const { supabase, user } = await customerClient();
  if (!user) return { status: "error", message: "Sign in with a Customer account to access saved drafts." };
  const { data, error } = await supabase.from("property_submission_drafts")
    .select("payload,updated_at").eq("user_id", user.id).maybeSingle();
  if (error) {
    console.error("[property-submission] Draft lookup failed", { code: error.code });
    return { status: "error", message: "Your saved draft could not be loaded. Please try again." };
  }
  if (!data) return { status: "empty", message: "" };
  try {
    return { status: "loaded", message: "", payload: validateDraftPayload(data.payload), updatedAt: data.updated_at };
  } catch (error) {
    console.error("[property-submission] Stored draft failed validation", { errorType: error instanceof Error ? error.name : typeof error });
    return { status: "error", message: "Your saved draft could not be read safely. It has not been changed." };
  }
}

export async function savePropertySubmissionDraft(input: unknown): Promise<DraftActionState> {
  const { supabase, user } = await customerClient();
  if (!user) return { status: "error", message: "Sign in with a Customer account to save a draft." };
  let payload: DraftPayload;
  try {
    payload = validateDraftPayload(input);
    if (new TextEncoder().encode(JSON.stringify(payload)).length > 40000) throw new Error("Draft is too large.");
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Draft details are invalid." };
  }
  const { error } = await supabase.from("property_submission_drafts")
    .upsert({ user_id: user.id, payload, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) {
    console.error("[property-submission] Draft save failed", { code: error.code });
    return { status: "error", message: "Your draft could not be saved. Please try again." };
  }
  return { status: "saved", message: "Draft saved securely. Photos must be selected again when you return." };
}

export async function deletePropertySubmissionDraft(): Promise<DraftActionState> {
  const { supabase, user } = await customerClient();
  if (!user) return { status: "error", message: "Sign in with a Customer account to remove the saved draft." };
  const { error } = await supabase.from("property_submission_drafts").delete().eq("user_id", user.id);
  if (error) {
    console.error("[property-submission] Draft removal failed", { code: error.code });
    return { status: "error", message: "The saved draft could not be removed." };
  }
  return { status: "deleted", message: "Saved draft removed." };
}
