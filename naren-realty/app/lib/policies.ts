import type { ListingType, PropertyListing } from "./properties";

export type PolicyType = "customer_terms" | "owner_terms" | "pg_hostel_policy" | "airbnb_policy" | "privacy_policy" | "brokerage_policy" | "cancellation_refund_policy" | "payment_policy" | "listing_verification_policy" | "site_visit_policy" | "user_conduct_policy" | "grievance_policy" | "disclaimer_policy" | "cookie_policy" | "third_party_policy" | "event_safety_policy";
export type PolicyRole = "customer" | "owner";
export type PolicySection = { heading: string; paragraphs: string[]; bullets?: string[] };
export type PolicyDocument = { type: PolicyType; path: string; title: string; version: string; lastUpdated: string; sections: PolicySection[] };
type SavedPolicyVersion = { version: string; lastUpdated: string };

const LAST_UPDATED = "November 25, 2026";
const DEFAULT_VERSION = "1.0";
const VERSIONS_KEY = "naren-realty-policy-versions-v1";
const ACCEPTANCES_KEY = "naren-realty-policy-acceptances-v1";
const BROKERAGE_ACKS_KEY = "naren-realty-brokerage-acknowledgements-v1";

export const POLICY_DOCUMENTS: PolicyDocument[] = [
  {
    type: "customer_terms", path: "/customer-terms", title: "Customer Terms & Conditions", version: "1.1", lastUpdated: LAST_UPDATED,
    sections: [
      { heading: "Customer Access", paragraphs: ["Property browsing is available without a customer account. My Account features require registration and sign-in."] },
      { heading: "Permitted Property Transaction Scope", paragraphs: ["NAREN REALTY facilitates rental transactions and genuine resale transactions involving existing property owners. It does not sell, market, book or facilitate promoter-side sales of new residential flat projects or a builder's unsold inventory. A resale listing must represent a genuine secondary transaction by an existing owner and not a disguised developer or promoter sale.", "Customers should report any listing that appears to be new project inventory, builder stock or a promoter-side sale. NAREN REALTY may reject or remove such listings."] },
      { heading: "Property Enquiries", paragraphs: ["Customers may send enquiries about properties through Naren Realty. Enquiries are received by the Naren Realty Admin team, which coordinates follow-up.", "The application does not provide direct customer-to-owner messaging or expose owner contact details."] },
      { heading: "Listing Status", paragraphs: ["Owner-submitted properties appear in customer browsing only after Admin approval."] },
      { heading: "Brokerage", paragraphs: ["Applicable brokerage amounts are listed in the Brokerage Policy. Acknowledgement is recorded before the relevant transaction proceeds."] },
    ],
  },
  {
    type: "owner_terms", path: "/owner-terms", title: "Property Owner Terms & Conditions", version: "1.2", lastUpdated: LAST_UPDATED,
    sections: [
      { heading: "Property Submission and Approval", paragraphs: ["Owners may submit accurate property information and photographs for NAREN REALTY Admin review. Every submission remains Pending Approval and must not be treated as publicly listed, verified, reserved or marketed until Admin approval is issued.", "An owner may edit or delete a listing belonging to their account. Material edits, including changes to ownership, authority, price, availability, property identity or transaction type, may return the listing to Pending Approval and require a fresh review."] },
      { heading: "Mandatory Owner / Authorised Representative Declaration", paragraphs: ["For a rental or resale listing, the submitter declares that they are the existing owner of the property or a duly authorised representative with valid, current and documented authority to submit, advertise and coordinate enquiries or visits for that property. A representative must accurately identify the actual owner / landlord / seller and must not claim to be the owner.", "The submitter must provide true, complete and current information and promptly disclose any co-ownership, power-of-attorney limitation, mandate expiry, dispute, encumbrance, occupancy issue or other material fact that may affect the proposed transaction. NAREN REALTY may request identity, ownership, authority and supporting property documents for administrative review."] },
      { heading: "Strictly Excluded Property Inventory", paragraphs: ["NAREN REALTY accepts only rental properties offered by their existing owners or documented authorised representatives and genuine secondary resale properties offered by existing owners or documented authorised representatives.", "New residential projects, builder / promoter unsold inventory, fresh allotments, project bookings, developer stock, channel-partner inventory and promoter-side sales are not accepted. Such inventory must not be presented or disguised as an existing-owner resale. NAREN REALTY may reject, unpublish or remove a listing if its actual transaction nature is unclear or falls outside this scope."] },
      { heading: "Accuracy, Changes and Complaints", paragraphs: ["The submitter is responsible for the accuracy of ownership, authority, title-related statements, location, area, price, rent, deposit, availability, photographs, amenities, permissions and all other listing details. The submitter must promptly notify NAREN REALTY if information changes or the property is sold, rented, withdrawn, disputed or no longer available.", "False declarations, forged or misleading documents, impersonation, unauthorised advertising, duplicate or deceptive listings, or concealment of material facts may result in rejection, suspension, removal, restriction of account access and referral to appropriate authorities where warranted, subject to applicable law."] },
      { heading: "Nature and Limits of Admin Review", paragraphs: ["Admin review is a platform moderation and listing-eligibility check only. Approval does not certify ownership, title, marketability, legal compliance, structural condition, approvals, measurements or the truth of every statement, and is not a title search, legal opinion or guarantee. Buyers, tenants and other users must conduct independent due diligence before entering a transaction."] },
      { heading: "Enquiries and Brokerage", paragraphs: ["Customer enquiries are handled through NAREN REALTY Admin. The application does not provide direct owner-customer messaging or publish owner contact details on public property pages.", "Owner brokerage obligations, if any, depend on the listing category and are stated in the Brokerage Policy and transaction-specific written confirmation. Flat rental owner brokerage is none under the current policy."] },
    ],
  },
  {
    type: "pg_hostel_policy", path: "/pg-hostel-policy", title: "PG / Hostel Policy", version: "1.3", lastUpdated: LAST_UPDATED,
    sections: [
      { heading: "Listing Information", paragraphs: ["PG / Hostel listings may display gender preference, sharing options, rent per person, security deposit, available beds or rooms, facilities, amenities, and property rules.", "Only Admin-approved listings appear in customer browsing."] },
      { heading: "Commission", paragraphs: ["Resident / Tenant brokerage is equal to one month’s rent for a successful PG / Hostel booking facilitated by NAREN REALTY. No brokerage or commission is charged to the PG / Hostel Owner. Applicable GST, if any, is additional."] },
      { heading: "Acknowledgement", paragraphs: ["The Resident / Tenant acknowledges brokerage equal to one month’s rent at the requirement / booking stage. The PG / Hostel Owner is not charged brokerage or commission. Acknowledgement does not collect payment or create a booking."] },
    ],
  },
  {
    type: "airbnb_policy", path: "/airbnb-policy", title: "Airbnb / Short-Stay Policy", version: "1.3", lastUpdated: LAST_UPDATED,
    sections: [
      { heading: "Short-Stay Listings", paragraphs: ["Airbnb / Short-Stay listings may display property type, guest capacity, nightly price, stay limits, amenities, check-in/check-out times, and house rules.", "Only Admin-approved listings appear in customer browsing. The application does not provide online booking or payment."] },
      { heading: "Host Commission", paragraphs: ["The Property Owner / Host commission is 10% of accommodation rent for every successful booking introduced or facilitated by Naren Realty. Cleaning charges and taxes are excluded unless separately agreed in writing. Applicable GST, if any, is additional."] },
      { heading: "Acknowledgement", paragraphs: ["The Host acknowledges the commission policy before the relevant transaction proceeds. No online payment is collected by this prototype."] },
    ],
  },
  {
    type: "privacy_policy", path: "/privacy-policy", title: "Privacy Policy", version: "1.2", lastUpdated: LAST_UPDATED,
    sections: [
      { heading: "Information We Collect", paragraphs: ["Depending on the features you use, NAREN REALTY may collect your name, mobile number, email address, account and authentication details, property requirements, listing information and photographs, enquiries, visit requests, referral information, policy acknowledgements, and communications or follow-up information submitted through the platform."] },
      { heading: "How We Use Information", paragraphs: ["We use information to create and manage accounts, display approved property listings, receive and coordinate enquiries and visit requests, administer referrals, provide customer and owner services, maintain platform security, respond to support requests, and meet applicable legal obligations."] },
      { heading: "Storage and Service Providers", paragraphs: ["NAREN REALTY uses Supabase services for account authentication and selected application records, including property and visit-related data. Some browser features and records, including saved favourites and certain enquiry or policy acknowledgement records, may be stored in the browser Local Storage on the device being used. Such browser-stored information may not automatically synchronize across devices and can be lost if browser data is cleared.", "Supabase and other infrastructure providers process information on our behalf to operate the platform. Access to administrative records is restricted through authenticated roles and application permissions. No online payment processing is offered unless a specific payment facility is separately introduced and disclosed."] },
      { heading: "Access and Sharing", paragraphs: ["Customer contact information is used by authorized NAREN REALTY personnel for enquiry and service coordination and is not intended to be publicly displayed on property pages. Owners can manage their own listings but are not given general access to customer enquiry contact details. Information may be shared with service providers supporting the platform or where required by law, to protect users, or to address security and fraud concerns."] },
      { heading: "Security and Retention", paragraphs: ["We use role-based access controls and the security features available in the services supporting the platform. No internet-based system can be guaranteed to be completely secure. Information is retained for as long as reasonably needed to provide services, maintain business and transaction records, resolve disputes, and comply with applicable legal requirements. Browser Local Storage records remain on the relevant device until cleared or removed by the user or browser."] },
      { heading: "Your Choices and Contact", paragraphs: ["You may contact NAREN REALTY through the official website to request access to, correction of, or deletion of personal information, subject to applicable legal and operational record-keeping requirements. You may also clear browser Local Storage, noting that doing so can remove locally saved account-related preferences or records.", "For privacy-related questions or requests, contact NAREN REALTY through the contact details published on the official website."] },
      { heading: "Marketing Communications and Consent", paragraphs: ["NAREN REALTY may send property-related updates, relevant property listings, property requirement announcements, promotional posters, event invitations and other real-estate-related communications through email, WhatsApp or other communication channels only where the individual has provided the required consent.", "Marketing consent is voluntary and separate from account registration and essential service-related communications. Individuals may withdraw marketing consent at any time by using the unsubscribe option in emails or by contacting NAREN REALTY. Withdrawal of marketing consent will not affect essential communications required to manage an existing enquiry, property visit or transaction."] },
    ],
  },
  {
    type: "brokerage_policy", path: "/brokerage-policy", title: "Brokerage Policy", version: "1.4", lastUpdated: LAST_UPDATED,
    sections: [
      { heading: "Existing-Owner Resale – Transactions Above ₹1 Crore", paragraphs: ["For a completed resale transaction where the final agreed sale consideration is strictly more than ₹1,00,00,000 (Rupees One Crore), buyer brokerage is 1% of the final sale value and seller brokerage is separately 1% of the final sale value. Each side is independently responsible for its own 1% brokerage obligation, subject to its separate acceptance of the brokerage terms. The combined brokerage payable by both sides is 2% of the final sale value.", "The threshold is determined using the final agreed transaction value, not the advertised or initial asking price. Applicable GST, if any, is additional.", "For a resale transaction where the final agreed sale consideration is ₹1,00,00,000 (Rupees One Crore) or less, buyer brokerage is 2% of the final sale value and seller brokerage is separately 2% of the final sale value. Each side is independently responsible for its own 2% brokerage obligation, subject to its separate acceptance of the brokerage terms. The combined brokerage payable by both sides is 4%."] },
      { heading: "Flat Rental", paragraphs: ["Tenant brokerage: an amount equal to one month's rent.", "Owner brokerage: none."] },
      { heading: "PG / Hostel", paragraphs: ["Resident / Tenant brokerage: an amount equal to one month’s rent.", "PG / Hostel Owner brokerage: none."] },
      { heading: "Airbnb / Short Stay", paragraphs: ["Guest commission: none.", "Property Owner / Host commission: 10% of accommodation rent for every successful booking introduced or facilitated by Naren Realty. Cleaning charges and taxes are excluded unless separately agreed in writing."] },
      { heading: "Taxes and Acknowledgement", paragraphs: ["Applicable GST, if any, is additional to brokerage or commission.", "The buyer and seller must each separately acknowledge their own applicable resale brokerage obligation. The applicable rate, fee basis and payment trigger must be recorded in the transaction-specific written brokerage confirmation. Acknowledgement does not collect online payments or provide booking functionality."] },
    ],
  },
{"type":"cancellation_refund_policy","path":"/cancellation-refund-policy","title":"Cancellation & Refund Policy","version":"1.0","lastUpdated":"November 18, 2026","sections":[{"heading":"Current Platform Scope","paragraphs":["NAREN REALTY currently provides property discovery, enquiry and coordination features. The website does not itself confirm online bookings or collect booking deposits, rent, tokens or other transaction payments through an integrated payment gateway."]},{"heading":"Enquiry and Visit Cancellation","paragraphs":["A customer may contact NAREN REALTY to withdraw or change an enquiry or site-visit request. A visit request is not a confirmed booking and does not guarantee property availability."]},{"heading":"Refunds Between Transaction Parties","paragraphs":["If a customer and owner, host, landlord or accommodation provider exchange a deposit, advance, token or other amount directly, refund and cancellation terms must be agreed between those parties in writing before payment. NAREN REALTY does not promise a refund of money it has not collected."]},{"heading":"Future Paid Features","paragraphs":["If online payments or booking functionality are introduced, applicable cancellation windows, refund eligibility, processing method and timelines will be disclosed before payment and this policy will be updated."]}]},
  {"type":"payment_policy","path":"/payment-policy","title":"Payment Policy","version":"1.0","lastUpdated":"November 18, 2026","sections":[{"heading":"Current Payment Functionality","paragraphs":["NAREN REALTY currently does not collect rent, security deposits, booking amounts, token money or property purchase consideration through an integrated online payment facility. Enquiry submission or a site-visit request does not require online payment to NAREN REALTY."]},{"heading":"Payments Between Parties","paragraphs":["Payments made directly to an owner, host, landlord, PG / Hostel operator or another transaction party are separate from the website. Users should independently verify the recipient, amount, purpose, receipt and written terms before transferring money."]},{"heading":"Brokerage and Commission","paragraphs":["Brokerage and commission obligations are category-specific and described in the Brokerage Policy. Applicable GST, if any, is additional. The applicable party must review and acknowledge the terms at the relevant submission stage."]},{"heading":"Payment Security","paragraphs":["Do not share card PINs, CVVs, passwords, OTPs or internet-banking credentials with NAREN REALTY personnel or other users."]}]},
  {"type":"listing_verification_policy","path":"/property-listing-verification-policy","title":"Property Listing & Verification Policy","version":"1.2","lastUpdated":"November 25, 2026","sections":[{"heading":"Scope: Existing-Owner Resale and Rental Only","paragraphs":["NAREN REALTY accepts genuine rental listings and genuine secondary resale listings offered by an existing property owner or a duly authorised representative with documented authority. It does not sell, market, book or facilitate new residential project sales, builder / promoter unsold inventory, fresh allotments, project bookings or promoter-side sales.","A listing described as resale must represent an actual secondary transaction by an existing owner. Re-labelling developer inventory, new project stock or a promoter-side transaction as resale is prohibited."]},{"heading":"Submission and Admin Approval","paragraphs":["Every owner-submitted listing remains Pending Approval and is not eligible for public display until approved by NAREN REALTY Admin. Admin may request clarification or supporting records, decline a submission, or return it for correction. A material change to the listing may require fresh review.","Approval is a platform publishing and moderation decision only. It is not a legal title certificate, title search, valuation, statutory approval, property-condition inspection or guarantee that every submitted statement is correct."]},{"heading":"Owner and Representative Declaration","paragraphs":["The submitter must be the existing owner / landlord / seller or a duly authorised representative with valid, current and documented authority to advertise the property and coordinate enquiries or visits. The actual owner / landlord / seller must be accurately identified; a representative must not impersonate the owner.","The submitter is responsible for accurate, complete and current disclosures, including ownership and authority status, co-ownership, property identity, location, area, price or rent, deposit, availability, occupancy, material restrictions, disputes and other facts that may affect a transaction."]},{"heading":"Documents and Administrative Checks","paragraphs":["NAREN REALTY may request identity proof, ownership records, latest available property records, authority letter, power of attorney, mandate, property photographs or other supporting documents reasonably required for administrative review. Documents may be reviewed for consistency and listing eligibility; such review does not amount to independent legal verification or a certification of title.","NAREN REALTY may reject, pause, unpublish or remove a listing where ownership or authority is unclear, documents are incomplete or inconsistent, information appears misleading, a dispute is reported, or the listing cannot reasonably be assessed within the platform's accepted scope."]},{"heading":"Misrepresentation and Enforcement","paragraphs":["False ownership or authority declarations, impersonation, forged or altered documents, unauthorised advertising, concealed material facts, duplicate or deceptive listings, or presenting new-project inventory as resale may lead to rejection, removal, suspension or restriction of the account, and may be reported to appropriate authorities where warranted and permitted by law.","The submitter must promptly notify NAREN REALTY of any change in ownership, authority, availability, price, rent, occupancy, dispute status or other material listing information and must request correction or withdrawal where required."]},{"heading":"Independent Due Diligence","paragraphs":["Users must independently verify identity, authority to transact, title and chain of title, encumbrances, mortgages, liens, litigation, approvals, permissions, land use, measurements, building condition, taxes, society rules, occupancy, rent, deposit and contractual terms before paying money or signing documents.","Listing approval does not replace independent legal, technical, financial or statutory due diligence. Users should obtain advice from qualified professionals appropriate to the proposed transaction."]},{"heading":"Photographs and Listing Content","paragraphs":["The submitter must own or have permission to use all photographs, floor plans, videos, descriptions and other uploaded content. Content must relate to the actual property and must not be manipulated or presented in a way that materially misleads users."]}]},
  {"type":"site_visit_policy","path":"/site-visit-policy","title":"Enquiry & Site Visit Policy","version":"1.0","lastUpdated":"November 18, 2026","sections":[{"heading":"Visit Requests","paragraphs":["A site-visit request is a request for coordination, not a confirmed appointment. A visit is subject to property availability and confirmation by NAREN REALTY and the relevant representative."]},{"heading":"Changes and Cancellations","paragraphs":["Customers should inform NAREN REALTY as early as reasonably possible if they need to change or cancel a visit."]},{"heading":"During a Visit","paragraphs":["Visitors must follow reasonable safety instructions and property rules. Do not enter restricted areas or photograph people or private documents without permission."]},{"heading":"No Reservation","paragraphs":["A visit does not reserve or hold a property and does not guarantee that it will remain available or that stated terms will remain unchanged. Confirm material details in writing."]}]},
  {"type":"event_safety_policy","path":"/event-safety-policy","title":"Event Safety: No Alcohol, No Drugs & Prohibited Items Policy","version":"1.0","lastUpdated":"November 25, 2026","sections":[{"heading":"Scope and Zero-Alcohol Rule","paragraphs":["This policy applies to every event listed, promoted or booked through NAREN REALTY, including offline, online and hybrid events where relevant. Alcohol is not permitted at any NAREN REALTY-listed event. Bringing, possessing, consuming, serving, selling, supplying or distributing alcoholic beverages at an event is prohibited. BYOB arrangements, beer festivals, liquor counters, alcohol promotions and alcohol-sponsored activities are not accepted."]},{"heading":"Drugs and Prohibited Substances","paragraphs":["Possession, consumption, sale, supply, distribution or promotion of illegal drugs, narcotics, psychotropic substances or other substances prohibited by applicable law is strictly prohibited. This includes substances regulated or prohibited under the Narcotic Drugs and Psychotropic Substances Act, 1985 and applicable state laws.","Lawfully prescribed medicines for personal medical use are not prohibited merely because they are medicines, provided they are carried and used lawfully and comply with reasonable venue safety requirements."]},{"heading":"Prohibited Items","paragraphs":["The following items are prohibited unless expressly authorised by applicable law and the event organiser for a legitimate, approved purpose."],"bullets":["Firearms, ammunition, explosives and unauthorised weapons.","Knives, daggers, swords, sharp objects and items intended or adapted to cause injury.","Fireworks, firecrackers, detonators, smoke bombs and unauthorised pyrotechnics.","Toxic, corrosive, flammable or other hazardous chemicals and materials.","Illegal drugs, unlawful intoxicants and equipment associated with unlawful drug use.","Counterfeit, illegal or unlawfully possessed goods.","Unauthorised surveillance, signal-interference or recording equipment where prohibited by law or venue rules.","Any other item prohibited by applicable law, competent authorities or legitimate venue safety instructions."]},{"heading":"Entry Checks and Enforcement","paragraphs":["Organisers and authorised venue security personnel may conduct reasonable and lawful entry or baggage checks in accordance with applicable law and venue procedures. Entry may be refused, or a person may be removed where legally justified, if they carry prohibited items or violate event safety rules. Suspected unlawful activity may be reported to the appropriate authorities."]},{"heading":"Attendee Responsibilities","paragraphs":["Attendees must comply with this policy, event-specific instructions and lawful security checks. Attendees must not bring, possess, consume, sell or distribute alcohol or prohibited substances, or bring weapons or dangerous items. Attendees should report suspicious or dangerous activity to event security."]},{"heading":"Organiser Responsibilities","paragraphs":["Organisers must communicate this policy to attendees, venue personnel, vendors, sponsors, performers and contractors; take reasonable steps to prevent prohibited items from entering the event; arrange suitable security and entry-management procedures; and promptly report serious incidents or suspected unlawful activity to the appropriate authorities. Organisers must not advertise or conduct BYOB arrangements, beer festivals, alcohol counters or alcohol-related promotions."]},{"heading":"Violations and Platform Action","paragraphs":["Depending on the nature and seriousness of a violation, the organiser or authorised venue personnel may refuse entry, remove a person where legally justified, cancel an unauthorised activity, or suspend an event where necessary for safety or legal compliance. NAREN REALTY may reject, suspend or remove an event listing or restrict an organiser account for policy violations, false declarations or repeated non-compliance, subject to applicable law and contractual terms. Ticket cancellation and refunds will be handled under the applicable event refund policy and consumer law."]},{"heading":"Platform Role and Liability","paragraphs":["NAREN REALTY operates as an event discovery, listing and booking platform unless it expressly identifies itself as the event organiser. Organisers remain responsible for event operations, venue management, personnel, vendors and implementation of this policy. Nothing in this policy excludes liability that cannot legally be excluded."]},{"heading":"Applicable Law","paragraphs":["This policy is governed by applicable laws of India and the laws applicable at the event location, including relevant public-safety, excise and narcotics legislation."]}]},
  {"type":"user_conduct_policy","path":"/user-conduct-policy","title":"User Conduct & Fair Use Policy","version":"1.0","lastUpdated":"November 18, 2026","sections":[{"heading":"Lawful and Accurate Use","paragraphs":["Users must provide truthful information and use the platform for lawful property-related purposes."]},{"heading":"Prohibited Conduct","paragraphs":["Fake, duplicate, misleading or unauthorized listings or enquiries; harassment, threats, discrimination or abusive language; impersonation, fraud, referral manipulation or spam; unlawful or infringing uploads; attempts to access another user's private information or restricted records."]},{"heading":"Enforcement","paragraphs":["NAREN REALTY may request clarification, restrict features, reject or remove content, suspend access or refer suspected unlawful activity to appropriate authorities where justified and permitted by law."]},{"heading":"Reporting","paragraphs":["Report suspected misuse through the contact channels published on the official website."]}]},
  {"type":"grievance_policy","path":"/grievance-redressal-policy","title":"Grievance Redressal Policy","version":"1.0","lastUpdated":"November 18, 2026","sections":[{"heading":"How to Complain","paragraphs":["Submit your name, reachable contact method, relevant listing or enquiry reference, a clear description and supporting material through the contact details or form published on the website. Do not include passwords, OTPs or full card details."]},{"heading":"Review","paragraphs":["NAREN REALTY will review complaints reasonably, may request further information and communicate an outcome or next steps using the contact details provided. Mark urgent safety, fraud, privacy or account-security complaints clearly."]},{"heading":"Grievance Contact Details","paragraphs":["The current policy source does not contain a separately verified Grievance Officer name or dedicated grievance email. NAREN REALTY must add and verify those details before treating this as a complete statutory grievance notice."]},{"heading":"External Rights","paragraphs":["This process does not restrict rights to approach a competent authority, consumer commission, regulator or court under applicable law."]}]},
  {"type":"disclaimer_policy","path":"/disclaimer","title":"Disclaimer & Limitation of Liability","version":"1.1","lastUpdated":"November 25, 2026","sections":[{"heading":"Platform Role and Business Scope","paragraphs":["NAREN REALTY provides property discovery, listing, enquiry and coordination facilities for rental properties and genuine resale properties offered by existing owners. Unless expressly stated in a written agreement, it is not the owner, landlord, tenant, buyer, seller, developer, builder, host or accommodation operator for a listed property.","NAREN REALTY does not sell, market, book or facilitate promoter-side sales of new residential flat projects or builder / promoter unsold inventory."]},{"heading":"Listing Information","paragraphs":["Property details, photographs, prices, availability, amenities, dimensions, approvals and descriptions may be provided by owners or other third parties. Publication review does not certify every statement or guarantee that information is complete, current or error-free."]},{"heading":"Independent Verification","paragraphs":["Users must independently verify identity, authority to transact, title, encumbrances, approvals, permitted use, measurements, condition, amenities, taxes, deposits, rent, charges and contractual terms before paying money or signing documents."]},{"heading":"Third-Party Conduct","paragraphs":["NAREN REALTY is not responsible for third-party acts, omissions, representations, payment handling, property condition or contractual performance, except to the extent liability cannot lawfully be excluded."]},{"heading":"No Professional Advice","paragraphs":["Website content is general information and is not legal, tax, financial, valuation, engineering or investment advice."]}]},
  {"type":"cookie_policy","path":"/cookie-policy","title":"Cookie Policy","version":"1.0","lastUpdated":"November 18, 2026","sections":[{"heading":"Current Use","paragraphs":["The website may use browser storage and essential technologies to support sign-in sessions, preferences, security and application functionality. Exact technologies may vary by feature and provider."]},{"heading":"Browser Controls","paragraphs":["You can review or clear cookies and site data through browser settings. Blocking essential storage may prevent sign-in or other website features from working correctly."]},{"heading":"Optional Tracking","paragraphs":["This policy does not assert that optional advertising or analytics cookies are currently enabled. If introduced, purposes, providers and consent controls should be disclosed before activation where required by law."]}]},
  {"type":"third_party_policy","path":"/third-party-services-policy","title":"Third-Party Services & Data Sharing Policy","version":"1.0","lastUpdated":"November 18, 2026","sections":[{"heading":"Service Providers","paragraphs":["NAREN REALTY relies on third-party infrastructure and service providers to host the website, authenticate users, store application data and deliver technical functionality."]},{"heading":"External Links","paragraphs":["External websites and communication services operate under their own terms and privacy policies. Review those terms before sharing information or making payments."]},{"heading":"Limited Sharing","paragraphs":["Information is shared with service providers as reasonably needed to operate, secure and support the platform, or where required or permitted by law. Customer contact details are not published on public property pages."]},{"heading":"Provider Details","paragraphs":["Specific provider names, hosting regions, retention periods and data-transfer details must be confirmed against the live technical configuration and provider contracts before this policy is treated as a complete vendor disclosure."]}]}
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
        ? [{ userRole: "customer", party: "Resident" }]
        : [{ userRole: "owner", party: "Host" }];
  return requiredParties.every(({ userRole, party }) => records.some((record) =>
    record.userRole === userRole && record.party === party && record.policyVersion === version && Boolean(record.acknowledgedAt),
  ));
}

function brokerageStatement(category: ListingType, party: BrokerageParty): string {
  if (category === "Resale" && party === "Buyer") return "For a completed resale transaction where the final agreed sale consideration is strictly more than ₹1 crore, buyer brokerage is 1% of the final sale value. For a resale transaction where the final agreed sale consideration is ₹1 crore or less, the applicable party brokerage is 2% of the final sale value. Applicable GST, if any, is additional.";
  if (category === "Resale" && party === "Seller") return "For a completed resale transaction where the final agreed sale consideration is strictly more than ₹1 crore, seller brokerage is separately 1% of the final sale value. For a resale transaction where the final agreed sale consideration is ₹1 crore or less, the applicable party brokerage is 2% of the final sale value. Applicable GST, if any, is additional.";
  if (category === "Rental" && party === "Tenant") return "Tenant brokerage is equal to one month's rent. Applicable GST, if any, is additional.";
  if (category === "PG" && party === "Resident") return "Resident / Tenant brokerage is equal to one month’s rent for a successful PG / Hostel booking facilitated by Naren Realty. Applicable GST, if any, is additional.";
  if (category === "PG" && party === "PG / Hostel Owner") return "No brokerage or commission is payable by the PG / Hostel Owner.";
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
    parties.push({ userId: input.customerId, userRole: "customer", party: "Resident" });
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
