import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

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
    const bytes = new Uint8Array(await file.arrayBuffer());
    const startsWith = (...signature: number[]) => signature.every((value, index) => bytes[index] === value);
    const validSignature =
      (file.type === "application/pdf" && startsWith(0x25, 0x50, 0x44, 0x46, 0x2d)) ||
      (file.type === "image/jpeg" && startsWith(0xff, 0xd8, 0xff)) ||
      (file.type === "image/png" && startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) ||
      (file.type === "image/webp" && startsWith(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50);
    if (!validSignature) return NextResponse.json({ error: "The selected file does not match its declared PDF or image format." }, { status: 400 });

    const { error: uploadError } = await supabase.storage.from("mfit-prescriptions").upload(storagePath, Buffer.from(bytes), {
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
