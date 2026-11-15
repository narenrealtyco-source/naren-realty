export type StagedPhoto = { path: string; type: string; bytes: Uint8Array; digest: string };
export type SubmissionAttempt = { id: string; ownerId: string; fingerprint: string; photos: StagedPhoto[] };
export type AttemptState = "staging" | "committed" | "cleaning" | "cleaned";

export interface SubmissionLifecycleStore {
  begin(attempt: SubmissionAttempt): Promise<AttemptState>;
  upload(photo: StagedPhoto): Promise<void>;
  commit(attempt: SubmissionAttempt): Promise<void>;
}

export async function submitStagedAttempt(store: SubmissionLifecycleStore, attempt: SubmissionAttempt): Promise<void> {
  const state = await store.begin(attempt);
  if (state === "committed") return;
  if (state !== "staging") throw new Error("This submission attempt has expired. Start a new submission.");
  for (const photo of attempt.photos) await store.upload(photo);
  await store.commit(attempt);
}

export type CleanupAttempt = { id: string; ownerId: string; paths: string[] };
export interface SubmissionCleanupStore {
  claim(limit: number): Promise<CleanupAttempt[]>;
  remove(paths: string[]): Promise<void>;
  finish(attempt: CleanupAttempt): Promise<void>;
}

export async function reconcileSubmissionPhotos(store: SubmissionCleanupStore, limit = 50): Promise<number> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error("Invalid cleanup batch size.");
  const attempts = await store.claim(limit);
  for (const attempt of attempts) {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const prefix = `${attempt.ownerId}/${attempt.id}/`;
    if (!uuid.test(attempt.ownerId) || !uuid.test(attempt.id) || !attempt.paths.length || attempt.paths.length > 5 ||
      attempt.paths.some((path) => !path.startsWith(prefix) || !uuid.test(path.slice(prefix.length)))) {
      throw new Error("Invalid cleanup manifest; no files were deleted.");
    }
    await store.remove(attempt.paths);
    await store.finish(attempt);
  }
  return attempts.length;
}
