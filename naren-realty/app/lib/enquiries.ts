export type EnquiryRequirement = "Rental" | "Resale" | "PG" | "Airbnb";
export const ENQUIRY_STATUSES = [
  "New",
  "Contacted",
  "Owner Confirmation",
  "Visit Scheduled",
  "Visit Completed",
  "Negotiation",
  "Deal Closed",
  "Lost",
] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

export type EnquiryRecord = {
  id: string;
  fullName: string;
  mobileNumber: string;
  requirement: EnquiryRequirement | "";
  message: string;
  propertyName: string;
  locality: string;
  listingId?: string;
  customerId?: string;
  createdAt: string;
  status: EnquiryStatus;
  adminCallNotes?: string;
  nextFollowUpDate?: string;
  ownerCoordinationNotes?: string;
};

type NewEnquiry = Omit<EnquiryRecord, "id" | "createdAt" | "status">;

const STORAGE_KEY = "naren-realty-enquiries-v1";

export function getEnquiriesLocally(): EnquiryRecord[] {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];

  const parsed: unknown = JSON.parse(stored);
  if (!Array.isArray(parsed)) {
    throw new Error("Stored enquiries are invalid.");
  }

  return parsed.map((item) => {
    if (typeof item !== "object" || item === null) {
      throw new Error("Stored enquiry is invalid.");
    }

    const enquiry = item as EnquiryRecord;
    return {
      ...enquiry,
      status: ENQUIRY_STATUSES.includes(enquiry.status) ? enquiry.status : "New",
    };
  });
}

export function saveEnquiryLocally(enquiry: NewEnquiry): EnquiryRecord {
  const enquiries = getEnquiriesLocally();
  const saved: EnquiryRecord = {
    ...enquiry,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    status: "New",
  };
  enquiries.push(saved);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(enquiries));
  return saved;
}

export function updateEnquiryStatusLocally(id: string, status: EnquiryStatus): void {
  const enquiries = getEnquiriesLocally().map((enquiry) =>
    enquiry.id === id ? { ...enquiry, status } : enquiry,
  );
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(enquiries));
}

export function updateEnquiryAdminDetailsLocally(
  id: string,
  details: Pick<EnquiryRecord, "adminCallNotes" | "nextFollowUpDate" | "ownerCoordinationNotes">,
): void {
  const enquiries = getEnquiriesLocally().map((enquiry) =>
    enquiry.id === id ? { ...enquiry, ...details } : enquiry,
  );
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(enquiries));
}

export function deleteEnquiryLocally(id: string): void {
  const enquiries = getEnquiriesLocally().filter((enquiry) => enquiry.id !== id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(enquiries));
}
