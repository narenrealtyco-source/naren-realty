"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "../../../lib/supabase-server";

function serviceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!key || !url) throw new Error("MFIT admin service is not configured.");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function approveCollectionPartnerApplication(formData: FormData) {
  await requireAdmin();
  const applicationId = String(formData.get("application_id") || "").trim();
  if (!applicationId) throw new Error("Application reference is missing.");
  const db = serviceClient();

  const { data: application, error: readError } = await db
    .from("health_collection_partner_applications")
    .select("id,business_name,contact_name,phone,email,address,service_areas,status,created_partner_id")
    .eq("id", applicationId)
    .single();
  if (readError || !application) throw new Error("Application could not be found.");
  if (application.status === "approved" && application.created_partner_id) {
    revalidatePath("/admin/health/collection-partners");
    return;
  }
  if (application.status !== "pending_review") throw new Error("Only pending applications can be approved.");

  const email = String(application.email || "").trim().toLowerCase();
  const contactName = String(application.contact_name || "").trim();
  const displayName = String(application.business_name || contactName).trim();
  if (!email || !contactName || !displayName) throw new Error("Application is missing required partner details.");

  // Keep customer and collection-partner identities separate. Never convert an existing account.
  const { data: users, error: usersError } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (usersError) throw new Error("Could not verify whether this email already has an account.");
  if (users.users.some((user) => user.email?.toLowerCase() === email)) {
    throw new Error("This email already belongs to an account. To keep customer and partner logins separate, use a different email for this partner.");
  }

  const { data: invitation, error: inviteError } = await db.auth.admin.inviteUserByEmail(email, {
    data: { full_name: contactName, account_type: "collection_partner" },
  });
  if (inviteError || !invitation.user) throw new Error(inviteError?.message || "Partner invitation could not be sent.");

  const userId = invitation.user.id;
  let partnerId: string | null = null;
  try {
    const { error: profileError } = await db.from("profiles").upsert({
      id: userId,
      full_name: contactName,
      phone: application.phone,
      role: "collection_partner",
      manager_active: true,
    });
    if (profileError) throw profileError;

    const baseSlug = displayName.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 35) || "collection-partner";
    const publicSlug = baseSlug + "-" + userId.replace(/-/g, "").slice(0, 8);
    const { data: partner, error: partnerError } = await db.from("health_collection_partners").insert({
      user_id: userId,
      public_slug: publicSlug,
      display_name: displayName,
      contact_name: contactName,
      phone: application.phone,
      email,
      service_areas: application.service_areas || [],
      is_active: true,
      verified_at: new Date().toISOString(),
    }).select("id").single();
    if (partnerError || !partner) throw partnerError || new Error("Partner profile could not be created.");
    partnerId = partner.id;

    const { error: updateError } = await db.from("health_collection_partner_applications").update({
      status: "approved",
      created_partner_id: partner.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", applicationId).eq("status", "pending_review");
    if (updateError) throw updateError;
  } catch (error) {
    if (partnerId) await db.from("health_collection_partners").delete().eq("id", partnerId);
    await db.auth.admin.deleteUser(userId);
    throw new Error(error instanceof Error ? error.message : "Partner approval failed.");
  }

  revalidatePath("/admin/health/collection-partners");
  revalidatePath("/admin/health");
}

export async function rejectCollectionPartnerApplication(formData: FormData) {
  await requireAdmin();
  const applicationId = String(formData.get("application_id") || "").trim();
  const reviewNote = String(formData.get("review_note") || "").trim().slice(0, 1000);
  if (!applicationId) throw new Error("Application reference is missing.");
  const db = serviceClient();
  const { error } = await db.from("health_collection_partner_applications").update({
    status: "rejected",
    review_note: reviewNote || null,
    reviewed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", applicationId).eq("status", "pending_review");
  if (error) throw new Error("Application could not be rejected.");
  revalidatePath("/admin/health/collection-partners");
  revalidatePath("/admin/health");
}

export async function setCollectionPartnerActive(formData: FormData) {
  await requireAdmin();
  const partnerId = String(formData.get("partner_id") || "").trim();
  const isActive = formData.get("is_active") === "on";
  if (!partnerId) throw new Error("Partner reference is missing.");
  const db = serviceClient();
  const { error } = await db.from("health_collection_partners").update({
    is_active: isActive,
    updated_at: new Date().toISOString(),
  }).eq("id", partnerId);
  if (error) throw new Error("Partner access could not be updated.");
  revalidatePath("/admin/health/collection-partners");
  revalidatePath("/admin/health");
}
