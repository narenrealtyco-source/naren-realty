import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migrationUrl = new URL("../supabase/migrations/20261115050419_customer_referral_dashboard.sql", import.meta.url);
const pageUrl = new URL("../app/account/referrals/page.tsx", import.meta.url);
const accountUrl = new URL("../app/account/page.tsx", import.meta.url);

test("referral dashboard uses separate activity-eligible tenant and owner codes", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /create_my_referral_code\('tenant'\)/i);
  assert.match(sql, /create_my_referral_code\('owner'\)/i);
  assert.match(sql, /profile_activity_roles/i);
  assert.match(sql, /profile_capabilities/i);
  assert.match(sql, /status\s*=\s*'approved'/i);
  assert.match(sql, /referral_attributions/i);
  assert.match(sql, /grant execute on function public\.customer_referral_dashboard\(\) to authenticated/i);
});

test("referral page uses category-specific codes and signup query parameter", async () => {
  const page = await readFile(pageUrl, "utf8");
  assert.match(page, /dashboard\.tenantCode/);
  assert.match(page, /dashboard\.ownerCode/);
  assert.match(page, /searchParams\.set\("category", category\)/);
  assert.doesNotMatch(page, /NEXT_PUBLIC_REFERRALS_ENABLED/);
});

test("signup accepts the actual 10-character referral code format", async () => {
  const account = await readFile(accountUrl, "utf8");
  assert.match(account, /\^\[0-9A-F\]\{10\}\$/);
  assert.match(account, /params\.get\("category"\)/);
});


test("signup trigger rejects a category that does not match the referral code", async () => {
  const sql = await readFile(new URL("../supabase/migrations/20261115050600_validate_referral_category_on_signup.sql", import.meta.url), "utf8");
  assert.match(sql, /v_category <> v_referral\.referrer_type/i);
  assert.match(sql, /Referral category does not match the referral code/i);
  assert.match(sql, /revoke all on function public\.capture_signup_referral\(\)/i);
});
