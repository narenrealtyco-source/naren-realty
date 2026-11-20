import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "node:crypto";

export async function POST(request: NextRequest) {
  const secret = process.env.CASHFREE_SECRET_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || !supabaseUrl || !serviceKey) return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });

  const rawBody = await request.text();
  const timestamp = request.headers.get("x-webhook-timestamp") || "";
  const signature = request.headers.get("x-webhook-signature") || "";
  if (!timestamp || !signature) return NextResponse.json({ error: "Missing signature headers." }, { status: 400 });

  const expected = createHmac("sha256", secret).update(timestamp + rawBody).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });

  try {
    const payload = JSON.parse(rawBody);
    const orderId = payload?.data?.order?.order_id || payload?.data?.order?.orderId;
    const payment = payload?.data?.payment || {};
    const paymentStatus = payment.payment_status;
    if (!orderId) return NextResponse.json({ received: true, ignored: true });

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: order } = await supabase.from("health_orders").select("id,payment_status").eq("cashfree_order_id", orderId).maybeSingle();
    if (!order) return NextResponse.json({ received: true, unmatched: true });

    await supabase.from("health_payment_events").insert({
      order_id: order.id,
      gateway: "cashfree",
      event_type: String(payload?.type || "PAYMENT_EVENT"),
      gateway_event_id: payment.cf_payment_id ? String(payment.cf_payment_id) : null,
      payload,
      processed: true
    });

    if (paymentStatus === "SUCCESS" && order.payment_status !== "paid") {
      const { error } = await supabase.from("health_orders").update({
        payment_status: "paid",
        booking_status: "confirmed",
        cashfree_payment_id: payment.cf_payment_id ? String(payment.cf_payment_id) : null,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).eq("id", order.id).neq("payment_status", "paid");
      if (error) throw error;
    } else if (paymentStatus === "FAILED" && order.payment_status === "pending") {
      await supabase.from("health_orders").update({
        payment_status: "failed",
        booking_status: "failed",
        updated_at: new Date().toISOString()
      }).eq("id", order.id).eq("payment_status", "pending");
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("MFIT Cashfree webhook error", error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
