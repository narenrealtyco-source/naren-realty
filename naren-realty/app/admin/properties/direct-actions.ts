"use server";

import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../lib/supabase-server";
import { MAX_SUBMISSION_PHOTO_BYTES, validateSubmissionPhoto } from "../../lib/property-submission-validation";
import { validateDirectProperty, validateDirectPhotoCount } from "./direct-validation";

export type DirectState = { status: "idle" | "error" | "success"; message: string; id?: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function saveDirectProperty(_state: DirectState, form: FormData): Promise<DirectState> {
  let admin: Awaited<ReturnType<typeof requireAdmin>>;
  try { admin = await requireAdmin(); } catch { return { status: "error", message: "Admin authentication is required." }; }
  let input;
  try { input = validateDirectProperty(form); } catch (error) { return { status: "error", message: error instanceof Error ? error.message : "Invalid property details." }; }
  const suppliedId = form.get("property_id");
  if (suppliedId && (typeof suppliedId !== "string" || !uuid.test(suppliedId))) return { status: "error", message: "Invalid property ID." };
  const id = typeof suppliedId === "string" && suppliedId ? suppliedId : randomUUID();
  let existingPhotos: string[] = [];
  if (suppliedId) {
    const { data, error } = await admin.supabase.from("properties").select("id,owner_id,details,photos,status").eq("id", id).maybeSingle();
    if (error || !data) return { status: "error", message: "The property could not be loaded for editing." };
    if (!data.details || typeof data.details !== "object" || data.details.adminDirect !== true || !Array.isArray(data.photos) || !data.photos.every((path: unknown) => typeof path === "string")) {
      return { status: "error", message: "Only Admin-created properties can be edited here." };
    }
    existingPhotos = data.photos;
  }
  const photos = form.getAll("photos").filter((photo) => photo instanceof File && photo.size > 0);
  const sanitized: { bytes: Buffer; type: string }[] = [];
  try {
    validateDirectPhotoCount(existingPhotos.length, photos.length);
    for (const photo of photos) {
      if (!(photo instanceof File) || photo.size > MAX_SUBMISSION_PHOTO_BYTES) throw new Error("Each photo must be under 5 MB.");
      const bytes = new Uint8Array(await photo.arrayBuffer());
      validateSubmissionPhoto(photo.type, bytes);
      const image = sharp(bytes, { failOn: "warning", limitInputPixels: 40_000_000 });
      const metadata = await image.metadata();
      const expected = { "image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp" }[photo.type];
      if (metadata.format !== expected || (metadata.pages ?? 1) !== 1) throw new Error("Invalid image.");
      const output = await image.toBuffer();
      if (output.length > MAX_SUBMISSION_PHOTO_BYTES) throw new Error("Image is too large.");
      sanitized.push({ bytes: output, type: photo.type });
    }
  } catch {
    return { status: "error", message: "Choose 1–5 valid JPEG, PNG or WebP photos, each under 5 MB." };
  }
  const uploaded: string[] = [];
  const bucket = admin.supabase.storage.from("property-photos");
  try {
    for (const photo of sanitized) {
      const path = `${admin.user.id}/${id}/${randomUUID()}`;
      uploaded.push(path);
      const { error } = await bucket.upload(path, photo.bytes, { contentType: photo.type, upsert: false });
      if (error) throw new Error("Photo upload failed. Verify Admin Storage permissions.");
    }
  } catch (error) {
    if (uploaded.length) {
      try {
        const { error: cleanupError } = await bucket.remove(uploaded);
        if (cleanupError) throw cleanupError;
      } catch (cleanupError) {
        console.error("[admin-property] Photo cleanup failed", { errorType: cleanupError instanceof Error ? cleanupError.name : typeof cleanupError });
        return { status: "error", message: "Photo upload failed and cleanup could not be confirmed. Contact an Admin before retrying." };
      }
    }
    return { status: "error", message: error instanceof Error ? error.message : "Photo upload failed." };
  }
  const payload = {
    title: input.input.title, category: input.input.category, locality: input.input.locality, price: input.input.price,
    details: { adminDirect: true, publicListing: input.publicListing, carpetArea: input.input.area },
    photos: [...existingPhotos, ...uploaded],
  };
  const query = suppliedId ? admin.supabase.from("properties").update(payload).eq("id", id) :
    admin.supabase.from("properties").insert({ ...payload, id, owner_id: admin.user.id, status: "pending" });
  const { data, error } = await query.select("id").maybeSingle();
  if (error || !data) {
    console.error("[admin-property] Save not confirmed", { code: error?.code });
    return { status: "error", message: "Save could not be confirmed. Check Property Management before retrying; uploaded photos may need cleanup." };
  }
  revalidatePath("/admin/properties");
  revalidatePath("/properties");
  revalidatePath(`/properties/${id}`);
  return { status: "success", message: suppliedId ? "Property updated." : "Property saved as pending. Publish it from Property Management.", id };
}
