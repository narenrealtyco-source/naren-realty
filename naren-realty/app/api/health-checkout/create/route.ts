import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

type CartLine = { slug: string; quantity: number };

export async function POST(request: NextRequest) {
  try {
    if (process.env.HEALTH_CHECKOUT_ENABLED !== "true") {
      return NextResponse.json({ error: "Online booking is being configured. Please enquire with MFIT Healthcare." }, { status: 503 });
    }
    const appId = process.env.CASHFREE_APP_ID;
    const secret = process.env.CASHFREE_SECRET_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!appId || !secret || !supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Payment service is not configured." }, { status: 503 });
    }

    const body = await request.json();
    const customer = body?.customer || {};
    const lines: CartLine[] = Array.isArray(body?.items) ? body.items : [];
    const name = String(customer.name || "").trim();
    const phone = String(customer.phone || "").replace(/\D/g, "").slice(-10);
    const email = String(customer.email || "").trim();
    const pincode = String(customer.pincode || "").replace(/\D/g, "").slice(0, 6);
    const address = String(customer.address || "").trim();
    if (name.length < 2 || phone.length !== 10 || !/^[6-9]\d{9}$/.test(phone) || !/^[1-9]\d{5}$/.test(pincode) || lines.length < 1 || lines.length > 10) {
      return NextResponse.json({ error: "Please enter a valid name, 10-digit mobile, pincode and cart." }, { status: 400 });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const slugs = [...new Set(lines.map(x => String(x.slug || "")))];
    if (slugs.length !== lines.length || lines.some(x => !Number.isInteger(x.quantity) || x.quantity < 1 || x.quantity > 5)) {
      return NextResponse.json({ error: "Invalid cart items." }, { status: 400 });
    }
    const { data: catalog, error: catalogError } = await supabase.from("health_catalog_items")
      .select("slug,title,price,is_active,provider_verified").in("slug", slugs);
    if (catalogError) throw catalogError;
    if (!catalog || catalog.length !== slugs.length || catalog.some(x => !x.is_active || !x.provider_verified || x.price === null)) {
      return NextResponse.json({ error: "One or more items are not yet available for online booking. Please enquire for confirmed rates." }, { status: 409 });
    }

    const itemMap = new Map(catalog.map(x => [x.slug, x]));
    const orderItems = lines.map(line => {
      const item = itemMap.get(line.slug)!;
      return { slug: item.slug, title: item.title, quantity: line.quantity, unit_price: Number(item.price), line_total: Number(item.price) * line.quantity };
    });
    const total = Number(orderItems.reduce((sum, item) => sum + item.line_total, 0).toFixed(2));
    if (!Number.isFinite(total) || total < 1 || total > 100000) {
      return NextResponse.json({ error: "Order amount is outside the permitted range." }, { status: 400 });
    }

    const orderId = "mfit_" + randomUUID().replace(/-/g, "").slice(0, 24);
    const isProduction = process.env.CASHFREE_ENV === "production";
    const apiBase = isProduction ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg";
    const origin = request.headers.get("origin") || "https://narenrealty.co";
    const cashfreeResponse = await fetch(apiBase + "/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-version": "2023-08-01",
        "x-client-id": appId,
        "x-client-secret": secret,
        "x-request-id": randomUUID()
      },
      body: JSON.stringify({
        order_id: orderId,
        order_amount: total,
        order_currency: "INR",
        customer_details: { customer_id: "mfit_" + phone, customer_name: name, customer_email: email || undefined, customer_phone: phone },
        order_meta: { return_url: origin + "/health-checkup/payment-return?order_id=" + orderId, notify_url: origin + "/api/health-checkout/webhook" },
        order_note: "MFIT Healthcare diagnostics booking"
      }),
      cache: "no-store"
    });
    const cashfree = await cashfreeResponse.json();
    if (!cashfreeResponse.ok || !cashfree.payment_session_id) {
      return NextResponse.json({ error: "Cashfree could not create the payment session.", details: cashfree.message || cashfree.type || "Gateway error" }, { status: 502 });
    }

    const { error: insertError } = await supabase.from("health_orders").insert({
      order_number: orderId,
      customer_name: name,
      customer_phone: phone,
      customer_email: email || null,
      pincode,
      address: address || null,
      items: orderItems,
      subtotal: total,
      total_amount: total,
      currency: "INR",
      booking_status: "payment_pending",
      payment_status: "pending",
      payment_gateway: "cashfree",
      cashfree_order_id: orderId,
      cashfree_payment_session_id: cashfree.payment_session_id
    });
    if (insertError) throw insertError;

    return NextResponse.json({ orderId, paymentSessionId: cashfree.payment_session_id, environment: isProduction ? "production" : "sandbox" });
  } catch (error) {
    console.error("MFIT checkout error", error);
    return NextResponse.json({ error: "Unable to start checkout. Please try again or contact MFIT Healthcare." }, { status: 500 });
  }
}
