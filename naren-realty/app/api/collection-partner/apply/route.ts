import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const contact_name = String(body.contact_name || "").trim();
    const phone = String(body.phone || "").replace(/\D/g, "");
    const email = String(body.email || "").trim().toLowerCase();
    const address = String(body.address || "").trim();
    const agreementAccepted = body.agreement_accepted === true || body.agreement_accepted === "on" || body.agreement_accepted === "true";
    const agreementVersion = "MFIT-COLLECTION-PARTNER-2026-01";
    const rawAreas = Array.isArray(body.service_areas) ? body.service_areas : String(body.service_areas || "").split(",");
    const service_areas = Array.from(new Set(rawAreas.map((area: unknown) => String(area).trim().replace(/\s+/g, " ")).filter(Boolean)));

    if (contact_name.length < 2 || !/^[6-9]\d{9}$/.test(phone) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || address.length < 8 || !service_areas.length) {
      return NextResponse.json({ error: "Please enter valid contact name, mobile, email, address and at least one service area." }, { status: 400 });
    }

    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!key || !supabaseUrl) return NextResponse.json({ error: "Application service is temporarily unavailable." }, { status: 503 });

    const db = createClient(supabaseUrl, key, { auth: { persistSession: false } });
    const { data: existing, error: lookupError } = await db.from("health_collection_partner_applications").select("id").eq("email", email).in("status", ["pending_review", "approved"]).maybeSingle();
    if (lookupError) throw lookupError;
    if (existing) return NextResponse.json({ error: "An active application already exists for this email." }, { status: 409 });

    const { data, error } = await db.from("health_collection_partner_applications").insert({
      business_name: null, contact_name, phone, email, address, service_areas,
      gstin: String(body.gstin || "").trim() || null,
      pan: String(body.pan || "").trim().toUpperCase() || null,
      notes: String(body.notes || "").trim() || null,
      agreement_accepted: true,
      agreement_version: agreementVersion,
      agreement_accepted_at: new Date().toISOString(),
    }).select("id").single();
    if (error || !data) throw error || new Error("Application could not be saved.");

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.MFIT_RESEND_FROM_EMAIL;
    if (!apiKey || !from) return NextResponse.json({ success: true, application_id: data.id, email_sent: false, message: "Your application was received. Email confirmation is temporarily unavailable; our team will contact you." });

    const safeName = contact_name.replace(/[&<>"]/g, "");
    const mail = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [email], subject: "MFIT Healthcare – Collection Partner Application Received", html: `<p>Dear ${safeName},</p><p>We have received your collection partner application for <b>MFIT Healthcare</b>. Our records show acceptance of Collection Partner Agreement version ${agreementVersion}.</p><p>Application reference: <b>${data.id}</b></p><p>Our team will review your details. Partner login credentials will be shared only after successful verification and approval.</p><p>Regards,<br>MFIT Healthcare</p>` }),
    });
    if (!mail.ok) {
      console.error("Partner application acknowledgement email failed", await mail.text());
      return NextResponse.json({ success: true, application_id: data.id, email_sent: false, message: "Your application was received. Email confirmation could not be sent; our team will contact you." });
    }
    return NextResponse.json({ success: true, application_id: data.id, email_sent: true });
  } catch (error) {
    console.error("Partner application submission failed", error);
    return NextResponse.json({ error: "Could not submit your application. Please try again." }, { status: 500 });
  }
}
