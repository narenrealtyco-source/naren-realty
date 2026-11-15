import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("generated validator matches form definitions and proposal removes its write policies", async () => {
  execFileSync(process.execPath, ["scripts/generate-submission-validator.mjs", "--check"], { cwd: new URL("..", import.meta.url), stdio: "pipe" });
  const migration = await readFile(new URL("../supabase/migrations/0013_submission_details_proposal.sql", import.meta.url), "utf8");
  assert.match(migration, /drop policy "Customers insert own pending submissions"/);
  assert.match(migration, /drop policy "Customers upload private submission photos"/);
  assert.match(migration, /drop policy "Customers remove unsubmitted private photos"/);
  assert.match(migration, /user_id = v_actor and status = 'rejected'/);
  assert.doesNotMatch(migration, /set[^;]*photo_paths\s*=/s);
});

test("lifecycle proposal restricts service RPCs and excludes referenced photos from cleanup", async () => {
  const sql = await readFile(new URL("../supabase/migrations/0014_private_submission_lifecycle_proposal.sql", import.meta.url), "utf8");
  assert.match(sql, /for update skip locked/);
  assert.match(sql, /s\.photo_paths && array/);
  assert.match(sql, /v_attempt\.state = 'committed'/);
  assert.match(sql, /v_attempt\.state <> 'staging'/);
  assert.match(sql, /revoke all on function public\.commit_private_submission[\s\S]*from public, anon, authenticated/);
  assert.match(sql, /grant execute on function public\.commit_private_submission[\s\S]*to service_role/);
});

test("publication proposal locks and publishes complete approved data without exposing the private bucket", async () => {
  const sql = await readFile(new URL("../supabase/migrations/0016_submission_publication_proposal.sql", import.meta.url), "utf8");
  assert.match(sql, /where id = p_submission_id for update/);
  assert.match(sql, /role = 'admin'/);
  assert.match(sql, /id = 'private-property-submissions' and public = false/);
  assert.match(sql, /'address', v_submission.address, 'description', v_submission.description,\s*'details', v_submission.details/);
  assert.match(sql, /published_property_id = v_property_id/);
  assert.match(sql, /p_decision is distinct from 'rejected'/);
  assert.doesNotMatch(sql, /update storage\.buckets/);
});

test("wizard proposal keeps owner contact private and protects customer drafts", async () => {
  const sql = await readFile(new URL("../supabase/migrations/0020_property_submission_wizard_proposal.sql", import.meta.url), "utf8");
  assert.match(sql, /property_submission_owner_details_valid/);
  assert.match(sql, /add column owner_details jsonb/);
  assert.match(sql, /create table public\.property_submission_drafts/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /user_id = \(select auth\.uid\(\)\)/);
  assert.match(sql, /property_submission_owner_details_valid\(p_payload->'ownerDetails'\)/);
  assert.match(sql, /owner_details = p_owner_details/);
  assert.match(sql, /resubmit_property_submission_v3/);
  const publication = await readFile(new URL("../supabase/migrations/0016_submission_publication_proposal.sql", import.meta.url), "utf8");
  assert.doesNotMatch(publication, /owner_details|ownerDetails/);
});
