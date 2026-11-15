import { NextResponse } from "next/server";
import sharp from "sharp";
import { createSupabaseServiceClient } from "../../../../lib/supabase-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ postId: string }> }) {
  const { postId } = await context.params;
  const token = new URL(request.url).searchParams.get("token");
  if (!/^[0-9a-f-]{36}$/i.test(postId) || !token || !/^[0-9a-f-]{36}$/i.test(token)) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const supabase = createSupabaseServiceClient();
    const { data: post, error } = await supabase.from("instagram_property_posts")
      .select("image_path,status,media_token").eq("id", postId).eq("media_token", token).maybeSingle();
    if (error || !post || !["preview_ready", "publishing", "failed"].includes(post.status)) {
      return new NextResponse("Not found", { status: 404 });
    }

    const { data: file, error: fileError } = await supabase.storage.from("property-photos").download(post.image_path);
    if (fileError || !file) return new NextResponse("Image unavailable", { status: 404 });
    const input = Buffer.from(await file.arrayBuffer());
    const jpeg = await sharp(input, { failOn: "warning", limitInputPixels: 40_000_000 })
      .rotate().jpeg({ quality: 88, mozjpeg: true }).toBuffer();

    return new NextResponse(new Uint8Array(jpeg), {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Length": String(jpeg.length),
        "Cache-Control": "no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Image unavailable", { status: 404 });
  }
}
