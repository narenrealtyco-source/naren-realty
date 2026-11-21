import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL("../supabase/migrations/0021_referral_registration_proposal.sql", import.meta.url);

test("referral registration migration is disabled by default", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /insert into public\.referral_settings\(singleton, enabled\) values \(true, false\)/i);
  assert.match(sql, /create trigger capture_signup_referral\s+after insert on auth\.users/i);
  assert.match(sql, /create trigger profiles_create_customer_referral_code\s+after insert on public\.profiles/i);
  assert.match(sql, /revoke all on public\.referral_settings, public\.customer_referral_codes, public\.customer_referrals/i);
});

test("referral registration migration does not pretend to implement payouts", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /does NOT implement[\s\S]*bank details, or payouts/i);
  assert.doesNotMatch(sql, /create table public\.(?:customer_bank_details|reward_payouts|referral_rewards)/i);
});
