import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServiceClient } from "../../../lib/supabase-service";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]!));
}

async function notify(
  db: ReturnType<typeof createSupabaseServiceClient>,
  bookingId: string,
  recipientType: "customer" | "organiser",
  recipientEmail: string,
  subject: string,
  html: string,
) {
  const { data: prior } = await db.from("event_booking_email_notifications")
    .select("status").eq("booking_id", bookingId).eq("recipient_type", recipientType).maybeSingle();
  if (prior?.status === "sent") return "sent";
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    await db.from("event_booking_email_notifications").upsert({
      booking_id: bookingId, recipient_type: recipientType, recipient_email: recipientEmail,
      status: "failed", last_error: "Email provider is not configured", attempts: 0, updated_at: new Date().toISOString(),
    }, { onConflict: "booking_id,recipient_type" });
    return "not_configured";
  }
  const { error: logError } = await db.from("event_booking_email_notifications").upsert({
    booking_id: bookingId, recipient_type: recipientType, recipient_email: recipientEmail,
    status: "pending", last_error: null, updated_at: new Date().toISOString(),
  }, { onConflict: "booking_id,recipient_type" });
  if (logError) return "failed";
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [recipientEmail], subject, html }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(typeof result.message === "string" ? result.message : "Email provider rejected the request");
    await db.from("event_booking_email_notifications").update({
      status: "sent", provider_message_id: result.id ?? null, sent_at: new Date().toISOString(),
      attempts: 1, last_error: null, updated_at: new Date().toISOString(),
    }).eq("booking_id", bookingId).eq("recipient_type", recipientType);
    return "sent";
  } catch (error) {
    await db.from("event_booking_email_notifications").update({
      status: "failed", attempts: 1, last_error: error instanceof Error ? error.message.slice(0, 500) : "Email delivery failed",
      updated_at: new Date().toISOString(),
    }).eq("booking_id", bookingId).eq("recipient_type", recipientType);
    return "failed";
  }
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization") ?? "";
  const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!accessToken) return NextResponse.json({ error: "Please sign in to book this event." }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return NextResponse.json({ error: "Booking service is not configured." }, { status: 503 });
  const authClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error: authError } = await authClient.auth.getUser(accessToken);
  if (authError || !user) return NextResponse.json({ error: "Your session has expired. Please sign in again." }, { status: 401 });

  let body: { eventId?: string; quantity?: number; requestKey?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (!body.eventId || !/^[0-9a-f-]{36}$/i.test(body.eventId) || !Number.isInteger(body.quantity) || (body.quantity ?? 0) < 1 || (body.quantity ?? 0) > 20 || !body.requestKey || !/^[0-9a-f-]{36}$/i.test(body.requestKey)) {
    return NextResponse.json({ error: "Please select a valid number of seats." }, { status: 400 });
  }

  const db = createSupabaseServiceClient();
  const { data: event, error: eventError } = await db.from("event_submissions")
    .select("id,title,starts_at,venue,locality,event_mode,location_status,venue_address,organizer_name,contact_email,submitted_by,ticket_price")
    .eq("id", body.eventId).eq("status", "approved").maybeSingle();
  if (eventError || !event) return NextResponse.json({ error: "Event not found." }, { status: 404 });
  if (Number(event.ticket_price) > 0) return NextResponse.json({ error: "Paid online booking is temporarily on hold. Please check back later." }, { status: 409 });
  const { data: organiserUser } = await db.auth.admin.getUserById(event.submitted_by);
  const organiserEmail = event.contact_email || organiserUser.user?.email || "";
  const customerEmail = user.email || "";
  if (!customerEmail || !organiserEmail) {
    return NextResponse.json({ error: "A valid email address is required for both attendee and organiser booking confirmations. Please contact NAREN REALTY." }, { status: 422 });
  }

  const { data: booking, error: bookingError } = await db.rpc("create_event_booking", {
    p_event_id: body.eventId, p_quantity: body.quantity, p_razorpay_order_id: null, p_request_key: body.requestKey,
  });
  if (bookingError) {
    const message = bookingError.message.includes("Not enough seats") ? "Sorry, those seats are no longer available." :
      bookingError.message.includes("closed") || bookingError.message.includes("deadline") ? bookingError.message :
      bookingError.message.includes("temporarily unavailable") ? bookingError.message : "We could not complete your booking. Please try again.";
    return NextResponse.json({ error: message }, { status: 409 });
  }

  const code = String(booking.booking_code);
  const title = escapeHtml(event.title);
  const name = escapeHtml(user.user_metadata?.full_name || user.email || "Attendee");
  const venue = escapeHtml(event.event_mode === "online" ? "Online event" : [event.venue, event.locality].filter(Boolean).join(", "));
  const date = new Date(event.starts_at).toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Kolkata" });
  const common = `<div style="font-family:Arial,sans-serif;color:#10243A;max-width:600px;margin:auto"><h2 style="color:#10243A">NAREN <span style="color:#D99A00">REALTY</span></h2><h1>Booking confirmed</h1><p>Your booking for <strong>${title}</strong> is confirmed.</p><p><strong>Booking ID:</strong> ${escapeHtml(code)}<br/><strong>Attendees:</strong> ${Number(booking.quantity)}<br/><strong>Event date:</strong> ${escapeHtml(date)}<br/><strong>Location:</strong> ${venue}<br/><strong>Amount:</strong> Free</p><p>Please keep this booking ID for entry and future communication.</p><p>Regards,<br/>NAREN REALTY</p></div>`;
  const customerHtml = common.replace("Your booking for", `Hello ${name}, your booking for`);
  const organiserHtml = common.replace("Booking confirmed</h1>", "New attendee booking</h1>").replace("Your booking for", `A new booking has been received for`).replace("<p>Please keep this booking ID for entry and future communication.</p>", `<p>Attendee: ${name}<br/>Attendee email: ${escapeHtml(customerEmail)}</p>`);
  const [customerMail, organiserMail] = await Promise.all([
    notify(db, String(booking.booking_id), "customer", customerEmail, `Booking confirmed: ${event.title}`, customerHtml),
    notify(db, String(booking.booking_id), "organiser", organiserEmail, `New booking received: ${event.title}`, organiserHtml),
  ]);
  return NextResponse.json({
    ok: true, booking,
    notifications: { customer: customerMail, organiser: organiserMail },
    message: "Your free event booking is confirmed.",
  }, { status: 201 });
}
