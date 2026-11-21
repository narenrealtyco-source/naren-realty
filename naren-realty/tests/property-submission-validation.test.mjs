import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_SUBMISSION_PHOTO_BYTES,
  validatePropertySubmission,
  validateSubmissionPhoto,
  validateSubmissionPhotoCount,
} from "../app/lib/property-submission-validation.ts";
import { validatePropertyOwnerDetails } from "../app/lib/property-submission-owner-validation.ts";

const valid = {
  title: "  Apartment  ",
  category: "Rental",
  locality: "Wakad",
  address: "Example street",
  price: 25000,
  area: 650,
  description: "Two bedrooms",
};

test("valid submissions are normalized", () => {
  assert.equal(validatePropertySubmission(valid).title, "Apartment");
});

test("ownership, status and arbitrary fields are rejected", () => {
  for (const field of ["user_id", "owner_id", "status", "reviewed_by", "published_property_id", "extra"]) {
    assert.throws(() => validatePropertySubmission({ ...valid, [field]: "forged" }), /unsupported fields/);
  }
});

test("category, numbers and required text are validated", () => {
  assert.throws(() => validatePropertySubmission({ ...valid, category: "Broker" }), /category/);
  for (const price of [0, -1, Infinity, NaN, "25000"]) {
    assert.throws(() => validatePropertySubmission({ ...valid, price }), /Price/);
  }
  assert.throws(() => validatePropertySubmission({ ...valid, area: 0 }), /Area/);
  assert.throws(() => validatePropertySubmission({ ...valid, description: " " }), /Description/);
  assert.throws(() => validatePropertySubmission({ ...valid, address: " " }), /Full address/);
  assert.throws(() => validatePropertySubmission({ ...valid, title: "x".repeat(121) }), /Title/);
});

test("photo count is limited", () => {
  for (const count of [1, 5]) validateSubmissionPhotoCount(count);
  for (const count of [0, 6, 1.5, NaN]) assert.throws(() => validateSubmissionPhotoCount(count));
});

test("photo type, signature and size are checked", () => {
  const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0x00]);
  const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const webp = Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
  validateSubmissionPhoto("image/jpeg", jpeg);
  validateSubmissionPhoto("image/png", png);
  validateSubmissionPhoto("image/webp", webp);
  assert.throws(() => validateSubmissionPhoto("image/png", jpeg));
  assert.throws(() => validateSubmissionPhoto("image/svg+xml", jpeg));
  assert.throws(() => validateSubmissionPhoto("image/jpeg", new Uint8Array()));
  assert.throws(() => validateSubmissionPhoto("image/jpeg", new Uint8Array(MAX_SUBMISSION_PHOTO_BYTES + 1)));
});

test("private owner contact details are normalized and authorization is required when the contact is not the owner", () => {
  const owner = validatePropertyOwnerDetails({
    version: 1,
    fullName: " Property Owner ",
    mobile: "+91 98765-43210",
    email: "OWNER@EXAMPLE.COM",
    relationship: "Owner",
    authorizationDetails: "",
  });
  assert.equal(owner.fullName, "Property Owner");
  assert.equal(owner.mobile, "+919876543210");
  assert.equal(owner.email, "owner@example.com");
  assert.throws(() => validatePropertyOwnerDetails({
    ...owner,
    relationship: "Authorized Representative",
    authorizationDetails: "",
  }), /authority to list/);
  assert.throws(() => validatePropertyOwnerDetails({ ...owner, email: "not-an-email" }), /valid email/);
  assert.throws(() => validatePropertyOwnerDetails({ ...owner, unrelated: "forged" }), /invalid/);
});
