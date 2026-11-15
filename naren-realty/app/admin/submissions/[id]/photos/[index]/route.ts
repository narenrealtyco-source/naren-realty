import { propertySubmissionsEnabled } from "../../../../../lib/property-submission-config";
import { requireAdmin } from "../../../../../lib/supabase-server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; index: string }> }) {
  let supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"];
  try {
    ({ supabase } = await requireAdmin());
  } catch (error) {
    console.error("[submission-review] Photo authorization failed", { errorType: error instanceof Error ? error.name : typeof error });
    return new Response("Admin authentication is required.", { status: 403, headers: { "Cache-Control": "private, no-store" } });
  }
  if (!propertySubmissionsEnabled()) {
    return new Response("Private submission storage is unavailable.", { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }

  const { id, index } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) || !/^[0-4]$/.test(index)) {
    return new Response("Invalid photo request.", { status: 400, headers: { "Cache-Control": "private, no-store" } });
  }
  const { data, error } = await supabase.from("property_submissions")
    .select("user_id,photo_paths").eq("id", id).maybeSingle();
  if (error) {
    console.error("[submission-review] Photo lookup failed", { code: error.code });
    return new Response("Photo could not be loaded.", { status: 500, headers: { "Cache-Control": "private, no-store" } });
  }
  const path = Array.isArray(data?.photo_paths) ? data.photo_paths[Number(index)] : undefined;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (typeof data?.user_id !== "string" || !uuid.test(data.user_id) || typeof path !== "string" ||
      !path.startsWith(`${data.user_id}/${id}/`) || !uuid.test(path.slice(`${data.user_id}/${id}/`.length))) {
    return new Response("Photo not found.", { status: 404, headers: { "Cache-Control": "private, no-store" } });
  }
  const { data: photo, error: photoError } = await supabase.storage.from("private-property-submissions").download(path);
  if (photoError || !photo) {
    console.error("[submission-review] Private photo download failed", { name: photoError?.name });
    return new Response("Photo could not be loaded.", { status: 500, headers: { "Cache-Control": "private, no-store" } });
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(photo.type)) {
    return new Response("Unsupported photo type.", { status: 415, headers: { "Cache-Control": "private, no-store" } });
  }
  return new Response(photo, { headers: { "Content-Type": photo.type, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox", "Content-Disposition": "inline" } });
}
