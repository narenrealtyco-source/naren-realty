import assert from "node:assert/strict";
import test from "node:test";
import { reconcileSubmissionPhotos, submitStagedAttempt } from "../app/lib/private-submission-lifecycle.ts";

const owner = "11111111-1111-4111-8111-111111111111";
const id = "22222222-2222-4222-8222-222222222222";
const photo = "33333333-3333-4333-8333-333333333333";
const attempt = { id, ownerId: owner, fingerprint: "a", photos: [{ path: `${owner}/${id}/${photo}`, type: "image/png", bytes: new Uint8Array([1]), digest: "hash" }] };

function harness() {
  let state;
  let reference;
  let uploadFailure = false;
  let commitResponseLost = false;
  let removeFailure = false;
  const objects = new Set();
  const store = {
    async begin(value) {
      if (reference && (reference.ownerId !== value.ownerId || reference.fingerprint !== value.fingerprint)) throw new Error("conflict");
      reference = value;
      state ??= "staging";
      return state;
    },
    async upload(value) {
      if (uploadFailure) throw new Error("upload interrupted");
      objects.add(value.path);
    },
    async commit() {
      if (state !== "staging") throw new Error("expired");
      state = "committed";
      if (commitResponseLost) throw new Error("lost response");
    },
  };
  const cleanup = {
    async claim() {
      if (state === "committed") return [];
      state = "cleaning";
      return [{ id, ownerId: owner, paths: [attempt.photos[0].path] }];
    },
    async remove(paths) {
      if (removeFailure) throw new Error("storage unavailable");
      for (const path of paths) objects.delete(path);
    },
    async finish() { state = "cleaned"; },
  };
  return { store, cleanup, objects, state: () => state,
    failUpload(value) { uploadFailure = value; }, loseCommit(value) { commitResponseLost = value; },
    failRemove(value) { removeFailure = value; } };
}

test("interrupted upload retries the same attempt and commits once", async () => {
  const h = harness();
  h.failUpload(true);
  await assert.rejects(submitStagedAttempt(h.store, attempt));
  assert.equal(h.state(), "staging");
  h.failUpload(false);
  await submitStagedAttempt(h.store, attempt);
  await submitStagedAttempt(h.store, attempt);
  assert.equal(h.state(), "committed");
  assert.equal(h.objects.size, 1);
});

test("a lost commit response retries without deleting committed photos", async () => {
  const h = harness();
  h.loseCommit(true);
  await assert.rejects(submitStagedAttempt(h.store, attempt));
  await submitStagedAttempt(h.store, attempt);
  assert.equal(await reconcileSubmissionPhotos(h.cleanup), 0);
  assert.equal(h.objects.size, 1);
});

test("a failed commit keeps staging files for a later retry", async () => {
  const h = harness();
  const store = { ...h.store, async commit() { throw new Error("database unavailable"); } };
  await assert.rejects(submitStagedAttempt(store, attempt));
  assert.equal(h.state(), "staging");
  assert.equal(h.objects.size, 1);
  await submitStagedAttempt(h.store, attempt);
  assert.equal(h.state(), "committed");
});

test("another owner or altered payload cannot reuse an attempt", async () => {
  const h = harness();
  await h.store.begin(attempt);
  await assert.rejects(submitStagedAttempt(h.store, { ...attempt, ownerId: "other" }));
  await assert.rejects(submitStagedAttempt(h.store, { ...attempt, fingerprint: "changed" }));
});

test("cleanup is retryable, rejects foreign paths and revisits late uploads", async () => {
  const h = harness();
  await h.store.begin(attempt);
  h.objects.add(attempt.photos[0].path);
  h.failRemove(true);
  await assert.rejects(reconcileSubmissionPhotos(h.cleanup));
  await assert.rejects(submitStagedAttempt(h.store, attempt));
  h.failRemove(false);
  assert.equal(await reconcileSubmissionPhotos(h.cleanup), 1);
  assert.equal(h.objects.size, 0);
  h.objects.add(attempt.photos[0].path);
  await reconcileSubmissionPhotos(h.cleanup);
  assert.equal(h.objects.size, 0);
  let removed = false;
  await assert.rejects(reconcileSubmissionPhotos({
    async claim() { return [{ id, ownerId: owner, paths: [`other/${id}/${photo}`] }]; },
    async remove() { removed = true; }, async finish() {},
  }));
  assert.equal(removed, false);
});
