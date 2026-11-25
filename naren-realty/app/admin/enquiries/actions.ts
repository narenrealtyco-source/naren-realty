"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../lib/supabase-server";
import { getAdminEnquiriesFromSupabase } from "../../lib/admin-supabase-data";
import { ENQUIRY_STATUSES, type EnquiryRecord } from "../../lib/enquiries";

export async function loadAdminEnquiries(): Promise<EnquiryRecord[]> {
  await requireAdmin();
  return getAdminEnquiriesFromSupabase();
}

export async function updateAdminEnquiryStatus(
  enquiryId: string,
  status: EnquiryRecord["status"],
): Promise<void> {
  const { supabase } = await requireAdmin();
  const normalizedId = enquiryId.trim();
  if (!normalizedId) throw new Error("An enquiry ID is required.");
  if (!ENQUIRY_STATUSES.includes(status)) throw new Error("The enquiry status is invalid.");
  if (status === "Negotiation" || status === "Deal Closed") {
    const { data: enquiry, error: enquiryError } = await supabase.from("enquiries")
      .select("property_id,requirement").eq("id", normalizedId).maybeSingle();
    if (enquiryError || !enquiry?.property_id) throw new Error("The linked property could not be verified.");
    const { data: property, error: propertyError } = await supabase.from("properties")
      .select("category").eq("id", enquiry.property_id).maybeSingle();
    if (propertyError || !property) throw new Error("The linked property category could not be verified.");
    const { data: acknowledgements, error: acknowledgementError } = await supabase
      .from("property_brokerage_acknowledgements")
      .select("party,acknowledged_at")
      .eq("enquiry_id", normalizedId)
      .eq("policy_version", "1.5");
    if (acknowledgementError) throw new Error("Brokerage acknowledgement status could not be verified.");
    const requiredParties = property.category === "Resale" ? ["Buyer", "Seller"]
      : property.category === "Rental" ? ["Tenant"]
      : property.category === "PG" ? ["Resident"]
      : property.category === "Airbnb" ? ["Host"] : [];
    if (!requiredParties.length || !requiredParties.every((party) =>
      acknowledgements?.some((record) => record.party === party && Boolean(record.acknowledged_at)),
    )) {
      throw new Error("Both required parties must acknowledge the current brokerage terms before this enquiry can move to Negotiation or Deal Closed.");
    }
  }
  const { data, error } = await supabase
    .from("enquiries")
    .update({ status })
    .eq("id", normalizedId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`Could not update enquiry status in Supabase: ${error.message}`);
  }
  if (!data) throw new Error("The enquiry could not be found.");
  revalidatePath("/admin/enquiries");
}

export async function updateAdminEnquiryDetails(
  enquiryId: string,
  details: Pick<EnquiryRecord, "adminCallNotes" | "nextFollowUpDate">,
): Promise<void> {
  const { supabase } = await requireAdmin();
  const normalizedId = enquiryId.trim();
  if (!normalizedId) throw new Error("An enquiry ID is required.");
  const parsedFollowUpDate = details.nextFollowUpDate
    ? new Date(`${details.nextFollowUpDate}T00:00:00.000Z`)
    : null;
  if (parsedFollowUpDate && Number.isNaN(parsedFollowUpDate.getTime())) {
    throw new Error("The follow-up date is invalid.");
  }
  const followUpDate = parsedFollowUpDate?.toISOString() ?? null;

  const { data, error } = await supabase
    .from("enquiries")
    .update({
      admin_notes: details.adminCallNotes ?? null,
      follow_up_date: followUpDate,
    })
    .eq("id", normalizedId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`Could not update enquiry follow-up details in Supabase: ${error.message}`);
  }
  if (!data) throw new Error("The enquiry could not be found.");
  revalidatePath("/admin/enquiries");
}

export type BrokerageAcknowledgementRecord = {
  id: string;
  transactionReference: string;
  listingId: string;
  category: "Resale" | "Rental" | "PG" | "Airbnb";
  userId: string;
  userRole: "customer" | "owner";
  party: "Buyer" | "Seller" | "Tenant" | "Resident" | "Host";
  policyVersion: string;
  statement: string;
  createdAt: string;
  acknowledgedAt?: string;
};

function brokerageStatement(category: BrokerageAcknowledgementRecord["category"], party: BrokerageAcknowledgementRecord["party"]): string {
  if (category === "Resale" && party === "Buyer") return "For a completed resale transaction where the final agreed sale consideration is strictly more than ₹1 crore, buyer brokerage is 1% of the final sale value. For a resale transaction where the final agreed sale consideration is ₹1 crore or less, buyer brokerage is 2% of the final sale value. Applicable GST, if any, is additional. The payment trigger and final fee basis must be recorded in a transaction-specific written confirmation.";
  if (category === "Resale" && party === "Seller") return "For a completed resale transaction where the final agreed sale consideration is strictly more than ₹1 crore, seller brokerage is separately 1% of the final sale value. For a resale transaction where the final agreed sale consideration is ₹1 crore or less, seller brokerage is separately 2% of the final sale value. Applicable GST, if any, is additional. The payment trigger and final fee basis must be recorded in a transaction-specific written confirmation.";
  if (category === "Rental" && party === "Tenant") return "Tenant brokerage is equal to one month's rent, payable after a successful rental transaction and execution of the Rent / Leave & License Agreement. Applicable GST, if any, is additional.";
  if (category === "PG" && party === "Resident") return "Resident / Tenant brokerage is equal to one month's rent for a successful PG / Hostel booking facilitated by NAREN REALTY. Applicable GST, if any, is additional.";
  if (category === "Airbnb" && party === "Host") return "Host commission is 10% of accommodation rent for each successful booking introduced or facilitated by NAREN REALTY. Cleaning charges and taxes are excluded unless separately agreed in writing. Applicable GST, if any, is additional.";
  throw new Error("No brokerage acknowledgement applies to this party and category.");
}

export async function loadAdminBrokerageAcknowledgements(enquiryIds: string[]): Promise<BrokerageAcknowledgementRecord[]> {
  const { supabase } = await requireAdmin();
  const ids = Array.from(new Set(enquiryIds.map((id) => id.trim()).filter(Boolean)));
  if (!ids.length) return [];
  const { data, error } = await supabase.from("property_brokerage_acknowledgements")
    .select("id,enquiry_id,property_id,user_id,party,category,policy_version,statement,created_at,acknowledged_at")
    .in("enquiry_id", ids).order("created_at", { ascending: true });
  if (error) throw new Error("Brokerage acknowledgement records could not be loaded.");
  return (data ?? []).map((row) => ({
    id: row.id,
    transactionReference: row.enquiry_id,
    listingId: row.property_id,
    category: row.category as BrokerageAcknowledgementRecord["category"],
    userId: row.user_id,
    userRole: row.party === "Buyer" || row.party === "Tenant" || row.party === "Resident" ? "customer" : "owner",
    party: row.party as BrokerageAcknowledgementRecord["party"],
    policyVersion: row.policy_version,
    statement: row.statement,
    createdAt: row.created_at,
    acknowledgedAt: row.acknowledged_at ?? undefined,
  }));
}

export async function prepareAdminBrokerageAcknowledgements(enquiryId: string): Promise<void> {
  const { supabase } = await requireAdmin();
  const id = enquiryId.trim();
  if (!id) throw new Error("An enquiry ID is required.");
  const { data: enquiry, error: enquiryError } = await supabase.from("enquiries")
    .select("id,customer_id,property_id,requirement").eq("id", id).maybeSingle();
  if (enquiryError || !enquiry || !enquiry.property_id) throw new Error("The enquiry must be linked to a property before brokerage acknowledgement can be prepared.");
  const { data: property, error: propertyError } = await supabase.from("properties")
    .select("id,owner_id,category").eq("id", enquiry.property_id).maybeSingle();
  if (propertyError || !property) throw new Error("The linked property could not be verified.");
  const category = property.category as BrokerageAcknowledgementRecord["category"];
  if (!["Resale", "Rental", "PG", "Airbnb"].includes(category)) throw new Error("The property category is not supported.");
  const policyVersion = "1.5";
  const participants: Array<{ userId: string; party: BrokerageAcknowledgementRecord["party"] }> = [];
  if (category === "Resale") participants.push({ userId: enquiry.customer_id, party: "Buyer" }, { userId: property.owner_id, party: "Seller" });
  else if (category === "Rental") participants.push({ userId: enquiry.customer_id, party: "Tenant" });
  else if (category === "PG") participants.push({ userId: enquiry.customer_id, party: "Resident" });
  else participants.push({ userId: property.owner_id, party: "Host" });
  const rows = participants.map((participant) => ({
    enquiry_id: id,
    property_id: property.id,
    user_id: participant.userId,
    party: participant.party,
    category,
    policy_version: policyVersion,
    statement: brokerageStatement(category, participant.party),
  }));
  const { error } = await supabase.from("property_brokerage_acknowledgements")
    .upsert(rows, { onConflict: "enquiry_id,user_id,party,policy_version", ignoreDuplicates: true });
  if (error) throw new Error("Brokerage acknowledgement requests could not be prepared.");
}
