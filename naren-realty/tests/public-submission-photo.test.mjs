import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const propertyId = "11aa1111-1111-4111-8111-111111111111";
const owner = "22bb2222-2222-4222-8222-222222222222";
const submissionId = "33cc3333-3333-4333-8333-333333333333";
const photo = "44dd4444-4444-4444-8444-444444444444";
const path = `${owner}/${submissionId}/${photo}`;

async function route(options = {}) {
  const calls = { downloads: 0, privateClients: 0 };
  const property = { id: propertyId, owner_id: owner, status: "approved", photos: [`private-submission/${path}`], ...options.property };
  const submission = { user_id: owner, status: "approved", published_property_id: propertyId, photo_paths: [path], ...options.submission };
  const chain = (data) => ({ select() { return this; }, eq() { return this; }, async maybeSingle() { return { data, error: null }; } });
  const source = await readFile(new URL("../app/properties/[id]/photos/[index]/route.ts", import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, Error, Response, console: { error() {} }, require(name) {
    if (name === "../../../../lib/supabase-server") return { createSupabaseServerClient: async () => ({ from: () => chain(options.noProperty ? null : property) }) };
    if (name === "../../../../lib/private-submission-server") return { createPrivateSubmissionClient: () => {
      calls.privateClients++;
      return { from: () => chain(submission), storage: { from: () => ({ async download() {
        calls.downloads++;
        return { data: new Blob(["image"], { type: options.mime ?? "image/png" }), error: null };
      } }) } };
    } };
    throw new Error(`Unexpected module ${name}`);
  } });
  return { GET: exports.GET, calls };
}

async function request(GET, id = propertyId, index = "0") {
  return GET(new Request("http://localhost"), { params: Promise.resolve({ id, index }) });
}

test("only an approved linked submission photo can be served", async () => {
  for (const options of [
    { noProperty: true }, { property: { status: "pending" } },
    { property: { photos: [`private-submission/${owner}/${submissionId}/..`] } },
    { submission: { status: "pending" } }, { submission: { published_property_id: owner } },
    { submission: { user_id: propertyId } }, { submission: { photo_paths: [] } },
  ]) {
    const { GET, calls } = await route(options);
    const response = await request(GET);
    assert.equal(response.status, 404);
    assert.equal(calls.downloads, 0);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
  }
});

test("approved photos are non-cacheable and unsafe content types are rejected", async () => {
  for (const mime of ["image/png", "text/html"]) {
    const { GET, calls } = await route({ mime });
    const response = await request(GET);
    assert.equal(response.status, mime === "image/png" ? 200 : 415);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal(calls.downloads, 1);
  }
});

test("invalid requests never instantiate the private storage client", async () => {
  const { GET, calls } = await route();
  assert.equal((await request(GET, "invalid", "0")).status, 404);
  assert.equal((await request(GET, propertyId, "5")).status, 404);
  assert.equal(calls.privateClients, 0);
});
