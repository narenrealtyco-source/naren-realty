import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = await readFile(new URL("../app/lib/public-property-mapping.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const exports = {};
vm.runInNewContext(code, { exports, Error, Array, Number, require: (name) => name === "./submission-details" ? { validateSubmissionDetails: (value) => value } : ({ PROPERTY_CATEGORIES: ["Rental", "Resale", "PG", "Airbnb"] }) });
const row = { id: "id", owner_id: "owner", title: "Home", category: "Rental", locality: "Wakad",
  price: 10, photos: ["path"], status: "approved", details: { owner_phone: "private" },
  description: "private email", carpet_area: "650" };

test("mapping excludes unapproved private fields", () => {
  const value = exports.mapPublicProperty(row, (path) => `public:${path}`);
  assert.equal(value.area, 650);
  assert.equal(value.description, "");
  assert.equal(JSON.stringify(value).includes("private"), false);
  assert.deepEqual([...value.photos], ["public:path"]);
});

test("admin public fields and amenities are mapped without arbitrary fields", () => {
  const details = { version: 1, values: { Rental_balconies: "2" }, amenities: { Rental: ["Lift"] }, facilities: [] };
  const value = exports.mapPublicProperty({ ...row, public_listing: { address: "Street", description: "Spacious", details, private_phone: "secret" } }, (path) => path);
  assert.equal(value.description, "Spacious");
  assert.equal(value.address, "Street");
  assert.equal(value.publicListingDetails.amenities.Rental[0], "Lift");
  assert.equal(JSON.stringify(value).includes("secret"), false);
});

test("mapping rejects pending rows and external photo URLs", () => {
  assert.throws(() => exports.mapPublicProperty({ ...row, status: "pending" }, () => ""));
  assert.throws(() => exports.mapPublicProperty({ ...row, photos: ["https://example.invalid/photo"] }, () => ""));
});

test("private submission photo references use the controlled listing photo route", () => {
  const value = exports.mapPublicProperty({ ...row, photos: ["private-submission/owner/submission/photo", "property-photos/existing"] }, (path) => `public:${path}`);
  assert.deepEqual([...value.photos], ["/properties/id/photos/0", "public:existing"]);
});
