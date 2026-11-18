import type { ListingType, PropertyListing } from "./properties";

export type PolicyType = "customer_terms" | "owner_terms" | "pg_hostel_policy" | "airbnb_policy" | "privacy_policy" | "brokerage_policy";
export type PolicyRole = "customer" | "owner";
export type PolicySection = { heading: string; paragraphs: string[]; bullets?: string[] };
export type PolicyDocument = { type: PolicyType; path: string; title: string; version: string; lastUpdated: string; sections: PolicySection[] };
type SavedPolicyVersion = { version: string; lastUpdated: string };

const LAST_UPDATED = "November 18, 2026";
const DEFAULT_VERSION = "1.0";
const VERSIONS_KEY = "naren-realty-policy-versions-v1";
const ACCEPTANCES_KEY = "naren-realty-policy-acceptances-v1";
const BROKERAGE_ACKS_KEY = "naren-realty-brokerage-acknowledgements-v1";

export const POLICY_DOCUMENTS: PolicyDocument[] = [
  {
    type: "customer_terms", path: "/customer-terms", title: "Customer Terms & Conditions", version: DEFAULT_VERSION, lastUpdated: LAST_UPDATED,
    sections: [
      { heading: "Customer Access", paragraphs: ["Property browsing is available without a customer account. My Account features require registration and sign-in."] },
      { heading: "Property Enquiries", paragraphs: ["Customers may send enquiries about properties through Naren Realty. Enquiries are received by the Naren Realty Admin team, which coordinates follow-up.", "The application does not provide direct customer-to-owner messaging or expose owner contact details."] },
      { heading: "Listing Status", paragraphs: ["Owner-submitted properties appear in customer browsing only after Admin approval."] },
      { heading: "Brokerage", paragraphs: ["Applicable brokerage amounts are listed in the Brokerage Policy. Acknowledgement is recorded before the relevant transaction proceeds."] },
    ],
  },
  {
    type: "owner_terms", path: "/owner-terms", title: "Property Owner Terms & Conditions", version: DEFAULT_VERSION, lastUpdated: LAST_UPDATED,
    sections: [
      { heading: "Property Submission", paragraphs: ["Owners may submit property information and photos for Admin review. Submissions are marked Pending Approval and are not displayed publicly until approved.", "Owners can edit and delete listings belonging to their account. An edited listing is returned to Pending Approval."] },
      { heading: "Enquiries", paragraphs: ["Customer enquiries are handled through Naren Realty Admin. The application does not allow direct owner-customer contact."] },
      { heading: "Brokerage", paragraphs: ["Owner brokerage obligations depend on the listing category and are stated in the Brokerage Policy. Flat rental owners have no brokerage under the supplied rules."] },
    ],
  },
  {
    type: "pg_hostel_policy", path: "/pg-hostel-policy", title: "PG / Hostel Policy", version: DEFAULT_VERSION, lastUpdated: LAST_UPDATED,
    sections: [
      { heading: "Listing Information", paragraphs: ["PG / Hostel listings may display gender preference, sharing options, rent per person, security deposit, available beds or rooms, facilities, amenities, and property rules.", "Only Admin-approved listings appear in customer browsing."] },
      { heading: "Commission", paragraphs: ["No brokerage is charged to the Resident / Tenant. The PG / Hostel Owner commission is 10% of accommodation rent for each successful booking introduced or facilitated by NAREN REALTY. Applicable GST, if any, is additional."] },
      { heading: "Acknowledgement", paragraphs: ["The PG / Hostel Owner acknowledges the 10% commission at the property submission stage. The Resident / Tenant is not charged brokerage. Acknowledgement does not collect payment or create a booking."] },
    ],
  },
  {
    type: "airbnb_policy", path: "/airbnb-policy", title: "Airbnb / Short-Stay Policy", version: DEFAULT_VERSION, lastUpdated: LAST_UPDATED,
    sections: [
      { heading: "Short-Stay Listings", paragraphs: ["Airbnb / Short-Stay listings may display property type, guest capacity, nightly price, stay limits, amenities, check-in/check-out times, and house rules.", "Only Admin-approved listings appear in customer browsing. The application does not provide online booking or payment."] },
      { heading: "Host Commission", paragraphs: ["The Property Owner / Host commission is 10% of accommodation rent for every successful booking introduced or facilitated by Naren Realty. Cleaning charges and taxes are excluded unless separately agreed in writing. Applicable GST, if any, is additional."] },
      { heading: "Acknowledgement", paragraphs: ["The Host acknowledges the commission policy before the relevant transaction proceeds. No online payment is collected by this prototype."] },
    ],
  },
  {
    type: "privacy_policy", path: "/privacy-policy", title: "Privacy Policy", version: "1.1", lastUpdated: LAST_UPDATED,
    sections: [
      { heading: "Information We Collect", paragraphs: ["Depending on the features you use, NAREN REALTY may collect your name, mobile number, email address, account and authentication details, property requirements, listing information and photographs, enquiries, visit requests, referral information, policy acknowledgements, and communications or follow-up information submitted through the platform."] },
      { heading: "How We Use Information", paragraphs: ["We use information to create and manage accounts, display approved property listings, receive and coordinate enquiries and visit requests, administer referrals, provide customer and owner services, maintain platform security, respond to support requests, and meet applicable legal obligations."] },
      { heading: "Storage and Service Providers", paragraphs: ["NAREN REALTY uses Supabase services for account authentication and selected application records, including property and visit-related data. Some browser features and records, including saved favourites and certain enquiry or policy acknowledgement records, may be stored in the browser Local Storage on the device being used. Such browser-stored information may not automatically synchronize across devices and can be lost if browser data is cleared.", "Supabase and other infrastructure providers process information on our behalf to operate the platform. Access to administrative records is restricted through authenticated roles and application permissions. No online payment processing is offered unless a specific payment facility is separately introduced and disclosed."] },
      { heading: "Access and Sharing", paragraphs: ["Customer contact information is used by authorized NAREN REALTY personnel for enquiry and service coordination and is not intended to be publicly displayed on property pages. Owners can manage their own listings but are not given general access to customer enquiry contact details. Information may be shared with service providers supporting the platform or where required by law, to protect users, or to address security and fraud concerns."] },
      { heading: "Security and Retention", paragraphs: ["We use role-based access controls and the security features available in the services supporting the platform. No internet-based system can be guaranteed to be completely secure. Information is retained for as long as reasonably needed to provide services, maintain business and transaction records, resolve disputes, and comply with applicable legal requirements. Browser Local Storage records remain on the relevant device until cleared or removed by the user or browser."] },
      { heading: "Your Choices and Contact", paragraphs: ["You may contact NAREN REALTY through the official website to request access to, correction of, or deletion of personal information, subject to applicable legal and operational record-keeping requirements. You may also clear browser Local Storage, noting that doing so can remove locally saved account-related preferences or records.", "For privacy-related questions or requests, contact NAREN REALTY through the contact details published on the official website."] },
    ],
  },
  {
    type: "brokerage_policy", path: "/brokerage-policy", title: "Brokerage Policy", version: "1.1", lastUpdated: LAST_UPDATED,
    sections: [
      { heading: "Flat Resale", paragraphs: ["Buyer brokerage: 2% of the final sale value.", "Seller brokerage: 2% of the final sale value. The buyer and seller acknowledge their obligations separately."] },
      { heading: "Flat Rental", paragraphs: ["Tenant brokerage: an amount equal to one month's rent.", "Owner brokerage: none."] },
      { heading: "PG / Hostel", paragraphs: ["Resident / Tenant brokerage: none.", "PG / Hostel Owner commission: 10% of accommodation rent for each successful booking introduced or facilitated by NAREN REALTY."] },
      { heading: "Airbnb / Short Stay", paragraphs: ["Guest commission: none.", "Property Owner / Host commission: 25% of accommodation rent for every successful booking introduced or facilitated by Naren Realty. Cleaning charges and taxes are excluded unless separately agreed in writing."] },
      { heading: "Taxes and Acknowledgement", paragraphs: ["Applicable GST, if any, is additional to brokerage or commission.", "The applicable party acknowledges the brokerage / commission at the requirement or property submission stage through a mandatory checkbox. This acknowledgement does not collect online payments or provide booking functionality."] },
    ],
  },
];

export type PolicyAcceptance = {
  id: string;
  userId: string;
  userRole: PolicyRole;
  policyType: PolicyType;
  policyVersion: string;
  acceptedAt: string;
  brokerageCategory?: ListingType;
  transactionReference?: string;
};

export type BrokerageParty = "Buyer" | "Seller" | "Tenant" | "Resident" | "PG / Hostel Owner" | "Host";
export type BrokerageAcknowledgement = {
  id: string;
  transactionReference: string;
  listingId: string;
  category: ListingType;
  userId: string;
  userRole: PolicyRole;
  party: BrokerageParty;
  policyVersion: string;
  statement: string;
  createdAt: string;
  acknowledgedAt?: string;
};

function readJsonArray<T>(key: string): T[] {
  const stored = window.localStorage.getItem(key);
  if (!stored) return [];
  const parsed: unknown = JSON.parse(stored);
  if (!Array.isArray(parsed)) throw new Error("Policy storage is invalid.");
  return parsed as T[];
}

export function getCurrentPolicyDocuments(): PolicyDocument[] {
  let savedVersions: Partial<Record<PolicyType, string | SavedPolicyVersion>> = {};
  try {
    savedVersions = JSON.parse(window.localStorage.getItem(VERSIONS_KEY) ?? "{}");
  } catch {
    savedVersions = {};
  }
  return POLICY_DOCUMENTS.map((document) => {
    const saved = savedVersions[document.type];
    return {
      ...document,
      version: typeof saved === "string" ? saved : saved?.version ?? document.version,
      lastUpdated: typeof saved === "object" ? saved?.lastUpdated ?? document.lastUpdated : document.lastUpdated,
    };
  });
}

export function getPolicyDocument(type: PolicyType): PolicyDocument {
  const document = getCurrentPolicyDocuments().find((item) => item.type === type);
  if (!document) throw new Error("Policy document was not found.");
  return document;
}

export function updatePolicyVersion(type: PolicyType, versionInput: string): PolicyDocument[] {
  const version = versionInput.trim();
  if (!/^\d+\.\d+$/.test(version)) throw new Error("Enter a version such as 1.1.");
  const documents = getCurrentPolicyDocuments();
  const current = documents.find((document) => document.type === type);
  if (!current) throw new Error("Policy document was not found.");
  if (current.version === version) throw new Error("Choose a version different from the current version.");
  const [nextMajor, nextMinor] = version.split(".").map(Number);
  const [currentMajor, currentMinor] = current.version.split(".").map(Number);
  if (nextMajor < currentMajor || (nextMajor === currentMajor && nextMinor <= currentMinor)) {
    throw new Error("Policy versions must increase (for example, 1.0 to 1.1).");
  }
  const versions = Object.fromEntries(documents.map((document) => [document.type, { version: document.version, lastUpdated: document.lastUpdated }])) as Record<PolicyType, SavedPolicyVersion>;
  const lastUpdated = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  window.localStorage.setItem(VERSIONS_KEY, JSON.stringify({ ...versions, [type]: { version, lastUpdated } }));
  return getCurrentPolicyDocuments();
}

export function getPolicyAcceptances(): PolicyAcceptance[] {
  return readJsonArray<PolicyAcceptance>(ACCEPTANCES_KEY);
}

export function getUserPolicyAcceptances(userId: string, userRole: PolicyRole): PolicyAcceptance[] {
  return getPolicyAcceptances().filter((record) => record.userId === userId && record.userRole === userRole);
}

export function getMissingPolicies(userId: string, userRole: PolicyRole, requiredTypes: PolicyType[]): PolicyDocument[] {
  const acceptances = getUserPolicyAcceptances(userId, userRole);
  const documents = getCurrentPolicyDocuments();
  return requiredTypes.flatMap((type) => {
    const current = documents.find((document) => document.type === type);
    if (!current || acceptances.some((record) => record.policyType === type && record.policyVersion === current.version)) return [];
    return [current];
  });
}

export function recordPolicyAcceptances(
  userId: string,
  userRole: PolicyRole,
  types: PolicyType[],
  context: Pick<PolicyAcceptance, "brokerageCategory" | "transactionReference"> = {},
): PolicyAcceptance[] {
  const documents = getCurrentPolicyDocuments();
  const currentRecords = getPolicyAcceptances();
  const acceptedAt = new Date().toISOString();
  const additions = types.flatMap((type) => {
    const document = documents.find((item) => item.type === type);
    if (!document || currentRecords.some((record) => record.userId === userId && record.userRole === userRole && record.policyType === type && record.policyVersion === document.version)) return [];
    return [{ id: crypto.randomUUID(), userId, userRole, policyType: type, policyVersion: document.version, acceptedAt, ...context }];
  });
  if (additions.length) window.localStorage.setItem(ACCEPTANCES_KEY, JSON.stringify([...currentRecords, ...additions]));
  return additions;
}

export function getBrokerageAcknowledgements(): BrokerageAcknowledgement[] {
  return readJsonArray<BrokerageAcknowledgement>(BROKERAGE_ACKS_KEY);
}

export function getUserBrokerageAcknowledgements(userId: string, userRole: PolicyRole): BrokerageAcknowledgement[] {
  return getBrokerageAcknowledgements().filter((record) => record.userId === userId && record.userRole === userRole);
}

export function getTransactionBrokerageAcknowledgements(transactionReference: string): BrokerageAcknowledgement[] {
  return getBrokerageAcknowledgements().filter((record) => record.transactionReference === transactionReference);
}

export function areBrokerageAcknowledgementsComplete(transactionReference: string): boolean {
  const records = getTransactionBrokerageAcknowledgements(transactionReference);
  if (!records.length) return false;
  const version = getPolicyDocument("brokerage_policy").version;
  const category = records[0].category;
  const requiredParties: Array<{ userRole: PolicyRole; party: BrokerageParty }> = category === "Resale"
    ? [{ userRole: "customer", party: "Buyer" }, { userRole: "owner", party: "Seller" }]
    : category === "Rental"
      ? [{ userRole: "customer", party: "Tenant" }]
      : category === "PG"
        ? [{ userRole: "owner", party: "PG / Hostel Owner" }]
        : [{ userRole: "owner", party: "Host" }];
  return requiredParties.every(({ userRole, party }) => records.some((record) =>
    record.userRole === userRole && record.party === party && record.policyVersion === version && Boolean(record.acknowledgedAt),
  ));
}

function brokerageStatement(category: ListingType, party: BrokerageParty): string {
  if (category === "Resale" && party === "Buyer") return "Buyer brokerage is 2% of the final sale value. Applicable GST, if any, is additional.";
  if (category === "Resale" && party === "Seller") return "Seller brokerage is 2% of the final sale value. Applicable GST, if any, is additional.";
  if (category === "Rental" && party === "Tenant") return "Tenant brokerage is equal to one month's rent. Applicable GST, if any, is additional.";
  if (category === "PG" && party === "PG / Hostel Owner") return "PG / Hostel Owner commission is 10% of accommodation rent for each successful booking introduced or facilitated by Naren Realty. Applicable GST, if any, is additional.";
  if (category === "Airbnb" && party === "Host") return "Host commission is 10% of accommodation rent for each successful booking introduced or facilitated by Naren Realty. Cleaning charges and taxes are excluded unless separately agreed in writing. Applicable GST, if any, is additional.";
  throw new Error("No brokerage acknowledgement applies to this party and category.");
}

export function createBrokerageAcknowledgements(input: {
  enquiryId: string;
  listing: PropertyListing;
  customerId?: string;
}): BrokerageAcknowledgement[] {
  if (!input.customerId) throw new Error("This enquiry is not linked to a customer account. The customer must sign in before acknowledgement can be requested.");
  const parties: Array<{ userId: string; userRole: PolicyRole; party: BrokerageParty }> = [];
  if (input.listing.type === "Resale") {
    parties.push({ userId: input.customerId, userRole: "customer", party: "Buyer" }, { userId: input.listing.ownerId, userRole: "owner", party: "Seller" });
  } else if (input.listing.type === "Rental") {
    parties.push({ userId: input.customerId, userRole: "customer", party: "Tenant" });
  } else if (input.listing.type === "PG") {
    parties.push({ userId: input.listing.ownerId, userRole: "owner", party: "PG / Hostel Owner" });
  } else {
    parties.push({ userId: input.listing.ownerId, userRole: "owner", party: "Host" });
  }

  const existing = getBrokerageAcknowledgements();
  const policyVersion = getPolicyDocument("brokerage_policy").version;
  const additions = parties.flatMap((participant) => {
    if (existing.some((record) => record.transactionReference === input.enquiryId && record.userId === participant.userId && record.party === participant.party && record.policyVersion === policyVersion)) return [];
    return [{
      id: crypto.randomUUID(),
      transactionReference: input.enquiryId,
      listingId: input.listing.id,
      category: input.listing.type,
      userId: participant.userId,
      userRole: participant.userRole,
      party: participant.party,
      policyVersion,
      statement: brokerageStatement(input.listing.type, participant.party),
      createdAt: new Date().toISOString(),
    }];
  });
  if (additions.length) window.localStorage.setItem(BROKERAGE_ACKS_KEY, JSON.stringify([...existing, ...additions]));
  return additions;
}

export function acknowledgeBrokerage(userId: string, userRole: PolicyRole, acknowledgementId: string): void {
  const records = getBrokerageAcknowledgements();
  const target = records.find((record) => record.id === acknowledgementId && record.userId === userId && record.userRole === userRole);
  if (!target) throw new Error("This acknowledgement is not assigned to the signed-in account.");
  if (target.acknowledgedAt) return;
  window.localStorage.setItem(BROKERAGE_ACKS_KEY, JSON.stringify(records.map((record) =>
    record.id === acknowledgementId ? { ...record, acknowledgedAt: new Date().toISOString() } : record,
  )));
}
