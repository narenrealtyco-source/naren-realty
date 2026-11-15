import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const sourceUrl = new URL("../app/lib/admin-supabase-data.ts", import.meta.url);
const enquiriesStatuses = ["New", "Contacted", "Owner Confirmation", "Visit Scheduled", "Visit Completed", "Negotiation", "Deal Closed", "Lost"];
const visitStatuses = ["pending", "confirmed", "rescheduled", "completed", "cancelled"];

async function loadDashboard({
  rows = {},
  visitsEnabled = false,
  readiness = {},
  submissionsEnabled = false,
  failTable = "",
} = {}) {
  const source = await readFile(sourceUrl, "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const queries = [];
  const supabase = {
    from(table) {
      const query = { table, columns: "", range: [0, 999] };
      queries.push(query);
      const builder = {
        select(columns, options) { query.columns = columns; query.options = options; return this; },
        order(column, options) { query.order = [column, options]; return this; },
        range(from, to) { query.range = [from, to]; return this; },
        async overrideTypes() {
          if (table === failTable) {
            return { data: null, error: { code: "42P01", message: "relation unavailable" }, count: null };
          }
          const tableRows = rows[table] ?? [];
          const [from, to] = query.range;
          return { data: tableRows.slice(from, to + 1), error: null, count: tableRows.length };
        },
        then(resolve, reject) {
          if (table === failTable) {
            return Promise.resolve({ count: null, error: { code: "42P01", message: "relation unavailable" } }).then(resolve, reject);
          }
          return Promise.resolve({ count: (rows[table] ?? []).length, error: null }).then(resolve, reject);
        },
      };
      return builder;
    },
  };
  const modules = {
    "./supabase-server": { requireAdmin: async () => ({ supabase }) },
    "./enquiries": { ENQUIRY_STATUSES: enquiriesStatuses },
    "./home-services-config": { homeServicesReady: () => Boolean(readiness.services) },
    "./property-submission-config": { propertySubmissionsEnabled: () => submissionsEnabled },
    "./property-marketing": { indiaCalendarDate: () => "2026-11-14" },
    "./requirements": { requirementsReady: () => Boolean(readiness.requirements) },
    "./visit-requests": { visitStatuses },
    "./vendor-marketplace": { vendorMarketplaceReady: () => Boolean(readiness.vendors) },
  };
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    process: { env: { VISIT_REQUESTS_ENABLED: visitsEnabled ? "true" : "" } },
    console: { error() {} },
    require(name) {
      assert.ok(Object.hasOwn(modules, name), `unexpected module ${name}`);
      return modules[name];
    },
  });
  return { load: exports.getAdminDashboardStatsFromSupabase, queries };
}

test("dashboard counts use live property and enquiry statuses and mark gated sources unavailable", async () => {
  const dashboard = await loadDashboard({
    rows: {
      properties: ["approved", "Pending", "Pending Approval", "rejected", "archived"].map((status, index) => ({ id: `p-${index}`, status })),
      enquiries: ["New", "New", "Contacted", "Owner Confirmation", "Visit Scheduled", "Visit Completed", "Negotiation", "Deal Closed", "Lost"].map((status, index) => ({ id: `e-${index}`, status })),
    },
  });

  const stats = await dashboard.load();
  assert.deepEqual(JSON.parse(JSON.stringify(stats.properties)), {
    state: "available",
    metrics: { totalProperties: 5, pendingProperties: 2, approvedProperties: 1, rejectedProperties: 1 },
  });
  assert.deepEqual(JSON.parse(JSON.stringify(stats.enquiries)), {
    state: "available",
    metrics: { totalEnquiries: 9, newEnquiries: 2, inProgressEnquiries: 5, dealClosedEnquiries: 1 },
  });
  for (const section of [stats.visits, stats.serviceRequests, stats.vendors, stats.requirements, stats.submissions]) {
    assert.equal(section.state, "unavailable");
    assert.match(section.message, /disabled|unavailable/i);
  }
  assert.deepEqual(dashboard.queries.map((query) => query.table).sort(), ["enquiries", "properties"]);
});

test("dashboard counts visit statuses and today's visits when the existing gate is enabled", async () => {
  const dashboard = await loadDashboard({
    visitsEnabled: true,
    rows: {
      properties: [],
      enquiries: [],
      visit_requests: [
        { id: "v-1", status: "pending", visit_date: "2026-11-14" },
        { id: "v-2", status: "confirmed", visit_date: "2026-11-14" },
        { id: "v-3", status: "rescheduled", visit_date: "2026-11-13" },
        { id: "v-4", status: "completed", visit_date: "2026-11-14" },
        { id: "v-5", status: "cancelled", visit_date: "2026-11-14" },
      ],
    },
  });

  const stats = await dashboard.load();
  assert.deepEqual(JSON.parse(JSON.stringify(stats.visits)), {
    state: "available",
    metrics: {
      totalVisits: 5,
      pendingVisits: 1,
      confirmedVisits: 1,
      completedVisits: 1,
      cancelledVisits: 1,
      todaysVisits: 3,
    },
  });
});

test("dashboard counts service, vendor, requirement and submission statuses from their configured tables", async () => {
  const dashboard = await loadDashboard({
    readiness: { services: true, vendors: true, requirements: true },
    submissionsEnabled: true,
    rows: {
      properties: [],
      enquiries: [],
      home_service_enquiries: ["pending", "pending", "contacted", "completed", "cancelled"].map((status, index) => ({ id: `s-${index}`, status })),
      service_vendor_applications: ["pending", "approved", "rejected", "approved"].map((status, index) => ({ id: `a-${index}`, status })),
      service_vendors: [{ id: "v-1" }, { id: "v-2" }],
      property_requirements: ["New", "Contacted", "Closed"].map((status, index) => ({ id: `r-${index}`, status })),
      loan_requirements: ["New", "Contacted", "Documents Pending", "Under Process", "Approved", "Rejected", "Closed"].map((status, index) => ({ id: `l-${index}`, status })),
      property_submissions: ["pending", "approved", "rejected"].map((status, index) => ({ id: `p-${index}`, status })),
    },
  });

  const stats = await dashboard.load();
  assert.deepEqual(JSON.parse(JSON.stringify(stats.serviceRequests)), {
    state: "available",
    metrics: { totalRequests: 5, pendingRequests: 2, inProgressRequests: 1, completedRequests: 1 },
  });
  assert.deepEqual(JSON.parse(JSON.stringify(stats.vendors)), {
    state: "available",
    metrics: { totalVendors: 2, pendingVendors: 1, approvedVendors: 2, rejectedVendors: 1 },
  });
  assert.deepEqual(JSON.parse(JSON.stringify(stats.requirements)), {
    state: "available",
    metrics: { totalRequirements: 10, newRequirements: 2, pendingRequirements: 6 },
  });
  assert.deepEqual(JSON.parse(JSON.stringify(stats.submissions)), {
    state: "available",
    metrics: { totalSubmissions: 3, pendingSubmissions: 1, approvedSubmissions: 1, rejectedSubmissions: 1 },
  });
});

test("dashboard surfaces a table query failure instead of reporting zero", async () => {
  const dashboard = await loadDashboard({ failTable: "properties" });

  const stats = await dashboard.load();
  assert.equal(stats.properties.state, "error");
  assert.match(stats.properties.message, /could not be loaded/i);
  assert.equal(stats.enquiries.state, "available");
});
