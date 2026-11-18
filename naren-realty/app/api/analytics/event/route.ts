import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../lib/supabase-server";

const allowed = new Set(["page_view", "search", "filter", "click", "form_start", "form_step", "form_submit", "page_exit", "task_complete"]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { visitorKey, sessionKey, eventName, pagePath, eventData } = body ?? {};
    if (typeof visitorKey !== "string" || visitorKey.length > 80 || typeof sessionKey !== "string" || sessionKey.length > 80 || !allowed.has(eventName) || typeof pagePath !== "string" || !pagePath.startsWith("/") || pagePath.length > 500) {
      return NextResponse.json({ error: "Invalid analytics event" }, { status: 400 });
    }
    const safeData = eventData && typeof eventData === "object" && !Array.isArray(eventData) ? Object.fromEntries(Object.entries(eventData).filter(([key]) => !/password|otp|phone|mobile|email|pan|aadhaar|address|token|amount/i.test(key)).slice(0, 12)) : {};
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc("track_visitor_event", {
      p_visitor_key: visitorKey,
      p_session_key: sessionKey,
      p_event_name: eventName,
      p_page_path: pagePath,
      p_event_data: safeData,
      p_city: request.headers.get("x-vercel-ip-city"),
      p_region: request.headers.get("x-vercel-ip-country-region"),
      p_country: request.headers.get("x-vercel-ip-country"),
    });
    if (error) return NextResponse.json({ error: "Could not record analytics event" }, { status: 503 });
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
