import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const adminPageUrl = new URL("../app/admin/referrals/page.tsx", import.meta.url);
const adminActionsUrl = new URL("../app/admin/referrals/actions.ts", import.meta.url);
const dashboardUrl = new URL("../app/admin/page.tsx", import.meta.url);
const migrationUrl = new URL("../supabase/migrations/20261118090000_referral_reward_eligibility_enforcement.sql", import.meta.url);
const hardeningUrl = new URL("../supabase/migrations/20261118090100_referral_reward_status_and_attribution_hardening.sql", import.meta.url);
const customerPageUrl = new URL("../app/account/referrals/page.tsx", import.meta.url);

test("referral Admin workflow only offers rewards for NAREN REALTY sourced deals", async () => {
  const page = await readFile(adminPageUrl, "utf8");
  const actions = await readFile(adminActionsUrl, "utf8");
  assert.match(page, /NAREN REALTY platform/);
  assert.match(page, /Direct owner \/ customer/);
  assert.match(page, /Other broker \/ agent/);
  assert.match(page, /Open market \/ external channel/);
  assert.match(actions, /Direct, market and other-broker transactions cannot be marked eligible/);
  assert.match(actions, /requireAdmin\(\)/);
});

test("Admin referral review is linked from the dashboard", async () => {
  const dashboard = await readFile(dashboardUrl, "utf8");
  assert.match(dashboard, /href: "\/admin\/referrals"/);
  assert.match(dashboard, /Open Referral Management/);
});

test("database blocks external deals and requires matching NAREN REALTY lead evidence", async () => {
  const migration = await readFile(migrationUrl, "utf8");
  const hardening = await readFile(hardeningUrl, "utf8");
  assert.match(migration, /deal_source is distinct from 'naren_realty'/i);
  assert.match(migration, /public\.enquiries/i);
  assert.match(migration, /public\.visit_requests/i);
  assert.match(migration, /public\.properties/i);
  assert.match(hardening, /created_at >=/i);
  assert.match(hardening, /old\.status='paid'/i);
  assert.match(hardening, /old\.status<>'eligible'/i);
});

test("customer referral screen discloses direct, market and other-broker exclusions", async () => {
  const page = await readFile(customerPageUrl, "utf8");
  assert.match(page, /Direct owner, market or other-broker deals do not qualify/);
  assert.match(page, /same property do not qualify/);
});
