"use server";

import { revalidatePath } from "next/cache";
import { createPrivateSubmissionClient } from "../../lib/private-submission-server";
import { requireAdmin } from "../../lib/supabase-server";

export type DeleteRejectedPropertyState = { status: "idle" | "error" | "success"; message: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function deleteRejectedProperty(
  _previous: DeleteRejectedPropertyState,
  formData: FormData,
): Promise<DeleteRejectedPropertyState> {
  let supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"];
  try {
    ({ supabase } = await requireAdmin());
  } catch {
    return { status: "error", message: "Admin authentication and authorization are required." };
  }

  const id = formData.get("property_id");
  if (typeof id !== "string" || !uuid.test(id)) {
    return { status: "error", message: "Invalid property ID." };
  }

  try {
    const { data, error } = await supabase.rpc("claim_rejected_property_deletion", { p_property_id: id });
    if (error || !Array.isArray(data) || data.length !== 1) {
      console.error("[property-delete] Claim failed", { code: error?.code });
      throw new Error("Only rejected properties can be deleted, or the cleanup migration is not active.");
    }
    const manifest = data[0] as { property_id?: unknown; owner_id?: unknown; storage_paths?: unknown };
    if (manifest.property_id !== id || typeof manifest.owner_id !== "string" || !uuid.test(manifest.owner_id)
      || !Array.isArray(manifest.storage_paths) || manifest.storage_paths.length > 5) {
      throw new Error("The property photo manifest failed validation. No photos were deleted.");
    }
    const safePaths = (manifest.storage_paths as unknown[]).map((path) => {
      if (typeof path !== "string" || !new RegExp(
        `^${manifest.owner_id}/${id}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`, "i",
      ).test(path)) throw new Error("A public photo path failed validation. No photos were deleted.");
      return path;
    });

    if (safePaths.length) {
      const storage = createPrivateSubmissionClient();
      const { error: storageError } = await storage.storage.from("property-photos").remove(safePaths);
      if (storageError) {
        console.error("[property-delete] Public photo removal failed", { message: storageError.message });
        throw new Error("Photo cleanup failed. The property is marked Deleting; use Retry to finish.");
      }
    }

    const { error: finalizeError } = await supabase.rpc("finalize_rejected_property_deletion", { p_property_id: id });
    if (finalizeError) {
      console.error("[property-delete] Finalization failed", { code: finalizeError.code });
      throw new Error("Photos were cleaned, but the property record could not be removed. Use Retry to finalize.");
    }
    revalidatePath("/admin/properties");
    revalidatePath("/admin/submissions");
    revalidatePath("/properties");
    return { status: "success", message: "Rejected property deleted. Approved customer submissions and their private photos were preserved." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Deletion could not be confirmed. Retry cleanup." };
  }
}
