import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as marketplace from "../app/lib/vendor-marketplace.ts";

const source = await readFile(new URL("../app/home-services/vendor-actions.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const id = "11aa1111-1111-4111-8111-111111111111";

function application() {
  const form = new FormData();
  for (const [key, value] of Object.entries({ category_ids: JSON.stringify([id]), business_name: "Business", public_name: "Provider", contact_person: "Contact", mobile: "9876543210", email: "", services: "Repairs", description: "Repairs", city: "Pune", locality: "Area", address: "Address", commission_terms: "", applicant_id: "forged", status: "approved" })) form.set(key, value);
  return form;
}
function enquiry() {
  const form = new FormData();
  for (const [key, value] of Object.entries({ vendor_id: id, customer_name: "Customer", mobile: "9876543210", locality: "Wakad", full_address: "Wakad, Pune", message: "Help", contact_consent: "on", customer_id: "forged", status: "completed" })) form.set(key, value);
  return form;
}
function actions({ ready = true, user = { id: "verified" }, error = null } = {}) {
  const calls = [];
  const exports = {};
  vm.runInNewContext(code, { exports, console: { error() {} }, require(name) {
    if (name === "../lib/vendor-marketplace") return { ...marketplace, vendorMarketplaceReady: () => ready };
    if (name === "../lib/supabase-server") return { createSupabaseServerClient: async () => ({
      auth: { getUser: async () => ({ data: { user }, error: null }) },
      from(table) { return { insert: async (payload) => { calls.push({ table, payload }); return { error }; } }; },
      rpc: async (name, args) => { calls.push({ name, args }); return { data: error ? null : [id], error }; },
    }) };
    throw new Error(`Unexpected dependency ${name}`);
  } });
  return { ...exports, calls };
}

test("vendor application validates categories, contact information and bounds", () => {
  assert.equal(marketplace.validateVendorApplication(application()).business_name, "Business");
  assert.deepEqual(marketplace.validateVendorApplication(application()).category_ids, [id]);
  for (const [key, value] of [["category_ids", "forged"], ["mobile", "123"], ["email", "bad"], ["address", " "], ["services", "x".repeat(501)]]) {
    const form = application(); form.set(key, value);
    assert.throws(() => marketplace.validateVendorApplication(form));
  }
});

test("guard and authentication stop both vendor writes", async () => {
  for (const options of [{ ready: false }, { user: null }]) {
    const service = actions(options);
    assert.equal((await service.applyAsVendor({}, application())).status, "error");
    assert.equal((await service.enquireVendor({}, enquiry())).status, "error");
    assert.equal(service.calls.length, 0);
  }
});

test("writes omit forged identity and status; database errors never return success", async () => {
  const service = actions();
  assert.equal((await service.applyAsVendor({}, application())).status, "success");
  assert.equal((await service.enquireVendor({}, enquiry())).status, "success");
  const submission = service.calls.find((call) => call.name === "submit_service_vendor_applications");
  assert.deepEqual(submission.args.p_category_ids, [id]);
  assert.equal(Object.hasOwn(submission.args.p_application, "user_id"), false);
  assert.equal(Object.hasOwn(submission.args.p_application, "status"), false);
  const enquiryWrite = service.calls.find((call) => call.name === "submit_vendor_enquiry");
  assert.equal(enquiryWrite.args.p_customer_name, "Customer");
  assert.equal(enquiryWrite.args.p_mobile, "9876543210");
  assert.equal(enquiryWrite.args.p_contact_consent, true);
  assert.equal(Object.hasOwn(enquiryWrite.args, "p_customer_id"), false);
  for (const error of [{ code: "23505" }, { code: "42501" }]) {
    const failing = actions({ error });
    assert.equal((await failing.applyAsVendor({}, application())).status, "error");
    assert.equal((await failing.enquireVendor({}, enquiry())).status, "error");
  }
});

test("proposal isolates private data and restricts review and publication", async () => {
  const sql = await readFile(new URL("../supabase/migrations/0018_vendor_marketplace_proposal.sql", import.meta.url), "utf8");
  const publicTable = sql.match(/create table public\.service_vendors \(([\s\S]*?)\n\);/)[1];
  for (const field of ["contact_person", "mobile", "email", "address", "commission_terms"]) assert.doesNotMatch(publicTable, new RegExp(`\\b${field}\\b`));
  assert.match(sql, /applicant_id = auth\.uid\(\) or public\.is_admin\(\)/);
  assert.match(sql, /customer_id = auth\.uid\(\) or public\.is_admin\(\)/);
  assert.match(sql, /active and exists \(select 1 from public\.service_categories/);
  assert.match(sql, /auth\.uid\(\) is null or public\.is_admin\(\) is not true/);
  assert.match(sql, /for update;/);
  assert.match(sql, /insert into public\.service_vendor_reviews/);
  assert.doesNotMatch(sql, /grant (?:insert|update|delete).*on public\.service_vendors to authenticated/i);
});

test("marketplace is enabled after database schema, RLS and admin review verification", () => {
  assert.equal(marketplace.vendorMarketplaceReady(), true);
});

test("admin review requires authorization and reports database errors", async () => {
  const file = await readFile(new URL("../app/admin/services/vendors/actions.ts", import.meta.url), "utf8");
  const script = ts.transpileModule(file, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  for (const [ready, admin, error, expected, count] of [[false, true, null, "error", 0], [true, false, null, "error", 0], [true, true, { code: "42501" }, "error", 1], [true, true, null, "success", 1]]) {
    const calls = [];
    const exports = {};
    vm.runInNewContext(script, { exports, console: { error() {} }, require(name) {
      if (name === "next/cache") return { revalidatePath() {} };
      if (name === "../../../lib/vendor-marketplace") return { ...marketplace, vendorMarketplaceReady: () => ready };
      if (name === "../../../lib/supabase-server") return { requireAdmin: async () => {
        if (!admin) throw new Error("Forbidden");
        return { supabase: { rpc: async (name, args) => { calls.push({ name, args }); return { error }; } } };
      } };
      throw new Error(`Unexpected dependency ${name}`);
    } });
    const data = new FormData();
    data.set("id", id); data.set("action", "approve"); data.set("notes", "Checked");
    assert.equal((await exports.manageMarketplace({}, data)).status, expected);
    assert.equal(calls.length, count);
    if (count) assert.equal(calls[0].name, "admin_review_service_vendor_application");
  }
});

test("unsupported legacy provider-edit and enquiry-followup actions are rejected", async () => {
  const file = await readFile(new URL("../app/admin/services/vendors/actions.ts", import.meta.url), "utf8");
  const script = ts.transpileModule(file, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  for (const [admin, error, expected] of [[false, null, "error"], [true, { code: "42501" }, "error"], [true, null, "error"]]) {
    const calls = [];
    const exports = {};
    vm.runInNewContext(script, { exports, console: { error() {} }, require(name) {
      if (name === "next/cache") return { revalidatePath() {} };
      if (name === "../../../lib/vendor-marketplace") return { ...marketplace, vendorMarketplaceReady: () => true };
      if (name === "../../../lib/supabase-server") return { requireAdmin: async () => {
        if (!admin) throw new Error("Forbidden");
        return { supabase: { rpc: async (name, args) => { calls.push({ name, args }); return { error }; } } };
      } };
      throw new Error(`Unexpected dependency ${name}`);
    } });
    const edit = application(); edit.set("id", id); edit.set("action", "edit-vendor");
    const followup = new FormData(); followup.set("id", id); followup.set("action", "update-enquiry"); followup.set("status", "contacted"); followup.set("remarks", "Call back");
    assert.equal((await exports.manageMarketplace({}, edit)).status, expected);
    assert.equal((await exports.manageMarketplace({}, followup)).status, expected);
    assert.deepEqual(calls.map((call) => call.name), []);
  }
});

test("category removal requires admin, confirms deletion and preserves referenced records", async () => {
  const file = await readFile(new URL("../app/admin/services/vendors/actions.ts", import.meta.url), "utf8");
  const script = ts.transpileModule(file, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  for (const [admin, data, error, expected, message] of [
    [false, null, null, "error", /authorization/],
    [true, null, { code: "23503" }, "error", /Deactivate/],
    [true, null, null, "error", /not removed/],
    [true, { id }, null, "success", /Saved/],
  ]) {
    const calls = [];
    const exports = {};
    vm.runInNewContext(script, { exports, console: { error() {} }, require(name) {
      if (name === "next/cache") return { revalidatePath() {} };
      if (name === "../../../lib/vendor-marketplace") return { ...marketplace, vendorMarketplaceReady: () => true };
      if (name === "../../../lib/supabase-server") return { requireAdmin: async () => {
        if (!admin) throw new Error("Forbidden");
        return { supabase: { from(table) { return { delete() {
          calls.push(table);
          return { eq() { return { select() { return { maybeSingle: async () => ({ data, error }) }; } }; } };
        } }; } } };
      } };
      throw new Error(`Unexpected dependency ${name}`);
    } });
    const form = new FormData(); form.set("id", id); form.set("action", "remove-category");
    const result = await exports.manageMarketplace({}, form);
    assert.equal(result.status, expected);
    assert.match(result.message, message);
    assert.equal(calls.length, admin ? 1 : 0);
  }
});


test("new enquiry form requires contact consent and complete address details", () => {
  const form = enquiry();
  assert.equal(marketplace.validateVendorEnquiry(form).contact_consent, true);
  for (const [key, value] of [["contact_consent", "off"], ["locality", " "], ["full_address", " "], ["mobile", "bad"]]) {
    const invalid = enquiry(); invalid.set(key, value);
    assert.throws(() => marketplace.validateVendorEnquiry(invalid));
  }
});

test("lead unlock migration stores personal contact privately and masks public enquiry data", async () => {
  const sql = await readFile(new URL("../supabase/migrations/20261116121500_secure_vendor_lead_unlock_and_category_pricing.sql", import.meta.url), "utf8");
  assert.match(sql, /private\.vendor_enquiry_contacts/);
  assert.match(sql, /get_unlocked_vendor_lead_contact/);
  assert.match(sql, /admin_list_vendor_lead_contacts/);
  assert.match(sql, /set customer_name = 'Locked lead'/);
  assert.match(sql, /lead_unlock_price/);
});


test("new enquiry form requires contact consent and complete address details", () => {
  const form = enquiry();
  assert.equal(marketplace.validateVendorEnquiry(form).contact_consent, true);
  for (const [key, value] of [["contact_consent", "off"], ["locality", " "], ["full_address", " "], ["mobile", "bad"]]) {
    const invalid = enquiry(); invalid.set(key, value);
    assert.throws(() => marketplace.validateVendorEnquiry(invalid));
  }
});

test("lead unlock migration stores personal contact privately and masks public enquiry data", async () => {
  const sql = await readFile(new URL("../supabase/migrations/20261116121500_secure_vendor_lead_unlock_and_category_pricing.sql", import.meta.url), "utf8");
  assert.match(sql, /private\\.vendor_enquiry_contacts/);
  assert.match(sql, /get_unlocked_vendor_lead_contact/);
  assert.match(sql, /admin_list_vendor_lead_contacts/);
  assert.match(sql, /set customer_name = 'Locked lead'/);
  assert.match(sql, /lead_unlock_price/);
});
