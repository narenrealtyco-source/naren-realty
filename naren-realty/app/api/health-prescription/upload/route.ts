import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024;
const MIME_EXTENSIONS: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("prescription");
    const name = String(form.get("name") || "").trim();
    const phone = String(form.get("phone") || "").replace(/\D/g, "");
    if (!(file instanceof File) || !name || name.length > 120 || !/^[6-9]\d{9}$/.test(phone)) {
      return NextResponse.json({ error: "Enter your name, valid 10-digit mobile number and select a prescription." }, { status: 400 });
    }
    const extension = MIME_EXTENSIONS[file.type];
    if (!extension || file.size < 1 || file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Upload a PDF, JPG, PNG or WEBP file up to 10 MB." }, { status: 400 });
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !service) return NextResponse.json({ error: "Prescription upload is temporarily unavailable." }, { status: 503 });

    const supabase = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    const reference = "RX-" + randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();
    const storagePath = "customer-enquiries/" + reference + "." + extension;
    const { error: uploadError } = await supabase.storage.from("mfit-prescriptions").upload(storagePath, Buffer.from(await file.arrayBuffer()), {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });
    if (uploadError) throw uploadError;

    const { error: insertError } = await supabase.from("health_prescription_uploads").insert({
      storage_path: storagePath,
      original_filename: file.name.slice(0, 180),
      content_type: file.type,
      file_size_bytes: file.size,
      customer_name: name,
      customer_phone: phone,
    });
    if (insertError) {
      await supabase.storage.from("mfit-prescriptions").remove([storagePath]);
      throw insertError;
    }
    return NextResponse.json({ success: true, reference, message: "Prescription submitted securely. MFIT Healthcare will contact you on the registered mobile number." }, { status: 201 });
  } catch (error) {
    console.error("MFIT prescription upload failed", error);
    return NextResponse.json({ error: "Could not submit your prescription. Please try again." }, { status: 500 });
  }
}
