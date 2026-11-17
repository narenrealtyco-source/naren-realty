import { createPropertyVideoResponse } from "../../../lib/property-video-response";
import { createPrivateSubmissionClient } from "../../../lib/private-submission-server";
import { createSupabaseServerClient } from "../../../lib/supabase-server";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.test(id)) return new Response("Video not found.", { status: 404, headers });

  const supabase = await createSupabaseServerClient();
  const { data: property, error: propertyError } = await supabase.from("properties")
    .select("id,owner_id,details,status").eq("id", id).eq("status", "approved").maybeSingle();
  if (propertyError) return new Response("Video could not be loaded.", { status: 500, headers });
  const details = isRecord(property?.details) ? property.details : null;
  const publicListing = details && isRecord(details.publicListing) ? details.publicListing : null;
  const path = publicListing?.videoPath;
  if (!property || property.status !== "approved" || typeof property.owner_id !== "string" ||
      typeof path !== "string") return new Response("Video not found.", { status: 404, headers });

  const parts = path.split("/");
  if (parts.length !== 3 || parts[0] !== property.owner_id || !uuid.test(parts[0]) ||
      !uuid.test(parts[1]) || !uuid.test(parts[2])) {
    return new Response("Video not found.", { status: 404, headers });
  }

  try {
    const privateClient = createPrivateSubmissionClient();
    const { data: submission, error } = await privateClient.from("property_submissions")
      .select("user_id,status,published_property_id,video_path")
      .eq("id", parts[1]).maybeSingle();
    if (error) return new Response("Video could not be loaded.", { status: 500, headers });
    if (!submission || submission.status !== "approved" || submission.user_id !== property.owner_id ||
        submission.published_property_id !== id || submission.video_path !== path) {
      return new Response("Video not found.", { status: 404, headers });
    }
    const { data: video, error: downloadError } = await privateClient.storage
      .from("private-property-submissions").download(path);
    if (downloadError || !video || video.type !== "video/mp4" || video.size > 50 * 1024 * 1024) {
      return new Response("Video could not be loaded.", { status: 404, headers });
    }
    return createPropertyVideoResponse(request, video);
  } catch {
    return new Response("Video could not be loaded.", { status: 500, headers });
  }
}
