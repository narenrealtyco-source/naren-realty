import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as jsxRuntime from "react/jsx-runtime";
import ts from "typescript";
import * as validation from "../app/lib/property-submission-validation.ts";
import * as propertyDefinitions from "../app/lib/properties.ts";
import * as ownerValidation from "../app/lib/property-submission-owner-validation.ts";

async function load(path, modules, logger = console) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports, console: logger, TextEncoder,
    require(name) {
      if (name === "react/jsx-runtime") return jsxRuntime;
      if (name === "react") return React;
      assert.ok(Object.hasOwn(modules, name), `unexpected module ${name}`);
      return modules[name];
    },
  });
  return exports;
}

const extras = await load("../app/list-property/additional-fields.ts", {
  "../lib/properties": propertyDefinitions,
});
const additional = await load("../app/list-property/AdditionalDetails.tsx", { "./additional-fields": extras });
const details = await load("../app/lib/submission-details.ts", {
  "../list-property/additional-fields": extras,
  "./property-submission-validation": validation,
});
const ownerDetailsView = await load("../app/list-property/OwnerDetailsView.tsx", {
  "../lib/property-submission-owner-validation": ownerValidation,
});
const form = await load("../app/list-property/SubmissionForm.tsx", {
  "next/image": { default: ({ src, alt, ...props }) => React.createElement("img", { src, alt, ...props }) },
  "./actions": { submitProperty: async () => ({ status: "error", message: "mock" }) },
  "./additional-fields": extras,
  "../lib/property-submission-validation": validation,
  "./AdditionalDetails": additional,
  "./SavedDetails": { default: () => React.createElement("div", null, "Saved details") },
  "../lib/submission-details": details,
  "../lib/property-submission-owner-validation": ownerValidation,
  "./draft-actions": {
    loadPropertySubmissionDraft: async () => ({ status: "empty", message: "" }),
    savePropertySubmissionDraft: async () => ({ status: "saved", message: "Draft saved." }),
    deletePropertySubmissionDraft: async () => ({ status: "deleted", message: "" }),
  },
});
const resubmit = await load("../app/list-property/ResubmitForm.tsx", {
  "./actions": { resubmitProperty: async () => ({ status: "error", message: "mock" }) },
  "../lib/property-submission-validation": validation,
  "../lib/submission-details": details,
  "./AdditionalDetails": additional,
  "../lib/property-submission-owner-validation": ownerValidation,
});

test("rejected form displays details but disables resubmission when setup is unverified", () => {
  const submission = {
    id: "submission", title: "Test", category: "Rental", locality: "Wakad",
    address: "Street", price: 100, area: 50, description: "Description",
    details: { version: 1, values: { Rental_deposit: "5000" }, amenities: { Rental: ["Lift"] }, facilities: [] },
  };
  const html = renderToStaticMarkup(React.createElement(resubmit.default, { submission, available: false }));
  assert.match(html, /setup is verified/);
  assert.match(html, /disabled=""[^>]*>Resubmit for review/);
  assert.match(html, /5000/);
  assert.match(html, /Lift/);
  assert.match(html, /min-w-0 w-full max-w-full/);
  assert.match(html, /min-h-11 w-full/);
  assert.match(html, /<summary class="min-h-11 cursor-pointer py-3 font-semibold"/);
});

async function renderPage({ user = { id: "customer-id" }, authError = null, enabled = false, uploadReady = false, lookupError = null, legacyError = null, rows = [], useRealResubmit = false } = {}) {
  const calls = [];
  const queries = [];
  const logs = [];
  const supabase = {
    auth: { async getUser() { calls.push("getUser"); return { data: { user }, error: authError }; } },
    from(table) {
      if (table === "profiles") return { select() { return { eq() { return { async maybeSingle() { return { data: { role: "customer" }, error: null }; } }; } }; } };
      assert.equal(table, "property_submissions");
      return { select(columns) { queries.push(columns); return { eq(column, value) {
        assert.equal(column, "user_id");
        assert.equal(value, user.id);
        return { async order(column, options) {
          assert.equal(column, "created_at");
          assert.equal(options.ascending, false);
          const error = columns.includes("owner_details") ? lookupError : legacyError;
          return { data: error ? null : rows.filter((row) => row.user_id === value), error };
        } };
      } }; } };
    },
  };
  const page = await load("../app/list-property/page.tsx", {
    "next/link": { default: ({ href, children, ...props }) => React.createElement("a", { href, ...props }, children) },
    "next/server": { connection: async () => { calls.push("connection"); } },
    "../lib/supabase-server": { createSupabaseServerClient: async () => { calls.push("createClient"); return supabase; } },
    "../lib/property-submission-config": { propertySubmissionsEnabled: () => enabled, propertySubmissionUploadsReady: () => uploadReady },
    "./SubmissionForm": form,
    "./ResubmitForm": useRealResubmit ? resubmit : { default: () => React.createElement("div", null, "Resubmit") },
    "./OwnerDetailsView": ownerDetailsView,
    "../lib/submission-details": details,
    "./additional-fields": extras,
  }, { error(...args) { logs.push(args); } });
  return { html: renderToStaticMarkup(await page.default()), calls, queries, logs };
}

test("request boundary precedes Supabase and logged-out users see login or signup", async () => {
  const { html, calls } = await renderPage({ user: null, authError: { name: "AuthSessionMissingError" } });
  assert.deepEqual(calls, ["connection", "createClient", "getUser"]);
  assert.match(html, /Sign in to list a property/);
  assert.match(html, /Customer login or signup/);
  assert.match(html, /href="\/account"/);
});

test("authentication errors show a visible error instead of the form", async () => {
  const { html } = await renderPage({ user: null, authError: { name: "AuthRetryableFetchError" } });
  assert.match(html, /role="alert"/);
  assert.match(html, /session could not be verified/);
});

test("a logged-in customer sees the complete form even while setup is disabled", async () => {
  const { html } = await renderPage();
  assert.match(html, /Submission progress/);
  assert.match(html, /Step 1 of 7/);
  assert.match(html, /Flat Rental/);
  assert.match(html, /Flat Resale/);
  assert.match(html, /PG \/ Hostel/);
  assert.match(html, /Airbnb \/ Short Stay/);
  assert.match(html, /awaiting private database setup/);
  assert.match(html, /Save draft/);
  assert.match(html, /disabled=""/);
});

test("amenities and category-specific fields follow the original Owner form", () => {
  assert.deepEqual([...extras.amenitiesForCategory("Rental")], propertyDefinitions.FLAT_AMENITIES);
  assert.deepEqual([...extras.amenitiesForCategory("Resale")], propertyDefinitions.FLAT_AMENITIES);
  assert.deepEqual([...extras.amenitiesForCategory("PG")], propertyDefinitions.PG_AMENITIES);
  assert.deepEqual([...extras.amenitiesForCategory("Airbnb")], propertyDefinitions.AIRBNB_AMENITIES);
  for (const [category, expected] of [["Rental", "balconies"], ["PG", "rooms"], ["Airbnb", "guests"]]) {
    assert.ok(extras.additionalFields(category).some((field) => field.key === expected));
  }
  assert.equal(extras.sharingFields.length, 21);
});

test("facility form conditionally reveals Wi-Fi and parking follow-up fields", () => {
  const renderFacilities = (values, amenities = []) => renderToStaticMarkup(React.createElement(additional.default, {
    category: "Rental",
    section: "facilities",
    details: { version: 1, values, amenities: { Rental: amenities }, facilities: [] },
    onChange() {},
  }));
  const withoutSelections = renderFacilities({});
  assert.match(withoutSelections, /Furnishing/);
  assert.match(withoutSelections, /Wi-Fi available/);
  assert.doesNotMatch(withoutSelections, /Wi-Fi charges/);
  assert.doesNotMatch(withoutSelections, /Monthly Wi-Fi charges/);
  assert.doesNotMatch(withoutSelections, /Parking slots/);
  const selected = renderFacilities({
    Rental_wifi_available: "Yes",
    Rental_wifi_billing: "Extra Charges",
  }, ["Covered Parking"]);
  assert.match(selected, /Wi-Fi charges/);
  assert.match(selected, /Monthly Wi-Fi charges/);
  assert.match(selected, /Wi-Fi coverage/);
  assert.match(selected, /Parking slots/);
  assert.match(selected, /Parking charges/);
});

test("configured customer form remains disabled and load failures are explicit", async () => {
  const ready = await renderPage({ enabled: true });
  assert.match(ready.html, /My submissions/);
  assert.match(ready.html, /flex-wrap items-center justify-between/);
  assert.match(ready.html, /grid min-w-0 gap-6 lg:grid-cols-2/);
  assert.match(ready.html, /min-w-0 rounded-2xl/);
  assert.match(ready.html, /sticky bottom-0/);
  assert.match(ready.html, /private photo handling is ready/);
  assert.match(ready.html, /disabled=""/);
  const failed = await renderPage({ enabled: true, lookupError: { code: "denied" } });
  assert.match(failed.html, /Your submissions could not be loaded/);
  assert.match(failed.html, /disabled=""/);
});

test("missing owner_details reads only the customer's existing submissions and disables writes", async () => {
  const { html, queries, logs } = await renderPage({
    enabled: true,
    uploadReady: true,
    useRealResubmit: true,
    lookupError: { code: "42703", message: "column property_submissions.owner_details does not exist", details: "Schema unavailable" },
    rows: [
      { id: "own", user_id: "customer-id", title: "My property", category: "Rental", locality: "Wakad",
        address: "Street", price: 100, area: 50, description: "Description", status: "rejected",
        details: { version: 1, values: {}, amenities: {}, facilities: [] } },
      { id: "other", user_id: "other-customer", title: "Another customer's property" },
    ],
  });
  assert.equal(queries.length, 2);
  assert.match(queries[0], /owner_details/);
  assert.doesNotMatch(queries[1], /owner_details/);
  assert.match(html, /My property/);
  assert.doesNotMatch(html, /Another customer/);
  assert.match(html, /private owner details database setup/);
  assert.match(html, /disabled=""[^>]*>Save draft/);
  assert.match(html, /disabled=""[^>]*>Resubmit for review/);
  assert.match(html, /Owner contact details were not captured/);
  assert.equal(logs[0][1].code, "42703");
  assert.equal(logs[0][1].message, "column property_submissions.owner_details does not exist");
  assert.equal(logs[0][1].details, "Schema unavailable");
});

test("owner_details missing-column message variants trigger the same safe fallback", async () => {
  for (const message of [
    'column "owner_details" does not exist',
    'column "property_submissions"."owner_details" does not exist',
    'column public.property_submissions.owner_details does not exist',
    'ERROR: column "owner_details" is missing',
  ]) {
    const result = await renderPage({ enabled: true, uploadReady: true, lookupError: { code: "42703", message } });
    assert.equal(result.queries.length, 2, message);
    assert.match(result.html, /private owner details database setup/);
  }
});

test("legacy lookup permission failures remain visible and other errors never trigger fallback", async () => {
  const denied = await renderPage({
    enabled: true,
    lookupError: { code: "42703", message: "column property_submissions.owner_details does not exist" },
    legacyError: { code: "42501", message: "permission denied for table property_submissions", details: "Contact owner@example.com" },
  });
  assert.match(denied.html, /Your submissions could not be loaded/);
  assert.equal(denied.logs[1][1].code, "42501");
  assert.equal(denied.logs[1][1].details, "Contact [redacted]");
  for (const lookupError of [
    { code: "42703", message: "column property_submissions.details does not exist" },
    { code: "42703", message: "column property_submissions.owner_details_backup does not exist" },
    { code: "42703", message: "column other.owner_details does not exist" },
    { code: "42703", message: 'column "owner_details".missing does not exist' },
    { code: "42703", message: 'column "details" does not exist; check owner_details' },
    { code: "42703", message: 'column "details" does not exist; hint: column owner_details' },
    { code: "42501", message: "column property_submissions.owner_details does not exist" },
  ]) {
    const other = await renderPage({ enabled: true, lookupError });
    assert.equal(other.queries.length, 1, lookupError.message);
    assert.match(other.html, /awaiting database setup|could not be loaded/);
  }
});

test("lookup diagnostics truncate long fields and show fallback values", async () => {
  const long = await renderPage({ enabled: true, lookupError: { code: "42501", message: "x".repeat(400), details: "y".repeat(400) } });
  assert.equal(long.logs[0][1].message, "x".repeat(300));
  assert.equal(long.logs[0][1].details, "y".repeat(300));
  const missing = await renderPage({ enabled: true, lookupError: {} });
  assert.equal(missing.logs[0][1].code, "unknown");
  assert.equal(missing.logs[0][1].message, "Unavailable");
  assert.equal(missing.logs[0][1].details, "Unavailable");
});

test("admin queue renders all category details, amenities, facilities and private photo links", async () => {
  const savedDetails = await load("../app/list-property/SavedDetails.tsx", {
    "./additional-fields": extras,
    "../lib/property-submission-validation": validation,
    "../lib/submission-details": details,
  });
  const row = {
    id: "submission", user_id: "customer", title: "Test", category: "PG", locality: "Wakad",
    address: "Street", price: 100, area: 50, description: "Description", photo_paths: ["first", "second"],
    status: "pending", rejection_feedback: null, reviewed_by: null, reviewed_at: null, published_property_id: null, created_at: "today",
    details: { version: 1, values: { common_landmark: "Park", Rental_balconies: "3", Rental_parking_slots: "1", PG_sharing_0_rent: "9000", Airbnb_rules: "No pets" },
      amenities: { PG: ["Wi-Fi"], Rental: ["Lift"], Airbnb: ["Kitchen"] }, facilities: ["Food Included"] },
  };
  let projection = "";
  const client = { from() { return { select(columns) { projection = columns; return {
    order() { return this; }, async range() { return { data: [row], count: 1, error: null }; },
  }; } }; } };
  const page = await load("../app/admin/submissions/page.tsx", {
    "next/link": { default: ({ href, children, ...props }) => React.createElement("a", { href, ...props }, children) },
    "next/server": { connection: async () => {} },
    "../../lib/property-submission-config": { propertySubmissionsEnabled: () => true },
    "../../lib/supabase-server": { requireAdmin: async () => ({ supabase: client }) },
    "./ReviewForms": { default: () => React.createElement("div", null, "Review") },
    "../../list-property/SavedDetails": savedDetails,
    "../../list-property/OwnerDetailsView": ownerDetailsView,
    "./CleanupButton": { default: () => React.createElement("div", null, "Reconcile") },
  });
  const html = renderToStaticMarkup(await page.default());
  assert.match(projection, /(?:^|,)details(?:,|$)/);
  assert.match(projection, /(?:^|,)owner_details(?:,|$)/);
  for (const text of ["Park", "9000", "No pets", "Wi-Fi", "Lift", "Kitchen", "Food Included", "View private photo 1", "View private photo 2"]) {
    assert.ok(html.includes(text), text);
  }
});

test("owner retrieval displays own saved details and amenities but excludes other rows", async () => {
  const rows = [
    { id: "own", user_id: "customer-id", title: "My property", category: "Rental", locality: "Wakad", address: "Private address", price: 25000, area: 650, description: "My description", status: "pending", rejection_feedback: null,
      details: { version: 1, values: { Rental_balconies: "2", common_landmark: "Park" }, amenities: { Rental: [propertyDefinitions.FLAT_AMENITIES[0]] }, facilities: [] } },
    { id: "other", user_id: "other-customer", title: "Another customer's property", details: {} },
  ];
  const { html } = await renderPage({ enabled: true, rows });
  assert.match(html, /My property/);
  assert.match(html, /Park/);
  assert.ok(html.includes(propertyDefinitions.FLAT_AMENITIES[0]));
  assert.doesNotMatch(html, /Another customer/);
});
