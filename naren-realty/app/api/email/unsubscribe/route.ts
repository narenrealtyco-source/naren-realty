import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "../../../lib/supabase-service";


export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(token)) return new NextResponse("Invalid unsubscribe link.", { status: 400 });
  try {
    const service = createSupabaseServiceClient();
    const { data, error } = await service.from("email_marketing_consents").update({
      consent_status: "unsubscribed", unsubscribed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq("unsubscribe_token", token).select("email").maybeSingle();
    if (error || !data) return new NextResponse("This unsubscribe link is invalid or has already expired.", { status: 404 });
    return new NextResponse("<!doctype html><html><head><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><title>Unsubscribed</title></head><body style=\"font-family:Arial,sans-serif;background:#f8fafc;padding:48px 20px;color:#10243A\"><main style=\"max-width:520px;margin:auto;background:white;padding:32px;border-radius:16px\"><h1>You are unsubscribed</h1><p>You will no longer receive NAREN REALTY marketing emails at this address.</p></main></body></html>", { headers: { "Content-Type": "text/html; charset=utf-8" } });
  } catch { return new NextResponse("Unsubscribe service is temporarily unavailable.", { status: 503 }); }
}
