"use server";

import { createHash } from "node:crypto";
import sharp from "sharp";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "../lib/supabase-server";
import { propertySubmissionsEnabled, propertySubmissionUploadsReady } from "../lib/property-submission-config";
import {
  MAX_SUBMISSION_PHOTO_BYTES,
  hasUnsupportedSubmissionDetails,
  validatePropertySubmission,
  validateSubmissionPhoto,
  validateSubmissionPhotoCount,
} from "../lib/property-submission-validation";
import { parseSubmissionDetails } from "../lib/submission-details";
import { parsePropertyOwnerDetails } from "../lib/property-submission-owner-validation";
import { submitStagedAttempt } from "../lib/private-submission-lifecycle";
import { createPrivateSubmissionClient, lifecycleStore, manifestFingerprint } from "../lib/private-submission-server";

export type SubmissionState = {
  status: "idle" | "error" | "success";
  message: string;
};

function isSetupError(code: string | undefined): boolean {
  return ["42P01", "PGRST205", "42703", "PGRST204"].includes(code ?? "");
}

export async function submitProperty(
  _previous: SubmissionState,
  formData: FormData,
): Promise<SubmissionState> {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { status: "error", message: "Your session has expired. Please sign in again." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profileError || !profile) {
    console.error("[property-submission] Profile verification failed", { code: profileError?.code });
    return { status: "error", message: "Your Customer profile could not be verified." };
  }
  if (profile.role !== "customer") {
    return { status: "error", message: "A Customer account is required to submit a property." };
  }
  if (!propertySubmissionsEnabled()) {
    return { status: "error", message: "Property submissions are awaiting private database setup. Nothing was saved." };
  }
  if (!await propertySubmissionUploadsReady()) {
    return { status: "error", message: "New submissions are unavailable until private photo handling is ready. Nothing was saved." };
  }
  if (hasUnsupportedSubmissionDetails(formData.entries())) {
    return { status: "error", message: "Unsupported property details were provided; nothing was saved." };
  }

  const { error: setupError } = await supabase.from("property_submissions").select("id,owner_details").limit(1);
  if (setupError) {
    console.error("[property-submission] Submission table unavailable", { code: setupError.code });
    return {
      status: "error",
      message: isSetupError(setupError.code)
        ? "Property submissions are awaiting database setup. Nothing was saved."
        : "Your submission could not be prepared. Please try again.",
    };
  }

  let input;
  let details;
  let ownerDetails;
  const decodedPhotos: { bytes: Buffer; type: string }[] = [];
  const photos = formData.getAll("photos");
  try {
    input = validatePropertySubmission({
      title: formData.get("title"),
      category: formData.get("category"),
      locality: formData.get("locality"),
      address: formData.get("address"),
      price: Number(formData.get("price")),
      area: Number(formData.get("area")),
      description: formData.get("description"),
    });
    details = parseSubmissionDetails(formData);
    ownerDetails = parsePropertyOwnerDetails(formData);
    if (formData.get("owner_confirmed") !== "on" || formData.get("listing_declaration") !== "on") {
      throw new Error("Confirm your authority to list the property and review the listing declaration.");
    }
    validateSubmissionPhotoCount(photos.length);
    for (const photo of photos) {
      if (!(photo instanceof File) || photo.size > MAX_SUBMISSION_PHOTO_BYTES) {
        throw new Error("Each photo must be a JPEG, PNG, or WebP under 5 MB.");
      }
      const bytes = new Uint8Array(await photo.arrayBuffer());
      validateSubmissionPhoto(photo.type, bytes);
      try {
        const image = sharp(bytes, { failOn: "warning", limitInputPixels: 40_000_000, animated: false });
        const metadata = await image.metadata();
        const expected = { "image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp" }[photo.type];
        if (metadata.format !== expected || (metadata.pages ?? 1) !== 1) throw new Error("Invalid image format.");
        const sanitized = await image.toBuffer();
        if (sanitized.length > MAX_SUBMISSION_PHOTO_BYTES) throw new Error("Image is too large.");
        decodedPhotos.push({ bytes: sanitized, type: photo.type });
      } catch {
        throw new Error("A photo is corrupt, unsupported, or too large to process.");
      }
    }
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Property details are invalid." };
  }

  const submissionId = formData.get("submission_id");
  if (typeof submissionId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(submissionId)) {
    return { status: "error", message: "Invalid submission attempt. Reload the page and try again." };
  }
  const payload = { ...input, details, ownerDetails };
  const stagedPhotos = decodedPhotos.map((photo, index) => {
    const digest = createHash("sha256").update(photo.bytes).digest("hex");
    const token = createHash("sha256").update(`${index}:${digest}`).digest("hex").slice(0, 32);
    const photoId = `${token.slice(0, 8)}-${token.slice(8, 12)}-${token.slice(12, 16)}-${token.slice(16, 20)}-${token.slice(20)}`;
    return { path: `${user.id}/${submissionId}/${photoId}`, type: photo.type, bytes: photo.bytes, digest };
  });
  const baseAttempt = { id: submissionId, ownerId: user.id, photos: stagedPhotos };
  const attempt = { ...baseAttempt, fingerprint: manifestFingerprint(payload, baseAttempt) };
  try {
    await submitStagedAttempt(lifecycleStore(createPrivateSubmissionClient(), payload), attempt);
    revalidatePath("/list-property");
    return { status: "success", message: "Your property was submitted for review." };
  } catch (error) {
    console.error("[property-submission] Submission failed", {
      errorType: error instanceof Error ? error.name : typeof error,
    });
    return {
      status: "error",
      message: "The submission could not be confirmed. Retry without changing the form, or check your submissions before starting again.",
    };
  }
}

export async function resubmitProperty(_previous: SubmissionState, formData: FormData): Promise<SubmissionState> {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { status: "error", message: "Your session has expired. Please sign in again." };
  if (!propertySubmissionsEnabled()) return { status: "error", message: "Property submissions are awaiting private database setup." };
  if (!await propertySubmissionUploadsReady()) return { status: "error", message: "Resubmission is unavailable until private submission setup is verified. Nothing was saved." };

  const id = formData.get("submission_id");
  if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return { status: "error", message: "Invalid submission ID." };
  }
  let input;
  let details;
  let ownerDetails;
  try {
    input = validatePropertySubmission({
      title: formData.get("title"), category: formData.get("category"), locality: formData.get("locality"),
      address: formData.get("address"), price: Number(formData.get("price")),
      area: Number(formData.get("area")), description: formData.get("description"),
    });
    if (hasUnsupportedSubmissionDetails(formData.entries())) throw new Error("Unsupported property details were provided.");
    details = parseSubmissionDetails(formData);
    ownerDetails = parsePropertyOwnerDetails(formData);
    if (formData.get("owner_confirmed") !== "on" || formData.get("listing_declaration") !== "on") {
      throw new Error("Confirm your authority to list the property and review the listing declaration.");
    }
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Property details are invalid." };
  }
  const { error } = await supabase.rpc("resubmit_property_submission_v3", {
    p_id: id, p_title: input.title, p_category: input.category, p_locality: input.locality,
    p_address: input.address, p_price: input.price, p_area: input.area, p_description: input.description,
    p_details: details, p_owner_details: ownerDetails,
  });
  if (error) {
    console.error("[property-submission] Resubmission failed", { code: error.code });
    return { status: "error", message: "Resubmission could not be confirmed. Refresh your submissions before retrying." };
  }
  revalidatePath("/list-property");
  revalidatePath("/admin/submissions");
  return { status: "success", message: "Your property was resubmitted for review." };
}
