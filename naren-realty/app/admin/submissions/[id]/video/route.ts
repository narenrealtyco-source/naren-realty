import { createPropertyVideoResponse } from "../../../../lib/property-video-response";
import { createPrivateSubmissionClient } from "../../../../lib/private-submission-server";
import { propertySubmissionsEnabled } from "../../../../lib/property-submission-config";
import { requireAdmin } from "../../../../lib/supabase-server";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"];
  try {
    ({ supabase } = await requireAdmin());
  } catch {
    return new Response("Admin authentication is required.", { status: 403, headers: { "Cache-Control": "private, no-store" } });
  }
  if (!propertySubmissionsEnabled()) {
    return new Response("Private submission storage is unavailable.", { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
  const { id } = await params;
  if (!uuid.test(id)) return new Response("Video not found.", { status: 404, headers: { "Cache-Control": "private, no-store" } });

  const { data: submission, error } = await supabase.from("property_submissions")
    .select("user_id,video_path").eq("id", id).maybeSingle();
  if (error) return new Response("Video could not be loaded.", { status: 500, headers: { "Cache-Control": "private, no-store" } });
  const path = submission?.video_path;
  if (typeof submission?.user_id !== "string" || !uuid.test(submission.user_id) ||
      typeof path !== "string" || !path.startsWith(`${submission.user_id}/${id}/`) ||
      !uuid.test(path.slice(`${submission.user_id}/${id}/`.length))) {
    return new Response("Video not found.", { status: 404, headers: { "Cache-Control": "private, no-store" } });
  }

  try {
    const { data: video, error: downloadError } = await createPrivateSubmissionClient()
      .storage.from("private-property-submissions").download(path);
    if (downloadError || !video || video.type !== "video/mp4" || video.size > 50 * 1024 * 1024) {
      return new Response("Video could not be loaded.", { status: 404, headers: { "Cache-Control": "private, no-store" } });
    }
    return createPropertyVideoResponse(request, video);
  } catch {
    return new Response("Video could not be loaded.", { status: 500, headers: { "Cache-Control": "private, no-store" } });
  }
}
