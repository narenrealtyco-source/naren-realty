import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import sharp from "sharp";
import { createHash } from "node:crypto";
import * as validation from "../app/lib/property-submission-validation.ts";
import * as propertyDefinitions from "../app/lib/properties.ts";
import * as ownerValidation from "../app/lib/property-submission-owner-validation.ts";

async function load(path, modules) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require(name) { assert.ok(Object.hasOwn(modules, name), name); return modules[name]; }, FormData, Date, Error, TextEncoder });
  return exports;
}
const definitions = await load("../app/list-property/additional-fields.ts", { "../lib/properties": propertyDefinitions });
const detailsModule = await load("../app/lib/submission-details.ts", { "../list-property/additional-fields": definitions, "./property-submission-validation": validation });
const lifecycle = await load("../app/lib/private-submission-lifecycle.ts", {});
const imageBytes = await sharp({ create: { width: 2, height: 2, channels: 3, background: "red" } }).jpeg().toBuffer();

const source = await readFile(new URL("../app/list-property/actions.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function harness({ user = { id: "verified-user" }, role = "customer", enabled = true, uploadReady = true, uploadError = false, insertError = false, setupError = false } = {}) {
  const calls = { uploads: [], inserts: [], removals: [], revalidated: [], rpc: [] };
  const bucket = {
    async upload(path) {
      calls.uploads.push(path);
      return { error: uploadError ? { name: "StorageError" } : null };
    },
    async remove(paths) {
      calls.removals.push([...paths]);
      return { error: null };
    },
  };
  const client = {
    auth: { async getUser() { return { data: { user }, error: null }; } },
    async rpc(name, args) {
      calls.rpc.push({ name, args });
      return { error: insertError ? { code: "P0001" } : null };
    },
    storage: { from(name) { assert.equal(name, "private-property-submissions"); return bucket; } },
    from(table) {
      if (table === "profiles") {
        return { select() { return { eq(_column, id) {
          assert.equal(id, user.id);
          return { async maybeSingle() { return { data: { role }, error: null }; } };
        } }; } };
      }
      assert.equal(table, "property_submissions");
      return {
        select() { return { async limit() { return { error: setupError ? { code: typeof setupError === "string" ? setupError : "42P01" } : null }; } }; },
        async insert(row) {
          calls.inserts.push(row);
          return { error: insertError ? { code: "unknown" } : null };
        },
      };
    },
  };
  const modules = {
    "node:crypto": { createHash },
    "sharp": { default: sharp },
    "next/cache": { revalidatePath: (path) => calls.revalidated.push(path) },
    "../lib/supabase-server": { createSupabaseServerClient: async () => client },
    "../lib/property-submission-config": { propertySubmissionsEnabled: () => enabled, propertySubmissionUploadsReady: () => uploadReady },
    "../lib/property-submission-validation": validation,
    "../lib/submission-details": detailsModule,
    "../lib/property-submission-owner-validation": ownerValidation,
    "../lib/private-submission-lifecycle": lifecycle,
    "../lib/private-submission-server": {
      createPrivateSubmissionClient: () => ({}),
      manifestFingerprint: () => "fingerprint",
      lifecycleStore: (_client, payload) => ({
        async begin() { return "staging"; },
        async upload(photo) { calls.uploads.push(photo.path); if (uploadError) throw new Error("Upload failed"); },
        async commit(attempt) { calls.inserts.push({ ...payload, id: attempt.id }); if (insertError) throw new Error("Commit failed"); },
      }),
    },
  };
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    require(name) {
      assert.ok(Object.hasOwn(modules, name), `unexpected module ${name}`);
      return modules[name];
    },
    File, Uint8Array, Error,
    console: { error() {} },
  });
  return { submit: exports.submitProperty, resubmit: exports.resubmitProperty, calls };
}

function form() {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    title: "Apartment", category: "Rental", locality: "Wakad",
    address: "Example street", price: "25000", area: "650",
    description: "Two bedrooms", user_id: "attacker", owner_id: "attacker",
    status: "approved", reviewed_by: "attacker", published_property_id: "attacker",
  })) data.set(key, value);
  data.set("details", JSON.stringify({ version: 1, values: { common_landmark: "Park", Rental_balconies: "2", PG_sharing_0_rent: "9000", PG_sharing_1_units: "4" }, amenities: { Rental: [propertyDefinitions.FLAT_AMENITIES[0], propertyDefinitions.FLAT_AMENITIES[1]] }, facilities: [definitions.pgFacilities[0]] }));
  data.set("owner_details", JSON.stringify({ version: 1, fullName: "Property Owner", mobile: "9876543210", email: "owner@example.com", relationship: "Owner", authorizationDetails: "" }));
  data.set("owner_confirmed", "on");
  data.set("listing_declaration", "on");
  data.set("submission_id", "11aa1111-1111-4111-8111-111111111111");
  data.append("photos", new File([imageBytes], "photo.jpg", { type: "image/jpeg" }));
  return data;
}

test("verified user determines photo path and forged ownership and review fields are not inserted", async () => {
  const { submit, calls } = harness();
  const result = await submit({ status: "idle", message: "" }, form());
  assert.equal(result.status, "success");
  assert.match(calls.uploads[0], /^verified-user\/11aa1111-1111-4111-8111-111111111111\//);
  const row = calls.inserts[0];
  for (const key of ["user_id", "owner_id", "status", "reviewed_by", "published_property_id"]) {
    assert.equal(Object.hasOwn(row, key), false);
  }
  assert.equal(row.id, "11aa1111-1111-4111-8111-111111111111");
  assert.equal(row.ownerDetails.fullName, "Property Owner");
  assert.deepEqual(calls.revalidated, ["/list-property"]);
});

test("missing authentication or disabled setup cannot upload or save", async () => {
  for (const options of [{ user: null }, { role: "owner" }, { enabled: false }, { uploadReady: false }, { setupError: true }, { setupError: "42703" }]) {
    const { submit, calls } = harness(options);
    const result = await submit({ status: "idle", message: "" }, form());
    assert.equal(result.status, "error");
    assert.equal(calls.uploads.length, 0);
    assert.equal(calls.inserts.length, 0);
  }
});

test("resubmission fails closed when private upload readiness is not verified", async () => {
  const { resubmit, calls } = harness({ enabled: true, uploadReady: false });
  const result = await resubmit({ status: "idle", message: "" }, form());
  assert.equal(result.status, "error");
  assert.match(result.message, /setup is verified/);
  assert.equal(calls.rpc.length, 0);
});

test("invalid submission and photo are rejected before upload", async () => {
  for (const change of [
    (data) => data.set("price", "-1"),
    (data) => data.set("photos", new File(["invalid"], "photo.jpg", { type: "image/jpeg" })),
  ]) {
    const { submit, calls } = harness();
    const data = form();
    change(data);
    assert.equal((await submit({ status: "idle", message: "" }, data)).status, "error");
    assert.equal(calls.uploads.length, 0);
    assert.equal(calls.inserts.length, 0);
  }
});

test("unsupported additional details and amenities are never silently dropped", async () => {
  for (const [key, value] of [["extra_common_purpose", "New Property"], ["extra_amenity", "Swimming Pool"], ["extra_Rental_balconies", "0"]]) {
    const { submit, calls } = harness();
    const data = form();
    data.set(key, value);
    const result = await submit({ status: "idle", message: "" }, data);
    assert.equal(result.status, "error");
    assert.match(result.message, /Unsupported property details/);
    assert.equal(calls.uploads.length, 0);
    assert.equal(calls.inserts.length, 0);
  }
});

test("failed upload is retained for safe reconciliation and does not commit", async () => {
  const { submit, calls } = harness({ uploadError: true });
  assert.equal((await submit({ status: "idle", message: "" }, form())).status, "error");
  assert.equal(calls.inserts.length, 0);
  assert.equal(calls.removals.length, 0);
});

test("uncertain insert outcome does not delete potentially committed photos", async () => {
  const { submit, calls } = harness({ insertError: true });
  const result = await submit({ status: "idle", message: "" }, form());
  assert.equal(result.status, "error");
  assert.match(result.message, /check your submissions/);
  assert.equal(calls.inserts.length, 1);
  assert.equal(calls.removals.length, 0);
});

test("resubmission ignores forged ownership and review fields", async () => {
  const { resubmit, calls } = harness();
  const data = form();
  data.set("submission_id", "11aa1111-1111-4111-8111-111111111111");
  assert.equal((await resubmit({ status: "idle", message: "" }, data)).status, "success");
  assert.equal(calls.rpc[0].name, "resubmit_property_submission_v3");
  assert.equal(JSON.stringify(calls.rpc[0].args.p_details), JSON.stringify(JSON.parse(data.get("details"))));
  assert.equal(calls.rpc[0].args.p_owner_details.fullName, "Property Owner");
  for (const key of ["user_id", "owner_id", "status", "reviewed_by", "published_property_id"]) {
    assert.equal(Object.hasOwn(calls.rpc[0].args, key), false);
    assert.equal(Object.hasOwn(calls.rpc[0].args, `p_${key}`), false);
  }
});

test("details and amenities are retained in submission and resubmission payloads", async () => {
  const { submit, resubmit, calls } = harness();
  const data = form();
  assert.equal((await submit({ status: "idle", message: "" }, data)).status, "success");
  const saved = JSON.parse(JSON.stringify(calls.inserts[0].details));
  assert.deepEqual(saved, JSON.parse(data.get("details")));
  data.set("submission_id", "11aa1111-1111-4111-8111-111111111111");
  data.set("details", JSON.stringify(saved));
  assert.equal((await resubmit({ status: "idle", message: "" }, data)).status, "success");
  assert.deepEqual(JSON.parse(JSON.stringify(calls.rpc[0].args.p_details)), saved);
});

test("corrupt image with a valid signature and unsupported details are rejected", async () => {
  const badPhoto = form();
  badPhoto.set("photos", new File([Uint8Array.from([0xff, 0xd8, 0xff])], "bad.jpg", { type: "image/jpeg" }));
  const badDetails = form();
  badDetails.set("details", JSON.stringify({ version: 1, values: { unrecognized: "value" }, amenities: {}, facilities: [] }));
  for (const data of [badPhoto, badDetails]) {
    const { submit, calls } = harness();
    assert.equal((await submit({ status: "idle", message: "" }, data)).status, "error");
    assert.equal(calls.uploads.length, 0);
    assert.equal(calls.inserts.length, 0);
  }
});

test("invalid private owner contact or missing declarations are rejected before photo upload", async () => {
  for (const mutate of [
    (data) => data.set("owner_details", JSON.stringify({ version: 1, fullName: "Owner", mobile: "123", email: "bad", relationship: "Owner", authorizationDetails: "" })),
    (data) => data.delete("owner_confirmed"),
    (data) => data.delete("listing_declaration"),
  ]) {
    const data = form();
    mutate(data);
    const { submit, calls } = harness();
    assert.equal((await submit({ status: "idle", message: "" }, data)).status, "error");
    assert.equal(calls.uploads.length, 0);
    assert.equal(calls.inserts.length, 0);
  }
});

test("all form detail keys, options and amenities pass the shared validator", () => {
  const values = {};
  const fields = (scope, list) => {
    for (const field of list) {
      values[`${scope}_${field.key}`] = field.options?.[0]
        ?? (field.type === "date" ? "2026-11-13" : field.type === "time" ? "14:30" : field.type === "number" ? "2" : "test");
    }
  };
  fields("common", definitions.commonFields);
  for (const category of validation.SUBMISSION_CATEGORIES) fields(category, definitions.additionalFields(category));
  fields("PG", definitions.sharingFields);
  const amenities = Object.fromEntries(validation.SUBMISSION_CATEGORIES.map((category) => [category, [...definitions.amenitiesForCategory(category)]]));
  const input = { version: 1, values, amenities, facilities: [...definitions.pgFacilities] };
  assert.deepEqual(JSON.parse(JSON.stringify(detailsModule.validateSubmissionDetails(input))), input);
  for (const category of validation.SUBMISSION_CATEGORIES) {
    for (const field of definitions.additionalFields(category)) {
      for (const option of field.options ?? []) {
        assert.doesNotThrow(() => detailsModule.validateSubmissionDetails({ ...input, values: { ...values, [`${category}_${field.key}`]: option } }));
      }
    }
  }
  for (const field of definitions.commonFields) {
    for (const option of field.options ?? []) {
      assert.doesNotThrow(() => detailsModule.validateSubmissionDetails({ ...input, values: { ...values, [`common_${field.key}`]: option } }));
    }
  }
  assert.throws(() => detailsModule.validateSubmissionDetails({ ...input, values: { common_landmark: "bad\0text" } }));
});

test("invalid detail keys, types, options, dates, duplicates and over-limit values are rejected", () => {
  const base = { version: 1, values: {}, amenities: {}, facilities: [] };
  const invalid = [
    { ...base, values: { unknown: "x" } },
    { ...base, values: { PG_rooms: 3 } },
    { ...base, values: { PG_rooms: "1e2" } },
    { ...base, values: { PG_rooms: "1000000000000.000001" } },
    { ...base, values: { common_available_from: "2025-02-29" } },
    { ...base, values: { Airbnb_check_in: "24:01" } },
    { ...base, values: { PG_gender: "invalid" } },
    { ...base, amenities: { PG: ["Lift", "Lift"] } },
    { ...base, amenities: { PG: ["not an amenity"] } },
    { ...base, amenities: { Other: [] } },
    { ...base, facilities: ["Food Included", "Food Included"] },
    { ...base, facilities: ["unsupported"] },
    { ...base, extra: "unsupported" },
  ];
  for (const item of invalid) assert.throws(() => detailsModule.validateSubmissionDetails(item));
});

test("resubmission without a session or on database ownership failure is rejected", async () => {
  for (const options of [{ user: null }, { enabled: false }, { insertError: true }]) {
    const { resubmit } = harness(options);
    const data = form();
    data.set("submission_id", "11aa1111-1111-4111-8111-111111111111");
    assert.equal((await resubmit({ status: "idle", message: "" }, data)).status, "error");
  }
});
