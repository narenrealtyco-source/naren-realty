import { requireAdmin } from "./supabase-server";
import { ENQUIRY_STATUSES, type EnquiryRecord } from "./enquiries";
import { homeServicesReady } from "./home-services-config";
import { propertySubmissionsEnabled } from "./property-submission-config";
import { indiaCalendarDate } from "./property-marketing";
import { requirementsReady } from "./requirements";
import { visitStatuses } from "./visit-requests";
import { vendorMarketplaceReady } from "./vendor-marketplace";

const PROPERTY_COLUMNS = [
  "id",
  "owner_id",
  "title",
  "category",
  "locality",
  "price",
  "details",
  "photos",
  "status",
  "created_at",
  "updated_at",
] as const;

export type AdminPropertyRecord = {
  id: string;
  owner_id: string;
  title: string;
  category: string;
  locality: string;
  price: number;
  details: unknown;
  photos: unknown;
  status: string;
  created_at: string;
  updated_at: string;
};

export type AdminDashboardSection<T> =
  | { state: "available"; metrics: T }
  | { state: "unavailable" | "error"; message: string };

export type PropertyDashboardMetrics = {
  totalProperties: number;
  pendingProperties: number;
  approvedProperties: number;
  rejectedProperties: number;
};

export type VisitDashboardMetrics = {
  totalVisits: number;
  pendingVisits: number;
  confirmedVisits: number;
  completedVisits: number;
  cancelledVisits: number;
  todaysVisits: number;
};

export type EnquiryDashboardMetrics = {
  totalEnquiries: number;
  newEnquiries: number;
  inProgressEnquiries: number;
  dealClosedEnquiries: number;
};

export type ServiceRequestDashboardMetrics = {
  totalRequests: number;
  pendingRequests: number;
  inProgressRequests: number;
  completedRequests: number;
};

export type VendorDashboardMetrics = {
  totalVendors: number;
  pendingVendors: number;
  approvedVendors: number;
  rejectedVendors: number;
};

export type RequirementDashboardMetrics = {
  totalRequirements: number;
  newRequirements: number;
  pendingRequirements: number;
};

export type SubmissionDashboardMetrics = {
  totalSubmissions: number;
  pendingSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
};

export type AdminDashboardStats = {
  properties: AdminDashboardSection<PropertyDashboardMetrics>;
  visits: AdminDashboardSection<VisitDashboardMetrics>;
  enquiries: AdminDashboardSection<EnquiryDashboardMetrics>;
  serviceRequests: AdminDashboardSection<ServiceRequestDashboardMetrics>;
  vendors: AdminDashboardSection<VendorDashboardMetrics>;
  requirements: AdminDashboardSection<RequirementDashboardMetrics>;
  submissions: AdminDashboardSection<SubmissionDashboardMetrics>;
};

type DashboardStatusRow = { id: string; status: string; visit_date?: string };
type DashboardSupabase = Awaited<ReturnType<typeof requireAdmin>>["supabase"];
const DASHBOARD_PAGE_SIZE = 1000;

async function readDashboardRows(
  supabase: DashboardSupabase,
  table: string,
  includeVisitDate = false,
): Promise<DashboardStatusRow[]> {
  const rows: DashboardStatusRow[] = [];
  const columns = includeVisitDate ? "id,status,visit_date" : "id,status";

  for (;;) {
    const { data, error, count } = await supabase
      .from(table)
      .select(columns, { count: "exact" })
      .order("id", { ascending: true })
      .range(rows.length, rows.length + DASHBOARD_PAGE_SIZE - 1)
      .overrideTypes<DashboardStatusRow[], { merge: false }>();

    if (error || count === null) {
      throw new Error(`Could not load ${table} dashboard metrics from Supabase: ${error?.message ?? "Exact row count was unavailable."}`);
    }

    for (const row of data ?? []) {
      if (!row.id || typeof row.status !== "string" || !row.status.trim()) {
        throw new Error(`Supabase returned an invalid ${table} dashboard record.`);
      }
      if (includeVisitDate && (typeof row.visit_date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(row.visit_date))) {
        throw new Error("Supabase returned a visit with an invalid date.");
      }
      rows.push(row);
    }

    if (rows.length >= count) return rows;
    if (!data?.length) throw new Error(`Could not load all ${table} dashboard records.`);
  }
}

async function countDashboardRows(supabase: DashboardSupabase, table: string): Promise<number> {
  const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true });
  if (error || count === null) {
    throw new Error(`Could not count ${table} dashboard records from Supabase: ${error?.message ?? "Exact row count was unavailable."}`);
  }
  return count;
}

function normalizedStatus(row: DashboardStatusRow): string {
  return row.status.trim().toLowerCase();
}

function assertKnownStatuses(rows: DashboardStatusRow[], table: string, statuses: readonly string[]): void {
  const known = new Set(statuses.map((status) => status.toLowerCase()));
  const unsupported = rows.find((row) => !known.has(normalizedStatus(row)));
  if (unsupported) throw new Error(`Supabase returned an unsupported ${table} status.`);
}

function unavailableMetrics<T>(message: string): AdminDashboardSection<T> {
  return { state: "unavailable", message };
}

async function loadMetricSection<T>(
  label: string,
  load: () => Promise<T>,
): Promise<AdminDashboardSection<T>> {
  try {
    return { state: "available", metrics: await load() };
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
      ? error.code
      : undefined;
    console.error("[admin-dashboard] Metric lookup failed", { section: label, code });
    return { state: "error", message: `${label} metrics could not be loaded. Retry the dashboard to try again.` };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(row: Record<string, unknown>, field: string): string {
  const value = row[field];
  if (typeof value !== "string") {
    throw new Error(`Admin property data has an invalid "${field}" value.`);
  }
  return value;
}

function numberField(row: Record<string, unknown>, field: string): number {
  const value = row[field];
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`Admin property data has an invalid "${field}" value.`);
  }
  return number;
}

function mapProperty(row: unknown): AdminPropertyRecord {
  if (!isRecord(row)) {
    throw new Error("Supabase returned an invalid admin property record.");
  }

  return {
    id: stringField(row, "id"),
    owner_id: stringField(row, "owner_id"),
    title: stringField(row, "title"),
    category: stringField(row, "category"),
    locality: stringField(row, "locality"),
    price: numberField(row, "price"),
    details: row.details,
    photos: row.photos,
    status: stringField(row, "status"),
    created_at: stringField(row, "created_at"),
    updated_at: stringField(row, "updated_at"),
  };
}

export async function getAdminPropertiesFromSupabase(): Promise<AdminPropertyRecord[]> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("properties")
    .select(PROPERTY_COLUMNS.join(","));

  if (error) {
    throw new Error(`Could not load admin properties from Supabase: ${error.message}`);
  }

  return (data ?? []).map(mapProperty);
}

export async function getAdminEnquiriesFromSupabase(): Promise<EnquiryRecord[]> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("enquiries")
    .select("id,customer_id,property_id,customer_name,customer_phone,requirement,message,status,admin_notes,follow_up_date,created_at");

  if (error) {
    throw new Error(`Could not load admin enquiries from Supabase: ${error.message}`);
  }

  return (data ?? []).map(mapEnquiry);
}

export async function getAdminDashboardStatsFromSupabase(): Promise<AdminDashboardStats> {
  const { supabase } = await requireAdmin();
  const secureSetupUnavailable = "Metrics are unavailable until secure Supabase setup is verified.";
  const today = indiaCalendarDate();
  const [properties, visits, enquiries, serviceRequests, vendors, requirements, submissions] = await Promise.all([
    loadMetricSection("Property listings", async () => {
      const rows = await readDashboardRows(supabase, "properties");
      return {
        totalProperties: rows.length,
        pendingProperties: rows.filter((row) => ["pending", "pending approval"].includes(normalizedStatus(row))).length,
        approvedProperties: rows.filter((row) => normalizedStatus(row) === "approved").length,
        rejectedProperties: rows.filter((row) => normalizedStatus(row) === "rejected").length,
      };
    }),
    process.env.VISIT_REQUESTS_ENABLED === "true"
      ? loadMetricSection("Property visits", async () => {
        const rows = await readDashboardRows(supabase, "visit_requests", true);
        assertKnownStatuses(rows, "visit requests", visitStatuses);
        const statuses = rows.map(normalizedStatus);
        return {
          totalVisits: rows.length,
          pendingVisits: statuses.filter((status) => status === "pending").length,
          confirmedVisits: statuses.filter((status) => status === "confirmed").length,
          completedVisits: statuses.filter((status) => status === "completed").length,
          cancelledVisits: statuses.filter((status) => status === "cancelled").length,
          todaysVisits: rows.filter((row) => row.visit_date === today && normalizedStatus(row) !== "cancelled").length,
        };
      })
      : Promise.resolve(unavailableMetrics<VisitDashboardMetrics>("Visit requests are disabled in the current environment.")),
    loadMetricSection("Customer enquiries", async () => {
      const rows = await readDashboardRows(supabase, "enquiries");
      assertKnownStatuses(rows, "enquiry", ENQUIRY_STATUSES);
      const statuses = rows.map(normalizedStatus);
      const inProgressStatuses = new Set(["contacted", "owner confirmation", "visit scheduled", "visit completed", "negotiation"]);
      return {
        totalEnquiries: rows.length,
        newEnquiries: statuses.filter((status) => status === "new").length,
        inProgressEnquiries: statuses.filter((status) => inProgressStatuses.has(status)).length,
        dealClosedEnquiries: statuses.filter((status) => status === "deal closed").length,
      };
    }),
    homeServicesReady()
      ? loadMetricSection("Home service requests", async () => {
        const rows = await readDashboardRows(supabase, "home_service_enquiries");
        assertKnownStatuses(rows, "home service", ["pending", "contacted", "completed", "cancelled"]);
        const statuses = rows.map(normalizedStatus);
        return {
          totalRequests: rows.length,
          pendingRequests: statuses.filter((status) => status === "pending").length,
          inProgressRequests: statuses.filter((status) => status === "contacted").length,
          completedRequests: statuses.filter((status) => status === "completed").length,
        };
      })
      : Promise.resolve(unavailableMetrics<ServiceRequestDashboardMetrics>(secureSetupUnavailable)),
    vendorMarketplaceReady()
      ? loadMetricSection("Vendor management", async () => {
        const [applications, totalVendors] = await Promise.all([
          readDashboardRows(supabase, "service_vendor_applications"),
          countDashboardRows(supabase, "service_vendors"),
        ]);
        assertKnownStatuses(applications, "vendor application", ["pending", "approved", "rejected"]);
        const statuses = applications.map(normalizedStatus);
        return {
          totalVendors,
          pendingVendors: statuses.filter((status) => status === "pending").length,
          approvedVendors: statuses.filter((status) => status === "approved").length,
          rejectedVendors: statuses.filter((status) => status === "rejected").length,
        };
      })
      : Promise.resolve(unavailableMetrics<VendorDashboardMetrics>(secureSetupUnavailable)),
    requirementsReady()
      ? loadMetricSection("Customer requirements", async () => {
        const [propertyRequirements, loanRequirements] = await Promise.all([
          readDashboardRows(supabase, "property_requirements"),
          readDashboardRows(supabase, "loan_requirements"),
        ]);
        assertKnownStatuses(propertyRequirements, "property requirement", ["New", "Contacted", "Closed"]);
        assertKnownStatuses(loanRequirements, "loan requirement", ["New", "Contacted", "Documents Pending", "Under Process", "Approved", "Rejected", "Closed"]);
        const propertyStatuses = propertyRequirements.map(normalizedStatus);
        const loanStatuses = loanRequirements.map(normalizedStatus);
        const pendingLoanStatuses = new Set(["new", "contacted", "documents pending", "under process"]);
        return {
          totalRequirements: propertyRequirements.length + loanRequirements.length,
          newRequirements: propertyStatuses.filter((status) => status === "new").length + loanStatuses.filter((status) => status === "new").length,
          pendingRequirements: propertyStatuses.filter((status) => status === "new" || status === "contacted").length + loanStatuses.filter((status) => pendingLoanStatuses.has(status)).length,
        };
      })
      : Promise.resolve(unavailableMetrics<RequirementDashboardMetrics>(secureSetupUnavailable)),
    propertySubmissionsEnabled()
      ? loadMetricSection("Property submissions", async () => {
        const rows = await readDashboardRows(supabase, "property_submissions");
        assertKnownStatuses(rows, "property submission", ["pending", "approved", "rejected"]);
        const statuses = rows.map(normalizedStatus);
        return {
          totalSubmissions: rows.length,
          pendingSubmissions: statuses.filter((status) => status === "pending").length,
          approvedSubmissions: statuses.filter((status) => status === "approved").length,
          rejectedSubmissions: statuses.filter((status) => status === "rejected").length,
        };
      })
      : Promise.resolve(unavailableMetrics<SubmissionDashboardMetrics>("Property submissions are disabled in the current environment.")),
  ]);

  return { properties, visits, enquiries, serviceRequests, vendors, requirements, submissions };
}

function nullableString(value: unknown): string | undefined {
  return value === null || value === undefined ? undefined : typeof value === "string" ? value : undefined;
}

function enquiryStatus(value: unknown): EnquiryRecord["status"] {
  if (typeof value !== "string") {
    throw new Error("Supabase returned an enquiry with an invalid status.");
  }
  const statuses = [
    "New",
    "Contacted",
    "Owner Confirmation",
    "Visit Scheduled",
    "Visit Completed",
    "Negotiation",
    "Deal Closed",
    "Lost",
  ] as const;
  if (!statuses.includes(value as (typeof statuses)[number])) {
    throw new Error(`Supabase returned an unsupported enquiry status: "${value}".`);
  }
  return value as EnquiryRecord["status"];
}

function enquiryRequirement(value: unknown): EnquiryRecord["requirement"] {
  if (value === null || value === undefined || value === "") return "";
  if (value === "Rental" || value === "Resale" || value === "PG" || value === "Airbnb") return value;
  throw new Error(`Supabase returned an unsupported enquiry requirement: "${String(value)}".`);
}

function mapEnquiry(value: Record<string, unknown>): EnquiryRecord {
  const id = nullableString(value.id);
  const customerId = nullableString(value.customer_id);
  if (!id || !customerId) {
    throw new Error("Supabase returned an enquiry without a valid ID or customer ID.");
  }

  return {
    id,
    customerId,
    listingId: nullableString(value.property_id),
    fullName: nullableString(value.customer_name) ?? "Unknown customer",
    mobileNumber: nullableString(value.customer_phone) ?? "",
    requirement: enquiryRequirement(value.requirement),
    message: nullableString(value.message) ?? "",
    propertyName: nullableString(value.property_id) ?? "Property not specified",
    locality: "Not provided",
    status: enquiryStatus(value.status),
    adminCallNotes: nullableString(value.admin_notes),
    nextFollowUpDate: nullableString(value.follow_up_date)?.slice(0, 10),
    createdAt: nullableString(value.created_at) ?? "",
  };
}
