"use server";

import { requireAdmin } from "../../lib/supabase-server";
import { propertySubmissionsEnabled } from "../../lib/property-submission-config";
import { createPrivateSubmissionClient, reconcilePrivateSubmissions } from "../../lib/private-submission-server";

export async function cleanupPrivateSubmissions(): Promise<{ status: "error" | "success"; message: string }> {
  try {
    await requireAdmin();
    if (!propertySubmissionsEnabled()) return { status: "error", message: "Private submission storage is unavailable." };
    const count = await reconcilePrivateSubmissions(createPrivateSubmissionClient());
    return { status: "success", message: `Reconciled ${count} abandoned submission attempts.` };
  } catch (error) {
    console.error("[private-submission] Cleanup failed", { errorType: error instanceof Error ? error.name : typeof error });
    return { status: "error", message: "Private photo reconciliation failed. Retry or contact support." };
  }
}
