"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../lib/supabase-server";

export type AdminReferral = {
  id: string;
  referrer_user_id: string;
  referred_user_id: string;
  referral_type: "tenant" | "owner";
  reward_amount: number;
  status: "pending" | "eligible" | "approved" | "paid" | "rejected";
  created_at: string;
  property_id: string | null;
  transaction_type: "rental" | "resale" | null;
  deal_source: "naren_realty" | "direct_owner" | "other_broker" | "market" | null;
  deal_completed_at: string | null;
  rental_agreement_executed: boolean;
  evidence_notes: string | null;
  admin_notes: string | null;
  verified_at: string | null;
  paid_at: string | null;
  payment_reference: string | null;
  referrer: { full_name: string | null; phone: string | null } | null;
  referred: { full_name: string | null; phone: string | null } | null;
  property: { title: string; locality: string | null; category: string } | null;
};

export type ApprovedReferralProperty = {
  id: string;
  title: string;
  locality: string | null;
  category: string;
  owner_id: string;
};

export async function loadAdminReferrals(): Promise<{
  referrals: AdminReferral[];
  properties: ApprovedReferralProperty[];
}> {
  const { supabase } = await requireAdmin();
  const [referralResult, propertyResult] = await Promise.all([
    supabase.from("referral_attributions").select("*").order("created_at", { ascending: false }).limit(500),
    supabase.from("properties").select("id,title,locality,category,owner_id").eq("status", "approved").order("created_at", { ascending: false }).limit(1000),
  ]);
  if (referralResult.error) throw new Error(`Could not load referrals: ${referralResult.error.message}`);
  if (propertyResult.error) throw new Error(`Could not load approved listings: ${propertyResult.error.message}`);

  const rows = referralResult.data ?? [];
  const ids = Array.from(new Set(rows.flatMap((row) => [row.referrer_user_id, row.referred_user_id])));
  const propertyIds = Array.from(new Set(rows.map((row) => row.property_id).filter((id): id is string => Boolean(id))));
  const [profileResult, linkedPropertyResult] = await Promise.all([
    ids.length ? supabase.from("profiles").select("id,full_name,phone").in("id", ids) : Promise.resolve({ data: [], error: null }),
    propertyIds.length ? supabase.from("properties").select("id,title,locality,category,owner_id").in("id", propertyIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (profileResult.error) throw new Error("Referral account details could not be loaded.");
  if (linkedPropertyResult.error) throw new Error("Linked property details could not be loaded.");

  const profiles = new Map((profileResult.data ?? []).map((profile) => [profile.id, profile]));
  const listings = new Map((linkedPropertyResult.data ?? []).map((property) => [property.id, property]));
  return {
    referrals: rows.map((row) => ({
      ...row,
      reward_amount: Number(row.reward_amount),
      referrer: profiles.get(row.referrer_user_id) ?? null,
      referred: profiles.get(row.referred_user_id) ?? null,
      property: row.property_id ? (listings.get(row.property_id) ?? null) : null,
    })) as AdminReferral[],
    properties: (propertyResult.data ?? []) as ApprovedReferralProperty[],
  };
}

export async function reviewAdminReferral(input: {
  id: string;
  status: "pending" | "eligible" | "approved" | "paid" | "rejected";
  propertyId: string | null;
  transactionType: "rental" | "resale" | null;
  dealSource: "naren_realty" | "direct_owner" | "other_broker" | "market" | null;
  dealCompletedAt: string | null;
  rentalAgreementExecuted: boolean;
  evidenceNotes: string;
  adminNotes: string;
  paymentReference: string;
}): Promise<void> {
  const { supabase, user } = await requireAdmin();
  if (!input.id.trim()) throw new Error("Referral ID is required.");
  if (input.evidenceNotes.length > 3000 || input.adminNotes.length > 3000) {
    throw new Error("Notes must be 3,000 characters or fewer.");
  }
  if (input.status !== "rejected" && input.dealSource !== "naren_realty") {
    throw new Error("Direct, market and other-broker transactions cannot be marked eligible, approved or paid.");
  }
  if (input.status === "paid" && !input.paymentReference.trim()) {
    throw new Error("Enter the payment reference before marking the reward as paid.");
  }

  const now = new Date().toISOString();
  const update: Record<string, unknown> = {
    status: input.status,
    property_id: input.propertyId,
    transaction_type: input.transactionType,
    deal_source: input.dealSource,
    deal_completed_at: input.dealCompletedAt ? new Date(input.dealCompletedAt).toISOString() : null,
    rental_agreement_executed: input.rentalAgreementExecuted,
    evidence_notes: input.evidenceNotes.trim() || null,
    admin_notes: input.adminNotes.trim() || null,
    verified_by: input.status === "pending" ? null : user.id,
    verified_at: input.status === "pending" ? null : now,
  };
  if (input.status === "paid") {
    update.paid_by = user.id;
    update.paid_at = now;
    update.payment_reference = input.paymentReference.trim();
  }
  if (input.status !== "paid") {
    update.paid_by = null;
    update.paid_at = null;
    update.payment_reference = null;
  }

  const { data, error } = await supabase
    .from("referral_attributions")
    .update(update)
    .eq("id", input.id)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`Referral review failed: ${error.message}`);
  if (!data) throw new Error("Referral record was not found or could not be updated.");
  revalidatePath("/admin/referrals");
  revalidatePath("/account/referrals");
}


export type ReferralRegisterType = "tenant" | "owner";
export type ReferralRegisterRow = {
  referral: AdminReferral;
  referralCode: string | null;
  properties: Array<{ id: string; title: string; locality: string | null; status: string; created_at: string; updated_at: string | null }>;
  submissions: Array<{ id: string; title: string; locality: string; status: string; created_at: string; reviewed_at: string | null; published_property_id: string | null }>;
  requirements: Array<{ id: string; requirement_type: string; property_category: string; preferred_location: string; min_budget: number | null; max_budget: number | null; status: string; created_at: string }>;
  googleRequirements: Array<{ id: string; requirement_type: string; property_category: string; preferred_location: string; min_budget: number | null; max_budget: number | null; status: string; created_at: string }>;
  enquiries: Array<{ id: string; property_id: string | null; requirement: string | null; status: string; created_at: string }>;
  visits: Array<{ id: string; property_id: string; status: string; visit_date: string | null; created_at: string }>;
};

export async function loadAdminReferralRegister(type: ReferralRegisterType): Promise<ReferralRegisterRow[]> {
  const { supabase } = await requireAdmin();
  const referralResult = await supabase
    .from("referral_attributions")
    .select("*")
    .eq("referral_type", type)
    .order("created_at", { ascending: false })
    .limit(1000);
  if (referralResult.error) throw new Error(`Could not load ${type} referrals: ${referralResult.error.message}`);

  const rows = referralResult.data ?? [];
  if (!rows.length) return [];
  const userIds = Array.from(new Set(rows.map((row) => row.referred_user_id)));
  const referrerIds = Array.from(new Set(rows.map((row) => row.referrer_user_id)));
  const allUserIds = Array.from(new Set([...userIds, ...referrerIds]));
  const codeIds = Array.from(new Set(rows.map((row) => row.referral_code_id).filter((id): id is string => Boolean(id))));

  const [profileResult, codeResult, propertyResult, submissionResult, requirementResult, googleResult, enquiryResult, visitResult] = await Promise.all([
    supabase.from("profiles").select("id,full_name,phone").in("id", allUserIds),
    codeIds.length ? supabase.from("referral_codes").select("id,code").in("id", codeIds) : Promise.resolve({ data: [], error: null }),
    type === "owner" ? supabase.from("properties").select("id,owner_id,title,locality,status,created_at,updated_at").in("owner_id", userIds).order("created_at", { ascending: false }).limit(2000) : Promise.resolve({ data: [], error: null }),
    type === "owner" ? supabase.from("property_submissions").select("id,user_id,title,locality,status,created_at,reviewed_at,published_property_id").in("user_id", userIds).order("created_at", { ascending: false }).limit(2000) : Promise.resolve({ data: [], error: null }),
    type === "tenant" ? supabase.from("property_requirements").select("id,customer_id,requirement_type,property_category,preferred_location,min_budget,max_budget,status,created_at").in("customer_id", userIds).order("created_at", { ascending: false }).limit(2000) : Promise.resolve({ data: [], error: null }),
    type === "tenant" ? supabase.from("google_form_property_requirements").select("id,customer_phone,requirement_type,property_category,preferred_location,min_budget,max_budget,status,created_at").order("created_at", { ascending: false }).limit(2000) : Promise.resolve({ data: [], error: null }),
    type === "tenant" ? supabase.from("enquiries").select("id,customer_id,property_id,requirement,status,created_at").in("customer_id", userIds).order("created_at", { ascending: false }).limit(2000) : Promise.resolve({ data: [], error: null }),
    type === "tenant" ? supabase.from("visit_requests").select("id,customer_id,property_id,status,visit_date,created_at").in("customer_id", userIds).order("created_at", { ascending: false }).limit(2000) : Promise.resolve({ data: [], error: null }),
  ]);

  for (const result of [profileResult, codeResult, propertyResult, submissionResult, requirementResult, googleResult, enquiryResult, visitResult]) {
    if (result.error) throw new Error("Referral activity records could not be loaded. Please refresh and try again.");
  }

  const profiles = new Map((profileResult.data ?? []).map((p) => [p.id, p]));
  const codes = new Map((codeResult.data ?? []).map((c) => [c.id, c.code]));
  const phoneByUser = new Map(userIds.map((id) => [id, profiles.get(id)?.phone ?? ""]));
  const properties = propertyResult.data ?? [];
  const submissions = submissionResult.data ?? [];
  const requirements = requirementResult.data ?? [];
  const googleRequirements = googleResult.data ?? [];
  const enquiries = enquiryResult.data ?? [];
  const visits = visitResult.data ?? [];

  return rows.map((row) => ({
    referral: {
      ...row,
      reward_amount: Number(row.reward_amount),
      referrer: profiles.get(row.referrer_user_id) ?? null,
      referred: profiles.get(row.referred_user_id) ?? null,
      property: null,
    } as AdminReferral,
    referralCode: codes.get(row.referral_code_id) ?? null,
    properties: properties.filter((p) => p.owner_id === row.referred_user_id),
    submissions: submissions.filter((s) => s.user_id === row.referred_user_id),
    requirements: requirements.filter((r) => r.customer_id === row.referred_user_id),
    googleRequirements: googleRequirements.filter((r) => r.customer_phone && r.customer_phone === phoneByUser.get(row.referred_user_id)),
    enquiries: enquiries.filter((e) => e.customer_id === row.referred_user_id),
    visits: visits.filter((v) => v.customer_id === row.referred_user_id),
  }));
}
