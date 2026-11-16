"use server";

import { revalidatePath } from "next/cache";
import { propertySubmissionsEnabled } from "../../lib/property-submission-config";
import { createPrivateSubmissionClient } from "../../lib/private-submission-server";
import { requireAdmin } from "../../lib/supabase-server";
import { createPrivateSubmissionClient } from "../../lib/private-submission-server";

export type ReviewState = { status: "idle" | "error" | "success"; message: string };
export type DeleteRejectedState = { status: "idle" | "error" | "success"; message: string };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function reviewSubmission(
  decision: "approved" | "rejected",
  formData: FormData,
): Promise<ReviewState> {
  let supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"];
  try {
    ({ supabase } = await requireAdmin());
  } catch (error) {
    console.error("[submission-review] Admin verification failed", { errorType: error instanceof Error ? error.name : typeof error });
    return { status: "error", message: "Admin authentication and authorization are required." };
  }
  if (!propertySubmissionsEnabled()) {
    return { status: "error", message: "Submission review is awaiting private database setup." };
  }
  const id = formData.get("submission_id");
  if (typeof id !== "string" || !uuidPattern.test(id)) {
    return { status: "error", message: "Invalid submission ID." };
  }

  const reason = formData.get("reason");
  if (decision === "rejected" && (typeof reason !== "string" || !reason.trim() || reason.trim().length > 2000)) {
    return { status: "error", message: "Enter a rejection reason of up to 2,000 characters." };
  }

  const { data, error } = decision === "approved"
    ? await supabase.rpc("approve_and_publish_property_submission", { p_submission_id: id })
    : await supabase.rpc("review_property_submission", {
      p_submission_id: id,
      p_decision: "rejected",
      p_feedback: typeof reason === "string" ? reason.trim() : null,
    });
  if (error) {
    console.error("[submission-review] Review failed", { code: error.code });
    return { status: "error", message: "Review could not be confirmed. Refresh the queue before retrying; the submission may already have been reviewed." };
  }
  if (decision === "approved" && (typeof data !== "string" || !uuidPattern.test(data))) {
    console.error("[submission-review] Publication returned an invalid property ID");
    return { status: "error", message: "Publication could not be confirmed. Refresh the queue before retrying." };
  }
  revalidatePath("/admin/submissions");
  revalidatePath("/list-property");
  if (decision === "approved") {
    revalidatePath("/properties");
    revalidatePath(`/properties/${data}`);
  }
  return {
    status: "success",
    message: decision === "approved" ? "Property approved and published." : "Submission rejected; the Customer can see the reason.",
  };
}

export async function approveSubmission(_previous: ReviewState, formData: FormData): Promise<ReviewState> {
  return reviewSubmission("approved", formData);
}

export async function rejectSubmission(_previous: ReviewState, formData: FormData): Promise<ReviewState> {
  return reviewSubmission("rejected", formData);
}

export async function deleteRejectedSubmission(
  _previous: DeleteRejectedState,
  formData: FormData,
): Promise<DeleteRejectedState> {
  let supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"];
  try {
    ({ supabase } = await requireAdmin());
  } catch (error) {
    console.error("[submission-delete] Admin verification failed", { errorType: error instanceof Error ? error.name : typeof error });
    return { status: "error", message: "Admin authentication and authorization are required." };
  }

  if (!propertySubmissionsEnabled()) {
    return { status: "error", message: "Submission deletion is awaiting private database setup." };
  }

  const id = formData.get("submission_id");
  if (typeof id !== "string" || !uuidPattern.test(id)) {
    return { status: "error", message: "Invalid submission ID." };
  }

  try {
    const { data, error } = await supabase.rpc("claim_rejected_property_submission_deletion", {
      p_submission_id: id,
    });
    if (error) throw new Error("The rejected submission could not be claimed for deletion.");
    if (!Array.isArray(data) || data.length !== 1) {
      throw new Error("The deletion manifest could not be verified.");
    }

    const row = data[0] as { submission_id?: unknown; owner_id?: unknown; photo_paths?: unknown };
    if (row.submission_id !== id || typeof row.owner_id !== "string" || !uuidPattern.test(row.owner_id)
      || !Array.isArray(row.photo_paths) || row.photo_paths.length < 1 || row.photo_paths.length > 5) {
      throw new Error("The deletion manifest is invalid; no photos were removed.");
    }

    const paths = row.photo_paths as unknown[];
    const safePaths = paths.map((path) => {
      if (typeof path !== "string"
        || !new RegExp(`^${row.owner_id}/${id}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`, "i").test(path)) {
        throw new Error("A photo path failed security validation; no photos were removed.");
      }
      return path;
    });

    const storage = createPrivateSubmissionClient();
    const { error: storageError } = await storage.storage
      .from("private-property-submissions")
      .remove(safePaths);
    if (storageError) {
      console.error("[submission-delete] Storage cleanup failed", { code: storageError.name });
      throw new Error("Photo cleanup failed. The submission is marked Deleting; use Retry after checking Storage.");
    }

    const { error: finalizeError } = await supabase.rpc("finalize_rejected_property_submission_deletion", {
      p_submission_id: id,
    });
    if (finalizeError) {
      console.error("[submission-delete] Final deletion failed", { code: finalizeError.code });
      throw new Error("Photos were cleaned, but the record could not be finalized. Use Retry to finish deletion.");
    }

    revalidatePath("/admin/submissions");
    revalidatePath("/list-property");
    return { status: "success", message: "Rejected submission and its private photos were permanently deleted." };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Deletion could not be confirmed. Retry the cleanup.",
    };
  }
}


export type DeleteSubmissionState = { status: "idle" | "error" | "success"; message: string };

export async function deleteRejectedSubmission(
  _previous: DeleteSubmissionState,
  formData: FormData,
): Promise<DeleteSubmissionState> {
  let supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"];
  try {
    ({ supabase } = await requireAdmin());
  } catch {
    return { status: "error", message: "Admin authentication and authorization are required." };
  }

  if (!propertySubmissionsEnabled()) {
    return { status: "error", message: "Private property submission storage is not configured." };
  }

  const id = formData.get("submission_id");
  if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return { status: "error", message: "Invalid submission ID." };
  }

  const { data, error } = await supabase.rpc("claim_rejected_property_submission_deletion", {
    p_submission_id: id,
  });
  if (error || !Array.isArray(data) || data.length !== 1) {
    console.error("[submission-delete] Deletion claim failed", { code: error?.code });
    return { status: "error", message: "This submission is not eligible for deletion, or the deletion migration is not active." };
  }

  const manifest = data[0] as { submission_id?: unknown; user_id?: unknown; photo_paths?: unknown };
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (manifest.submission_id !== id || typeof manifest.user_id !== "string" || !uuid.test(manifest.user_id)
      || !Array.isArray(manifest.photo_paths) || manifest.photo_paths.length < 1 || manifest.photo_paths.length > 5
      || !manifest.photo_paths.every((path: unknown) => typeof path === "string"
        && new RegExp("^" + manifest.user_id + "/" + id + "/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", "i").test(path))) {
    console.error("[submission-delete] Invalid deletion manifest returned");
    return { status: "error", message: "The stored photo manifest failed validation. No files were deleted." };
  }

  try {
    const storage = createPrivateSubmissionClient();
    const { error: storageError } = await storage.storage
      .from("private-property-submissions")
      .remove(manifest.photo_paths as string[]);
    if (storageError) {
      console.error("[submission-delete] Private photo removal failed", { message: storageError.message });
      return { status: "error", message: "Photo cleanup failed. The submission is marked Deleting; retry the cleanup to finish." };
    }
  } catch (error) {
    console.error("[submission-delete] Private storage client failed", { errorType: error instanceof Error ? error.name : typeof error });
    return { status: "error", message: "Photo cleanup could not finish. The submission is marked Deleting; retry the cleanup." };
  }

  const { error: finalizeError } = await supabase.rpc("finalize_rejected_property_submission_deletion", {
    p_submission_id: id,
  });
  if (finalizeError) {
    console.error("[submission-delete] Final deletion failed", { code: finalizeError.code });
    return { status: "error", message: "Photos were cleaned, but the record could not be removed. Retry to finalize deletion." };
  }

  revalidatePath("/admin/submissions");
  revalidatePath("/list-property");
  return { status: "success", message: "Rejected submission and its private photos were permanently deleted." };
}
