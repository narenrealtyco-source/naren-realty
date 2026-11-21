import { createPrivateSubmissionClient } from "../../../../lib/private-submission-server";
import { createSupabaseServerClient } from "../../../../lib/supabase-server";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; index: string }> }) {
  const { id, index } = await params;
  if (!uuid.test(id) || !/^[0-4]$/.test(index)) {
    return new Response("Photo not found.", { status: 404, headers });
  }

  const supabase = await createSupabaseServerClient();
  const { data: property, error: propertyError } = await supabase.from("properties")
    .select("id,owner_id,photos,status").eq("id", id).eq("status", "approved").maybeSingle();
  if (propertyError) {
    console.error("[public-property-photo] Property lookup failed", { code: propertyError.code });
    return new Response("Photo could not be loaded.", { status: 500, headers });
  }
  const marker = Array.isArray(property?.photos) ? property.photos[Number(index)] : undefined;
  const parts = typeof marker === "string" ? marker.split("/") : [];
  if (!property || property.status !== "approved" || parts.length !== 4 ||
      parts[0] !== "private-submission" || parts[1] !== property.owner_id ||
      !parts.slice(1).every((part: string) => uuid.test(part))) {
    return new Response("Photo not found.", { status: 404, headers });
  }

  try {
    const privateClient = createPrivateSubmissionClient();
    const { data: submission, error } = await privateClient.from("property_submissions")
      .select("user_id,status,published_property_id,photo_paths").eq("id", parts[2]).maybeSingle();
    if (error) {
      console.error("[public-property-photo] Submission lookup failed", { code: error.code });
      return new Response("Photo could not be loaded.", { status: 500, headers });
    }
    const path = parts.slice(1).join("/");
    if (!submission || submission.status !== "approved" || submission.user_id !== property.owner_id ||
        submission.published_property_id !== id || !Array.isArray(submission.photo_paths) ||
        submission.photo_paths[Number(index)] !== path) {
      return new Response("Photo not found.", { status: 404, headers });
    }
    const { data: photo, error: photoError } = await privateClient.storage.from("private-property-submissions").download(path);
    if (photoError || !photo) {
      console.error("[public-property-photo] Download failed", { name: photoError?.name });
      return new Response("Photo could not be loaded.", { status: 500, headers });
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(photo.type)) {
      return new Response("Unsupported photo type.", { status: 415, headers });
    }
    return new Response(photo, { headers: { ...headers, "Content-Type": photo.type,
      "Content-Security-Policy": "default-src 'none'; sandbox", "Content-Disposition": "inline" } });
  } catch (error) {
    console.error("[public-property-photo] Private storage unavailable", { errorType: error instanceof Error ? error.name : typeof error });
    return new Response("Photo could not be loaded.", { status: 500, headers });
  }
}
