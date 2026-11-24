import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { requireAdmin } from "../../../../lib/supabase-server";
import { createSupabaseServiceClient } from "../../../../lib/supabase-service";

const BUCKET = "campaign-assets";
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const form = await request.formData();
    const file = form.get("file");
    const aspect = form.get("aspect");

    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a banner image first." }, { status: 400 });
    if (aspect !== "16:9" && aspect !== "9:16") return NextResponse.json({ error: "Choose 16:9 or 9:16 format." }, { status: 400 });
    if (file.size <= 0 || file.size > MAX_BYTES) return NextResponse.json({ error: "Image must be under 5 MB." }, { status: 400 });
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return NextResponse.json({ error: "Only JPG, PNG and WebP images are allowed." }, { status: 400 });

    const input = Buffer.from(await file.arrayBuffer());
    const metadata = await sharp(input, { limitInputPixels: 25_000_000 }).metadata();
    if (!metadata.width || !metadata.height || !["jpeg", "png", "webp"].includes(metadata.format ?? "")) {
      return NextResponse.json({ error: "The uploaded file is not a valid supported image." }, { status: 400 });
    }
    const ratio = metadata.width / metadata.height;
    const expected = aspect === "16:9" ? 16 / 9 : 9 / 16;
    if (Math.abs(ratio - expected) / expected > 0.08) {
      return NextResponse.json({ error: `Image dimensions must be close to ${aspect}.` }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();
    const { data: bucket } = await supabase.storage.getBucket(BUCKET);
    if (!bucket) {
      const { error: bucketError } = await supabase.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: MAX_BYTES,
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
      });
      if (bucketError && !/already exists/i.test(bucketError.message)) throw bucketError;
    }

    const extension = metadata.format === "jpeg" ? "jpg" : metadata.format;
    const path = `email-banners/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`;
    const { data: uploaded, error: uploadError } = await supabase.storage.from(BUCKET).upload(path, input, {
      contentType: metadata.format === "jpeg" ? "image/jpeg" : `image/${metadata.format}`,
      cacheControl: "31536000",
      upsert: false,
    });
    if (uploadError || !uploaded) throw uploadError ?? new Error("Banner upload failed.");

    const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(uploaded.path);
    return NextResponse.json({ ok: true, url: publicData.publicUrl, width: metadata.width, height: metadata.height, aspect });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Banner upload failed.";
    const status = /admin|authoriz/i.test(message) ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
