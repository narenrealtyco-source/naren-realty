import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import sharp from "sharp";
import * as definitions from "../app/lib/properties.ts";
import * as validation from "../app/lib/property-submission-validation.ts";
import * as marketing from "../app/lib/property-marketing.ts";

async function load(path, modules) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, File, Uint8Array, TextEncoder, Error, console, require(name) {
    assert.ok(Object.hasOwn(modules, name), name);
    return modules[name];
  } });
  return exports;
}
const extras = await load("../app/list-property/additional-fields.ts", { "../lib/properties": definitions });
const details = await load("../app/lib/submission-details.ts", { "../list-property/additional-fields": extras, "./property-submission-validation": validation });
const directValidation = await load("../app/admin/properties/direct-validation.ts", {
  "../../lib/property-submission-validation": validation, "../../lib/submission-details": details, "../../lib/property-marketing": marketing,
});
const id = "11aa1111-1111-4111-8111-111111111111";
const image = await sharp({ create: { width: 3, height: 3, channels: 3, background: "blue" } }).png().toBuffer();

function form() {
  const data = new FormData();
  for (const [key, value] of Object.entries({ title: "Test home", category: "Rental", locality: "Wakad", address: "Street", price: "9000", area: "500", description: "A home", owner_id: "attacker", status: "approved" })) data.set(key, value);
  data.set("details", JSON.stringify({ version: 1, values: { Rental_balconies: "2" }, amenities: { Rental: ["Lift"] }, facilities: [] }));
  data.append("photos", new File([image], "home.png", { type: "image/png" }));
  return data;
}

async function harness({ denied = false, uploadFailed = false } = {}) {
  const calls = { uploads: [], revalidated: [] };
  let row;
  const client = {
    storage: { from(name) { assert.equal(name, "property-photos"); return {
      async upload(path) { calls.uploads.push(path); return { error: uploadFailed ? { name: "denied" } : null }; },
      async remove() { return { error: null }; },
    }; } },
    from(name) {
      assert.equal(name, "properties");
      return {
        insert(payload) { row = payload; return { select() { return { async maybeSingle() { return { data: { id: row.id }, error: null }; } }; } }; },
        update(payload) { return { eq(_key, value) { assert.equal(value, id); Object.assign(row, payload); return { select() { return { async maybeSingle() { return { data: { id }, error: null }; } }; } }; } }; },
        select() { return { eq() { return { async maybeSingle() { return { data: row, error: null }; } }; } }; },
      };
    },
  };
  const actions = await load("../app/admin/properties/direct-actions.ts", {
    "node:crypto": { randomUUID: () => id }, "sharp": { default: sharp },
    "next/cache": { revalidatePath: (path) => calls.revalidated.push(path) },
    "../../lib/supabase-server": { requireAdmin: async () => { if (denied) throw new Error("Denied"); return { supabase: client, user: { id: "verified-admin" } }; } },
    "../../lib/property-submission-validation": validation, "./direct-validation": directValidation,
  });
  return { ...actions, calls, client, getRow: () => row };
}

test("Admin creates a pending property with public fields and later edits it", async () => {
  const h = await harness();
  const result = await h.saveDirectProperty({}, form());
  assert.equal(result.status, "success");
  assert.equal(h.getRow().owner_id, "verified-admin");
  assert.equal(h.getRow().status, "pending");
  assert.equal(h.getRow().details.publicListing.details.amenities.Rental[0], "Lift");
  assert.match(h.calls.uploads[0], /^verified-admin\//);
  const edit = form(); edit.set("property_id", id); edit.set("title", "Updated"); edit.delete("photos");
  assert.equal((await h.saveDirectProperty({}, edit)).status, "success");
  assert.equal(h.getRow().title, "Updated");
  assert.equal(h.getRow().photos.length, 1);
});

test("Admin availability and rental deposit persist through creation, edit and public mapping", async () => {
  const h = await harness();
  const data = form();
  data.set("availability_confirmation", "date");
  data.set("details", JSON.stringify({ version: 1, values: { common_available_from: "2026-12-01", Rental_deposit: "12000" }, amenities: {}, facilities: [] }));
  assert.equal((await h.saveDirectProperty({}, data)).status, "success");
  const edit = form(); edit.set("property_id", id); edit.delete("photos");
  edit.set("availability_confirmation", "date"); edit.set("details", data.get("details"));
  assert.equal((await h.saveDirectProperty({}, edit)).status, "success");
  const row = h.getRow();
  const mapper = await load("../app/lib/public-property-mapping.ts", { "./properties": definitions, "./submission-details": details });
  const result = mapper.mapPublicProperty({ ...row, status: "approved", public_listing: row.details.publicListing }, (path) => path);
  assert.equal(result.availabilityConfirmation, "date");
  assert.equal(result.availableFrom, "2026-12-01");
  assert.equal(result.publicListingDetails.values.Rental_deposit, "12000");
  const invalid = form(); invalid.set("availability_confirmation", "date");
  assert.equal((await h.saveDirectProperty({}, invalid)).status, "error");
  invalid.set("availability_confirmation", "forged");
  assert.equal((await h.saveDirectProperty({}, invalid)).status, "error");
  invalid.set("availability_confirmation", "immediate");
  invalid.set("details", JSON.stringify({ version: 1, values: { common_available_from: "2999-12-01" }, amenities: {}, facilities: [] }));
  const conflict = await h.saveDirectProperty({}, invalid);
  assert.equal(conflict.status, "error");
  assert.match(conflict.message, /future available-from date/);
});

test("non-admin, invalid photos and Storage permission failures do not save", async () => {
  for (const opts of [{ denied: true }, { uploadFailed: true }]) {
    const h = await harness(opts);
    assert.equal((await h.saveDirectProperty({}, form())).status, "error");
    assert.equal(h.getRow(), undefined);
  }
  const h = await harness();
  const data = form(); data.set("photos", new File(["bad"], "bad.png", { type: "image/png" }));
  assert.equal((await h.saveDirectProperty({}, data)).status, "error");
  assert.equal(h.calls.uploads.length, 0);
});

test("all four categories and multiple photos can be saved", async () => {
  for (const category of definitions.PROPERTY_CATEGORIES) {
    const h = await harness();
    const data = form();
    data.set("category", category);
    data.append("photos", new File([image], "second.png", { type: "image/png" }));
    assert.equal((await h.saveDirectProperty({}, data)).status, "success");
    assert.equal(h.getRow().category, category);
    assert.equal(h.getRow().photos.length, 2);
  }
});

test("Admin status action publishes then unpublishes, while unauthenticated calls fail", async () => {
  let status = "pending";
  let allowed = true;
  const paths = [];
  const actions = await load("../app/admin/properties/actions.ts", {
    "next/cache": { revalidatePath: (path) => paths.push(path) },
    "../../lib/admin-supabase-data": { getAdminPropertiesFromSupabase: async () => [] },
    "../../lib/supabase-server": { requireAdmin: async () => {
      if (!allowed) throw new Error("Denied");
      return { supabase: { from: () => ({ update: (payload) => ({ eq: () => ({ select: () => ({ async maybeSingle() { status = payload.status; return { data: { id }, error: null }; } }) }) }) }) } };
    } },
  });

  await actions.approveAdminProperty(id);
  assert.equal(status, "approved");
  await actions.rejectAdminProperty(id);
  assert.equal(status, "rejected");
  assert.ok(paths.includes(`/properties/${id}`));
  allowed = false;
  await assert.rejects(actions.approveAdminProperty(id));
  assert.equal(status, "rejected");
});

test("saved details and photos appear in public mapping only after publish", async () => {
  const h = await harness();
  await h.saveDirectProperty({}, form());
  const mapper = await load("../app/lib/public-property-mapping.ts", {
    "./properties": definitions,
    "./submission-details": details,
  });
  const property = h.getRow();
  const projection = () => ({ ...property, carpet_area: property.details.carpetArea, public_listing: property.details.publicListing });
  assert.throws(() => mapper.mapPublicProperty(projection(), (path) => path));
  const actions = await load("../app/admin/properties/actions.ts", {
    "next/cache": { revalidatePath() {} },
    "../../lib/admin-supabase-data": { getAdminPropertiesFromSupabase: async () => [] },
    "../../lib/supabase-server": { requireAdmin: async () => ({ supabase: h.client }) },
  });
  await actions.approveAdminProperty(id);
  const listing = mapper.mapPublicProperty(projection(), (path) => `public:${path}`);
  assert.equal(listing.publicListingDetails.amenities.Rental[0], "Lift");
  assert.equal(listing.description, "A home");
  assert.equal(listing.photos.length, 1);
  await actions.rejectAdminProperty(id);
  assert.throws(() => mapper.mapPublicProperty(projection(), (path) => path));
});
