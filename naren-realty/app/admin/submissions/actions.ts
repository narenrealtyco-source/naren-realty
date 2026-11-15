"use server";

import { revalidatePath } from "next/cache";
import { propertySubmissionsEnabled } from "../../lib/property-submission-config";
import { requireAdmin } from "../../lib/supabase-server";

export type ReviewState = { status: "idle" | "error" | "success"; message: string };

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
  if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
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
  if (decision === "approved" && (typeof data !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data))) {
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
