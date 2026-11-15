import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as jsxRuntime from "react/jsx-runtime";
import * as marketing from "../app/lib/property-marketing.ts";

async function load(path, modules, enabled = true) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, console, process: { env: { VISIT_REQUESTS_ENABLED: enabled ? "true" : "" } }, require(name) {
    assert.ok(Object.hasOwn(modules, name), name);
    return modules[name];
  } });
  return exports;
}

const id = "11aa1111-1111-4111-8111-111111111111";
const visits = await load("../app/lib/visit-requests.ts", { "./property-marketing": marketing });
const tomorrow = marketing.indiaCalendarDate(new Date(Date.now() + 86400000));
function form() {
  const value = new FormData();
  for (const [key, entry] of Object.entries({ property_id: id, name: "Customer", mobile: "+919876543210", message: "Please call", date: tomorrow, time: "10:00", customer_id: "attacker", status: "confirmed" })) value.set(key, entry);
  return value;
}

async function customerAccountVisitsHarness(rows) {
  const source = await readFile(new URL("../app/account/page.tsx", import.meta.url), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const hookState = [];
  const effects = [];
  const queries = [];
  const removedListeners = [];
  const removedWindowListeners = [];
  let hookIndex = 0;
  let intervalCallback;
  let intervalCleared = false;
  const customer = { id: "44dd4444-4444-4444-8444-444444444444", fullName: "Customer", mobileNumber: "", email: "customer@example.com", createdAt: "2026-01-01" };
  hookState[0] = customer;
  hookState[1] = false;
  hookState[3] = "visits";
  hookState[16] = [];
  hookState[21] = [];
  hookState[22] = [];
  hookState[23] = [];
  hookState[24] = null;
  hookState[25] = false;
  hookState[26] = "";
  hookState[28] = [];
  hookState[29] = "";

  const supabase = {
    from(table) {
      const query = { table, filters: [], orders: [], columns: "" };
      queries.push(query);
      return {
        select(columns) { query.columns = columns; return this; },
        eq(...args) { query.filters.push(args); return this; },
        order(...args) { query.orders.push(args); return this; },
        range(...args) { query.range = args; return this; },
        async overrideTypes() { return { data: [...rows], count: rows.length, error: null }; },
      };
    },
  };
  const react = {
    useState(initial) {
      const index = hookIndex++;
      if (!(index in hookState)) hookState[index] = initial;
      return [hookState[index], (next) => {
        hookState[index] = typeof next === "function" ? next(hookState[index]) : next;
      }];
    },
    useEffect(effect) { effects.push(effect); },
  };
  const modules = {
    react,
    "react/jsx-runtime": jsxRuntime,
    "next/link": { default: ({ href, children, ...props }) => React.createElement("a", { href, ...props }, children) },
    "../components/PolicyConsentFields": { default: () => null },
    "../lib/enquiries": { getEnquiriesLocally: () => [], EnquiryRecord: {} },
    "../lib/policies": {
      acknowledgeBrokerage() {}, getMissingPolicies: () => [], getUserBrokerageAcknowledgements: () => [],
      recordPolicyAcceptances() {}, BrokerageAcknowledgement: {}, PolicyType: {},
    },
    "../lib/supabase-browser": { createSupabaseBrowserClient: () => supabase },
    "../lib/customers": {
      getCustomerFavorites: () => [], getCustomerSession: async () => customer, loginCustomer: async () => customer,
      logoutCustomer: async () => {}, registerCustomer: async () => ({ customer, requiresEmailConfirmation: false }),
      requestCustomerPasswordReset: async () => {}, removeCustomerFavorite() {}, updateCustomerProfile: async () => customer,
      CustomerAccount: {}, CustomerFavorite: {},
    },
  };
  const exports = {};
  const listeners = new Set();
  vm.runInNewContext(code, {
    exports,
    console,
    window: {
      setInterval(callback) { intervalCallback = callback; return 7; },
      clearInterval(id) { intervalCleared = id === 7; },
      addEventListener() {},
      removeEventListener(name, callback) { removedWindowListeners.push(`${name}:${callback.name}`); },
    },
    document: {
      visibilityState: "visible",
      addEventListener(name, callback) { listeners.add(`${name}:${callback.name}`); },
      removeEventListener(name, callback) { removedListeners.push(`${name}:${callback.name}`); },
    },
    require(name) {
      assert.ok(Object.hasOwn(modules, name), `unexpected module ${name}`);
      return modules[name];
    },
  });
  function render() {
    hookIndex = 0;
    effects.length = 0;
    return renderToStaticMarkup(exports.default());
  }
  return {
    customer, queries, listeners, removedListeners, removedWindowListeners,
    get intervalCallback() { return intervalCallback; },
    get intervalCleared() { return intervalCleared; },
    render,
    runVisitsEffect() { return effects[2](); },
    async settle() { await new Promise((resolve) => setTimeout(resolve, 0)); },
  };
}

test("customer dashboard includes a referral link alongside its existing navigation", async () => {
  const harness = await customerAccountVisitsHarness([]);
  const html = harness.render();
  assert.match(html, /My Profile/);
  assert.match(html, /My Visits/);
  assert.match(html, /href="\/account\/referrals"[^>]*>Refer &amp; Earn<\/a>/);
});

test("validates date, mobile, slot and property ID", () => {
  assert.equal(visits.validateVisitInput(form()).name, "Customer");
  for (const [key, value] of [["date", "2020-01-01"], ["date", "9999-12-31"], ["time", "03:00"], ["mobile", "123"], ["property_id", "not-an-id"]]) {
    const data = form(); data.set(key, value);
    assert.throws(() => visits.validateVisitInput(data));
  }
});

test("customer identity is server-derived and duplicate responses are explicit", async () => {
  let inserted;
  let user = { id: "verified" };
  let error = null;
  const client = { auth: { getUser: async () => ({ data: { user }, error: null }) }, from: () => ({ insert: async (value) => { inserted = value; return { error }; } }) };
  const { requestVisit } = await load("../app/properties/visit-actions.ts", {
    "../lib/supabase-server": { createSupabaseServerClient: async () => client }, "../lib/visit-requests": visits,
  });
  assert.equal((await requestVisit({}, form())).status, "success");
  assert.equal(inserted.customer_id, "verified");
  assert.equal(inserted.status, undefined);
  error = { code: "23505" };
  assert.match((await requestVisit({}, form())).message, /already have an active/);
  error = { code: "42501" };
  assert.equal((await requestVisit({}, form())).status, "error");
  user = null; inserted = undefined;
  assert.equal((await requestVisit({}, form())).status, "error");
  assert.equal(inserted, undefined);
});

test("disabled visit requests cannot write even with a direct action call", async () => {
  let called = false;
  const { requestVisit, visitRequestsReady } = await load("../app/properties/visit-actions.ts", {
    "../lib/supabase-server": { createSupabaseServerClient: async () => { called = true; throw new Error("unexpected"); } },
    "../lib/visit-requests": visits,
  }, false);
  assert.equal(await visitRequestsReady(), false);
  assert.equal((await requestVisit({}, form())).status, "error");
  assert.equal(called, false);
});

test("only verified admins can update status and rescheduling requires valid slots", async () => {
  let allowed = false, values, conditions;
  const client = { from: () => ({ update(value) { values = value; conditions = []; return { eq(key, val) { conditions.push([key, val]); return this; }, select() { return this; }, async maybeSingle() { return { data: { id }, error: null }; } }; } }) };
  const { updateVisit } = await load("../app/admin/visits/actions.ts", {
    "next/cache": { revalidatePath() {} },
    "../../lib/supabase-server": { requireAdmin: async () => { if (!allowed) throw new Error("forbidden"); return { supabase: client }; } },
    "../../lib/visit-requests": visits,
  });
  const data = form(); data.set("id", id); data.set("expected_status", "pending"); data.set("expected_date", marketing.indiaCalendarDate()); data.set("expected_time", "10:00:00"); data.set("status", "confirmed");
  assert.equal((await updateVisit({}, data)).status, "error");
  assert.equal(values, undefined);
  allowed = true;
  assert.equal((await updateVisit({}, data)).status, "success");
  assert.equal(values.status, "confirmed");
  assert.deepEqual(conditions, [["id", id], ["status", "pending"], ["visit_date", marketing.indiaCalendarDate()], ["visit_time", "10:00:00"]]);
  data.set("status", "rescheduled"); data.set("time", "03:00");
  assert.equal((await updateVisit({}, data)).status, "error");
  data.set("time", "11:00");
  assert.equal((await updateVisit({}, data)).status, "success");
  assert.equal(values.status, "rescheduled");
  assert.equal(values.visit_time, "11:00");
});

test("SQL proposal restricts writes and private reads and enforces active uniqueness", async () => {
  const sql = await readFile(new URL("../supabase/migrations/0015_visit_requests_proposal.sql", import.meta.url), "utf8");
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /customer_id = auth\.uid\(\)/i);
  assert.match(sql, /p\.role = 'admin'/i);
  assert.match(sql, /create unique index visit_requests_one_active_per_property/i);
  assert.match(sql, /grant update \(status, visit_date, visit_time\)/i);
  assert.match(sql, /status = 'pending'/i);
});

test("admin queue renders customer and property details; unauthorized access is denied", async () => {
  let allowed = true, queries = 0;
  const row = { id, customer_name: "Customer", mobile_number: "9876543210", message: "Call first", visit_date: tomorrow, visit_time: "10:00:00", status: "pending", created_at: "2026-01-01", properties: { id, title: "Test flat", locality: "Wakad", category: "Rental" } };
  const client = { from() { queries++; return { select() { return this; }, order() { return this; }, range() { return this; }, async overrideTypes() { return { data: [row], count: 1, error: null }; } }; } };
  const page = await load("../app/admin/visits/page.tsx", {
    "react/jsx-runtime": jsxRuntime,
    "next/link": { default: ({ href, children }) => React.createElement("a", { href }, children) },
    "next/server": { connection: async () => {} },
    "../../lib/supabase-server": { requireAdmin: async () => { if (!allowed) throw new Error("forbidden"); return { supabase: client }; } },
    "./VisitReviewForm": { default: () => React.createElement("div", null, "Review controls") },
  });
  const html = renderToStaticMarkup(await page.default());
  for (const text of ["Customer", "9876543210", "Test flat", "Wakad", tomorrow, "10:00", "Call first", "pending", "Review controls"]) assert.ok(html.includes(text), text);
  allowed = false;
  const denied = renderToStaticMarkup(await page.default());
  assert.match(denied, /Admin authorization is required/);
  assert.equal(queries, 1);
});

test("customer My Visits is scoped to the signed-in customer and refreshes admin changes", async () => {
  const rows = [
    { id, customer_id: "44dd4444-4444-4444-8444-444444444444", property_id: id, customer_name: "Customer", visit_date: "2026-11-20", visit_time: "10:00:00", status: "pending", created_at: "2026-11-01", properties: { title: "Pending Flat", locality: "Wakad", category: "Rental" } },
    { id: "77aa7777-7777-4777-8777-777777777777", customer_id: "44dd4444-4444-4444-8444-444444444444", property_id: "77aa7777-7777-4777-8777-777777777777", customer_name: "Customer", visit_date: "2026-11-21", visit_time: "11:00:00", status: "confirmed", created_at: "2026-11-02", properties: [{ title: "Confirmed Flat", locality: "Baner", category: "Resale" }] },
    { id: "88bb8888-8888-4888-8888-888888888888", customer_id: "44dd4444-4444-4444-8444-444444444444", property_id: "88bb8888-8888-4888-8888-888888888888", customer_name: "Customer", visit_date: "2026-11-22", visit_time: "12:00:00", status: "rescheduled", created_at: "2026-11-03", properties: null },
    { id: "55ee5555-5555-4555-8555-555555555555", customer_id: "44dd4444-4444-4444-8444-444444444444", property_id: id, customer_name: "Customer", visit_date: "2026-11-23", visit_time: "14:00:00", status: "completed", created_at: "2026-11-04", properties: { title: "Completed Flat", locality: "Pune", category: "Rental" } },
    { id: "66ff6666-6666-4666-8666-666666666666", customer_id: "44dd4444-4444-4444-8444-444444444444", property_id: id, customer_name: "Customer", visit_date: "2026-11-24", visit_time: "15:00:00", status: "cancelled", created_at: "2026-11-05", properties: { title: "Cancelled Flat", locality: "Pune", category: "PG" } },
  ];
  const harness = await customerAccountVisitsHarness(rows);
  harness.render();
  const cleanup = harness.runVisitsEffect();
  await harness.settle();
  const markup = harness.render();

  assert.equal(harness.queries[0].table, "visit_requests");
  assert.equal(JSON.stringify(harness.queries[0].filters), JSON.stringify([["customer_id", harness.customer.id]]));
  assert.equal(JSON.stringify(harness.queries[0].orders), JSON.stringify([["created_at", { ascending: false }], ["id", { ascending: false }]]));
  for (const [label, message] of [
    ["Pending", "Awaiting Admin confirmation."],
    ["Confirmed", "Visit confirmed by our team."],
    ["Rescheduled", "Visit schedule updated by our team."],
    ["Completed", "Visit marked completed."],
    ["Cancelled", "Visit request cancelled."],
  ]) {
    assert.ok(markup.includes(label), label);
    assert.ok(markup.includes(message), message);
  }
  assert.ok(markup.includes("My Visits (5)"));
  assert.ok(markup.includes("10:00 AM IST"));
  assert.ok(markup.includes("Property details unavailable"));
  assert.ok(markup.includes(`href="/properties/${id}"`));

  Object.assign(rows[2], { visit_date: "2026-12-03", visit_time: "15:00:00" });
  harness.intervalCallback();
  await harness.settle();
  const refreshedMarkup = harness.render();
  assert.ok(refreshedMarkup.includes("3 Dec 2026"));
  assert.ok(refreshedMarkup.includes("3:00 PM IST"));
  assert.ok(!refreshedMarkup.includes("22 Nov 2026"));
  assert.ok(!refreshedMarkup.includes("12:00 PM IST"));

  cleanup();
  assert.equal(harness.intervalCleared, true);
  assert.ok(harness.removedListeners.some((listener) => listener.startsWith("visibilitychange:")));
  assert.ok(harness.removedWindowListeners.some((listener) => listener.startsWith("focus:")));
});
