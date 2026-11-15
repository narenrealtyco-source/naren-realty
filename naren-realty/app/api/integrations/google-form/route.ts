import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Intake = {
  responseId?: string;
  name?: string;
  phone?: string;
  email?: string;
  purpose?: string;
  category?: string;
  location?: string;
  bhk?: number | string | null;
  minBudget?: number | string | null;
  maxBudget?: number | string | null;
  moveInDate?: string | null;
  details?: string | null;
  raw?: Record<string, unknown>;
};

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function numeric(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
function normalizePurpose(value: string): "rent" | "buy" | null {
  const v = value.toLowerCase();
  if (["rent", "rental", "tenant", "lease", "rental flat", "flat on rent", "rent a flat"].includes(v)) return "rent";
  if (["buy", "purchase", "resale", "new", "resale flat", "new flat", "purchase flat", "buy a flat"].includes(v)) return "buy";
  return null;
}

export async function POST(request: NextRequest) {
  const secret = process.env.GOOGLE_FORM_WEBHOOK_SECRET;
  const supplied = request.headers.get("x-naren-webhook-secret") ?? "";
  if (!secret || supplied.length !== secret.length || supplied !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Server integration is not configured" }, { status: 503 });
  }

  let body: Intake;
  try {
    const rawBody = await request.text();
    if (rawBody.length > 64_000) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    body = JSON.parse(rawBody) as Intake;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const responseId = clean(body.responseId, 180);
  const customerName = clean(body.name, 120);
  const customerPhone = clean(body.phone, 20).replace(/[\s()-]/g, "");
  const customerEmail = clean(body.email, 254).toLowerCase();
  const purpose = normalizePurpose(clean(body.purpose, 30));
  const location = clean(body.location, 180);
  const categoryInput = clean(body.category, 40).toLowerCase() || "flat";
  const category = ["flat", "flats", "apartment", "apartments"].includes(categoryInput) ? "flat" : categoryInput;
  const bhk = numeric(body.bhk);
  const minBudget = numeric(body.minBudget);
  const maxBudget = numeric(body.maxBudget);
  const moveInDate = clean(body.moveInDate, 10);
  const details = clean(body.details, 2000);

  if (!responseId || !customerName || !/^(?:[6-9]\d{9}|\+91[6-9]\d{9})$/.test(customerPhone) ||
      !purpose || !location || category !== "flat" || (bhk !== null && (!Number.isInteger(bhk) || bhk > 10)) ||
      (minBudget !== null && maxBudget !== null && minBudget > maxBudget) ||
      (moveInDate && !/^\d{4}-\d{2}-\d{2}$/.test(moveInDate))) {
    return NextResponse.json({ error: "Required fields are missing or invalid" }, { status: 400 });
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: inserted, error } = await supabase
    .from("google_form_property_requirements")
    .upsert({
      response_id: responseId,
      source: "google_form",
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail || null,
      requirement_type: purpose,
      property_category: "flat",
      preferred_location: location,
      preferred_bhk: bhk,
      min_budget: minBudget,
      max_budget: maxBudget,
      move_in_date: moveInDate || null,
      additional_requirements: details || null,
      raw_response: body.raw && typeof body.raw === "object" ? body.raw : {},
      status: "new",
      updated_at: new Date().toISOString(),
    }, { onConflict: "response_id", ignoreDuplicates: true })
    .select("id,response_id")
    .maybeSingle();

  if (error) {
    console.error("[google-form-intake] database insert failed", error.code);
    return NextResponse.json({ error: "Could not save requirement" }, { status: 500 });
  }
  if (!inserted) return NextResponse.json({ ok: true, duplicate: true });

  // Only approved live listings are eligible. A broad location substring match
  // is intentionally conservative; admins can review and adjust the match list.
  const { data: listings, error: listingError } = await supabase
    .from("properties")
    .select("id,category,locality,price,details,status")
    .eq("status", "approved")
    .limit(500);

  let matchedProperties: Array<{ title: string; locality: string | null; price: number | null }> = [];
  if (!listingError && listings) {
    const wanted = location.toLowerCase();
    const matches = listings.filter((listing) => {
      const locality = (listing.locality ?? "").toLowerCase();
      const type = purpose === "rent" ? listing.category.toLowerCase() === "rental" : listing.category.toLowerCase() === "resale";
      const price = Number(listing.price ?? 0);
      const budgetOk = (maxBudget === null || price === 0 || price <= maxBudget) &&
        (minBudget === null || price === 0 || price >= minBudget);
      const bhkText = JSON.stringify(listing.details ?? {}).toLowerCase();
      const bhkOk = bhk === null || bhkText.includes(`${bhk} bhk`) || bhkText.includes(`"${bhk}bhk"`) || bhkText.includes(`"${bhk} bhk"`);
      return type && locality && (locality.includes(wanted) || wanted.includes(locality)) && budgetOk && bhkOk;
    }).slice(0, 20);

    matchedProperties = matches.map((item) => ({ title: item.title, locality: item.locality, price: item.price === null ? null : Number(item.price) }));
    if (matches.length) {
      await supabase.from("google_form_property_requirements").update({
        matched_property_ids: matches.map((item) => item.id),
        match_count: matches.length,
        last_matched_at: new Date().toISOString(),
        status: "matched",
        updated_at: new Date().toISOString(),
      }).eq("id", inserted.id);
    }
  }

  return NextResponse.json({ ok: true, requirementId: inserted.id, matchCount: matchedProperties.length, matches: matchedProperties }, { status: 201 });
}
