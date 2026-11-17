import "server-only";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { reconcileSubmissionPhotos, type SubmissionAttempt, type SubmissionCleanupStore, type SubmissionLifecycleStore } from "./private-submission-lifecycle";

const bucketName = "private-property-submissions";

export function createPrivateSubmissionClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error("Private submission server credentials are not configured.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

type Client = ReturnType<typeof createPrivateSubmissionClient>;
function fail(error: { message: string } | null, label: string): void {
  if (error) {
    console.error(`[private-submission] ${label}`, { message: error.message });
    throw new Error(`${label}. Please retry or contact support.`);
  }
}

export function lifecycleStore(client: Client, payload: object): SubmissionLifecycleStore {
  const bucket = client.storage.from(bucketName);
  return {
    async begin(attempt) {
      const manifest = [
        ...attempt.photos.map((photo) => ({ path: photo.path, type: photo.type, size: photo.bytes.length, digest: photo.digest })),
        ...(attempt.video ? [{ path: attempt.video.path, type: attempt.video.type, size: attempt.video.size, digest: attempt.video.digest }] : []),
      ];
      const { data, error } = await client.rpc("begin_private_submission", {
        p_id: attempt.id, p_actor: attempt.ownerId, p_fingerprint: attempt.fingerprint, p_payload: payload, p_manifest: manifest,
      });
      fail(error, "Submission preparation failed");
      if (data !== "staging" && data !== "committed" && data !== "cleaning" && data !== "cleaned") throw new Error("Unexpected submission attempt state.");
      return data;
    },
    async upload(photo) {
      const { error } = await bucket.upload(photo.path, photo.bytes, { contentType: photo.type, upsert: false });
      if (!error) return;
      // An earlier attempt may have completed its upload despite a lost response.
      const { data: existing, error: downloadError } = await bucket.download(photo.path);
      if (downloadError || !existing) {
        fail(error, "Private photo upload failed");
        throw new Error("Private photo upload failed.");
      }
      const digest = createHash("sha256").update(Buffer.from(await existing.arrayBuffer())).digest("hex");
      if (existing.type !== photo.type || digest !== photo.digest) throw new Error("Staged photo does not match the retry.");
    },
    async commit(attempt) {
      const { data, error } = await client.rpc("commit_private_submission", {
        p_id: attempt.id, p_actor: attempt.ownerId, p_fingerprint: attempt.fingerprint,
      });
      fail(error, "Submission commit could not be confirmed");
      if (data !== attempt.id) throw new Error("Submission commit returned an unexpected identifier.");
    },
  };
}

export async function reconcilePrivateSubmissions(client: Client, limit = 50): Promise<number> {
  const store: SubmissionCleanupStore = {
    async claim(batchSize) {
      const { data, error } = await client.rpc("claim_private_submission_cleanup", { p_limit: batchSize });
      fail(error, "Private photo cleanup claim failed");
      if (!Array.isArray(data)) throw new Error("Invalid private photo cleanup response.");
      return data.map((row: { id: string; user_id: string; manifest: { path: string }[] }) => ({
        id: row.id, ownerId: row.user_id, paths: row.manifest.map((item) => item.path),
      }));
    },
    async remove(paths) {
      const { error } = await client.storage.from(bucketName).remove(paths);
      fail(error, "Private photo cleanup failed");
    },
    async finish(attempt) {
      const { error } = await client.rpc("finish_private_submission_cleanup", { p_id: attempt.id, p_actor: attempt.ownerId });
      fail(error, "Private photo cleanup confirmation failed");
    },
  };
  return reconcileSubmissionPhotos(store, limit);
}

export function manifestFingerprint(payload: object, attempt: Pick<SubmissionAttempt, "id" | "ownerId" | "photos" | "video">): string {
  return createHash("sha256").update(JSON.stringify({
    id: attempt.id, ownerId: attempt.ownerId, payload,
    photos: attempt.photos.map(({ path, type, bytes, digest }) => ({ path, type, size: bytes.length, digest })),
    video: attempt.video ?? null,
  })).digest("hex");
}
