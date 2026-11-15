import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const customers = readFileSync(new URL("../app/lib/customers.ts", import.meta.url), "utf8");
const account = readFileSync(new URL("../app/account/page.tsx", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/0022_referral_registration_v2_review_only.sql", import.meta.url), "utf8");

test("customer signup accepts and sends referral attribution in Auth user metadata", () => {
  assert.match(customers, /referralCode\?: string/);
  assert.match(customers, /referralCategory\?: "tenant" \| "owner"/);
  assert.match(customers, /referral_code:\s*input\.referralCode\.trim\(\)\.toUpperCase\(\)/);
  assert.match(customers, /referral_category:\s*input\.referralCategory/);
});

test("account signup reads a validated referral URL and forwards it", () => {
  assert.match(account, /params\.get\("ref"\)/);
  assert.match(account, /params\.get\("category"\)/);
  assert.match(account, /\^\[0-9A-F\]\{10\}\$/);
  assert.match(account, /referralCode,\s*referralCategory/);
});

test("review-only SQL records owner intent without assuming owner role exists at signup", () => {
  assert.match(migration, /v_category not in \('tenant','owner'\)/);
  assert.match(migration, /Owner signups first create a Customer profile/);
  assert.match(migration, /enabled boolean not null default false/);
  assert.doesNotMatch(migration, /v_effective_role/);
});
