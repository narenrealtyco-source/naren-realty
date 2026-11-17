"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../lib/supabase-server";

export async function loadReferralRewardQueues() {
  const { supabase } = await requireAdmin();
  const [approvedResult, claimsResult] = await Promise.all([
    supabase.from("referral_attributions").select("*").eq("status", "approved").order("verified_at", { ascending: false }).limit(500),
    supabase.from("referral_reward_claims").select("*").eq("status", "waiting").order("submitted_at", { ascending: true }).limit(500),
  ]);
  if (approvedResult.error) throw new Error(approvedResult.error.message);
  if (claimsResult.error) throw new Error(claimsResult.error.message);
  const rows = [...(approvedResult.data ?? []), ...(claimsResult.data ?? [])];
  const ids = [...new Set(rows.flatMap((r: any) => [r.referrer_user_id, r.referred_user_id, r.user_id].filter(Boolean)))];
  const [profiles, properties] = await Promise.all([
    ids.length ? supabase.from("profiles").select("id,full_name,phone").in("id", ids) : Promise.resolve({data:[],error:null}),
    supabase.from("properties").select("id,title,locality").in("id", [...new Set((approvedResult.data ?? []).map((r:any)=>r.property_id).filter(Boolean))]),
  ]);
  if (profiles.error || properties.error) throw new Error("Reward queue details could not be loaded.");
  const pmap = new Map((profiles.data ?? []).map((p:any)=>[p.id,p]));
  const propmap = new Map((properties.data ?? []).map((p:any)=>[p.id,p]));
  return {
    approved: (approvedResult.data ?? []).map((r:any)=>({...r, referrer:pmap.get(r.referrer_user_id) ?? null, referred:pmap.get(r.referred_user_id) ?? null, property:propmap.get(r.property_id) ?? null})),
    waiting: (claimsResult.data ?? []).map((c:any)=>({...c, claimant:pmap.get(c.user_id) ?? null})),
  };
}

export async function triggerReferralReward(referralId: string) {
  const { supabase, user } = await requireAdmin();
  const { data, error } = await supabase.from("referral_attributions")
    .update({ status: "approved", verified_by: user.id, verified_at: new Date().toISOString() })
    .eq("id", referralId).eq("status", "eligible").select("id,referred_user_id,reward_amount").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Only an eligible, verified referral can be triggered. Review it in Referral Register first.");
  const { error: notificationError } = await supabase.from("notifications").insert({
    recipient_id: data.referred_user_id,
    event_key: `referral_reward_claim_${data.id}`,
    title: "Referral reward is ready to claim",
    body: `Your NAREN REALTY referral reward of ₹${Number(data.reward_amount).toLocaleString("en-IN")} is ready. Submit your bank details to claim it.`,
    action_url: "/account/referral-claim",
  });
  if (notificationError) throw new Error("Reward was triggered, but the account notification could not be created. Please check the reward queue.");
  revalidatePath("/admin/referral-rewards");
  revalidatePath("/account/referral-claim");
  revalidatePath("/account/referrals");
}

export async function markReferralRewardPaid(input: {
  claimId: string; paymentMode: "bank_transfer" | "upi"; paymentReference: string; paymentRemarks: string;
}) {
  const { supabase, user } = await requireAdmin();
  if (!input.claimId || !input.paymentReference.trim()) throw new Error("Payment reference is required.");
  const { data: claim, error: claimError } = await supabase.from("referral_reward_claims")
    .select("id,referral_id,status").eq("id", input.claimId).eq("status","waiting").maybeSingle();
  if (claimError || !claim) throw new Error("Waiting claim not found.");
  const paidAt = new Date().toISOString();
  const { error } = await supabase.from("referral_reward_claims").update({
    status:"paid", reviewed_by:user.id, paid_at:paidAt, payment_mode:input.paymentMode,
    payment_reference:input.paymentReference.trim(), payment_remarks:input.paymentRemarks.trim() || null,
  }).eq("id", claim.id).eq("status","waiting");
  if (error) throw new Error(error.message);
  const { error: referralError } = await supabase.from("referral_attributions").update({
    status:"paid", paid_by:user.id, paid_at:paidAt, payment_reference:input.paymentReference.trim(),
  }).eq("id", claim.referral_id).eq("status","approved");
  if (referralError) throw new Error("Claim is recorded as paid, but referral status update failed. Contact support before retrying.");
  revalidatePath("/admin/referral-rewards");
  revalidatePath("/admin/referrals");
  revalidatePath("/account/referral-claim");
  revalidatePath("/account/referrals");
}
