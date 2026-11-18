import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../lib/supabase-server";

const allowed = new Set(["page_view", "search", "filter", "click", "form_start", "form_step", "form_submit", "page_exit", "task_complete"]);

function safeEventData(eventName: string, input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const data = input as Record<string, unknown>;
  const safe: Record<string, unknown> = {};
  if (eventName === "page_view" && typeof data.referrer === "string") {
    safe.referrer = data.referrer.replace(/[^a-zA-Z0-9.-]/g, "").slice(0, 100);
  }
  if (["click", "search", "filter"].includes(eventName) && typeof data.element === "string") {
    const element = data.element.toLowerCase();
    if (["a", "button", "input", "select", "textarea"].includes(element)) safe.element = element;
  }
  if (["form_start", "form_step", "form_submit"].includes(eventName)) {
    if (Number.isInteger(data.formIndex) && Number(data.formIndex) >= 0 && Number(data.formIndex) <= 100) safe.formIndex = Number(data.formIndex);
    if (eventName === "form_step" && Number.isInteger(data.stepIndex) && Number(data.stepIndex) >= 0 && Number(data.stepIndex) <= 100) safe.stepIndex = Number(data.stepIndex);
  }
  return safe;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { visitorKey, sessionKey, eventName, pagePath } = body ?? {};
    if (typeof visitorKey !== "string" || visitorKey.length > 80 || typeof sessionKey !== "string" || sessionKey.length > 80 || !allowed.has(eventName) || typeof pagePath !== "string" || !pagePath.startsWith("/") || pagePath.length > 500 || pagePath.includes("?") || pagePath.includes("#")) {
      return NextResponse.json({ error: "Invalid analytics event" }, { status: 400 });
    }
    const safeData = safeEventData(eventName, body?.eventData);
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      const role = String(profile?.role ?? "").toLowerCase();
      if (["admin", "super_admin", "manager", "owner", "broker", "staff"].includes(role)) return new NextResponse(null, { status: 204 });
    }
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
