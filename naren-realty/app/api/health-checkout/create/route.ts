import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

type CartLine = { slug: string; quantity: number };

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export async function POST(request: NextRequest) {
  try {
    if (process.env.HEALTH_CHECKOUT_ENABLED !== "true") {
      return NextResponse.json({ error: "Online payment is not enabled yet. Please submit a booking request." }, { status: 503 });
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
    const patient = body?.patient || {};
    const lines: CartLine[] = Array.isArray(body?.items) ? body.items : [];
    const name = String(customer.name || "").trim();
    const phone = String(customer.phone || "").replace(/\D/g, "").slice(-10);
    const email = String(customer.email || "").trim();
    const pincode = String(customer.pincode || "").replace(/\D/g, "").slice(0, 6);
    const address = String(customer.address || "").trim();
    const patientName = String(patient.name || name).trim();
    const relation = String(patient.relation || "Self").trim();
    const preferredDate = String(body?.preferredDate || "");
    const preferredSlot = String(body?.preferredSlot || "").trim();
    const couponCode = String(body?.couponCode || "").trim().toUpperCase() || null;

    if (
      name.length < 2 ||
      !/^[6-9]\d{9}$/.test(phone) ||
      !/^[1-9]\d{5}$/.test(pincode) ||
      address.length < 8 ||
      patientName.length < 2 ||
      !isValidDate(preferredDate) ||
      !preferredSlot ||
      lines.length < 1 ||
      lines.length > 10
    ) {
      return NextResponse.json({ error: "Please complete valid contact, patient, address and collection details." }, { status: 400 });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    if (lines.some((line) => typeof line.slug !== "string" || !Number.isInteger(line.quantity) || line.quantity !== 1) ||
      new Set(lines.map((line) => line.slug)).size !== lines.length) {
      return NextResponse.json({ error: "Invalid cart items." }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const slugs = lines.map((line) => line.slug);
    const { data: catalog, error: catalogError } = await supabase
      .from("health_catalog_items")
      .select("id,slug,item_type,title,price,is_active,provider_verified")
      .in("slug", slugs);
    if (catalogError) throw catalogError;
    if (!catalog || catalog.length !== slugs.length) {
      return NextResponse.json({ error: "One or more selected items are unavailable." }, { status: 404 });
    }
    if (catalog.some((item) => !item.is_active || !item.provider_verified || item.price === null)) {
      return NextResponse.json({ error: "MFIT has not yet verified the price and performing laboratory for one or more selected items. Please submit a booking request instead; no payment has been taken." }, { status: 409 });
    }

    const subtotal = Number(catalog.reduce((sum, item) => sum + Number(item.price), 0).toFixed(2));
    if (!Number.isFinite(subtotal) || subtotal < 1 || subtotal > 100000) {
      return NextResponse.json({ error: "Order amount is outside the permitted range." }, { status: 400 });
    }

    let familyDiscount = 0;
    if (relation && relation !== "Self") {
      const { data: rule, error: ruleError } = await supabase.from("health_discount_rules")
        .select("*").eq("rule_key", "family_member").eq("is_active", true).maybeSingle();
      if (ruleError) throw ruleError;
      const now = Date.now();
      if (rule && (!rule.valid_from || new Date(rule.valid_from).getTime() <= now) &&
        (!rule.valid_until || new Date(rule.valid_until).getTime() >= now)) {
        const raw = subtotal * Number(rule.discount_value) / 100;
        familyDiscount = Number(Math.min(raw, rule.max_discount == null ? raw : Number(rule.max_discount), subtotal).toFixed(2));
      }
    }

    let couponDiscount = 0;
    if (couponCode) {
      if (!/^[A-Z0-9_-]{3,30}$/.test(couponCode)) {
        return NextResponse.json({ error: "Invalid coupon code." }, { status: 400 });
      }
      const { data: coupon, error: couponError } = await supabase.from("health_coupons")
        .select("*").eq("code", couponCode).eq("is_active", true).maybeSingle();
      if (couponError) throw couponError;
      const now = Date.now();
      const valid = coupon &&
        (!coupon.valid_from || new Date(coupon.valid_from).getTime() <= now) &&
        (!coupon.valid_until || new Date(coupon.valid_until).getTime() >= now) &&
        (!coupon.usage_limit || coupon.usage_count < coupon.usage_limit) &&
        subtotal >= Number(coupon.min_order_amount || 0) &&
        catalog.every((item) => coupon.applicable_item_types.includes(item.item_type));
      if (!valid) return NextResponse.json({ error: "This coupon is invalid or not applicable to the selected items." }, { status: 400 });
      const raw = coupon.discount_type === "percentage"
        ? subtotal * Number(coupon.discount_value) / 100
        : Number(coupon.discount_value);
      couponDiscount = Number(Math.min(raw, coupon.max_discount == null ? raw : Number(coupon.max_discount), Math.max(0, subtotal - familyDiscount)).toFixed(2));
    }

    const discount = Number((couponDiscount + familyDiscount).toFixed(2));
    const total = Number(Math.max(0, subtotal - discount).toFixed(2));
    if (total < 1) return NextResponse.json({ error: "The payable amount must be at least ₹1." }, { status: 400 });

    const itemMap = new Map(catalog.map((item) => [item.slug, item]));
    const orderItems = lines.map((line) => {
      const item = itemMap.get(line.slug)!;
      return { slug: item.slug, title: item.title, item_type: item.item_type, quantity: 1, unit_price: Number(item.price), line_total: Number(item.price) };
    });

    const orderId = "mfit_" + randomUUID().replace(/-/g, "").slice(0, 24);
    const orderNumber = "MFIT-" + randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();
    const isProduction = process.env.CASHFREE_ENV === "production";
    const apiBase = isProduction ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg";
    const origin = request.nextUrl.origin;
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
        order_meta: {
          return_url: origin + "/health-checkup/payment-return?order_id=" + orderId,
          notify_url: origin + "/api/health-checkout/webhook"
        },
        order_note: "MFIT Healthcare diagnostics booking"
      }),
      cache: "no-store"
    });
    const cashfree = await cashfreeResponse.json();
    if (!cashfreeResponse.ok || !cashfree.payment_session_id) {
      return NextResponse.json({ error: "Cashfree could not create the payment session.", details: cashfree.message || cashfree.type || "Gateway error" }, { status: 502 });
    }

    const { error: insertError } = await supabase.from("health_orders").insert({
      order_number: orderNumber,
      customer_name: name,
      customer_phone: phone,
      customer_email: email || null,
      pincode,
      address,
      items: orderItems,
      subtotal,
      discount,
      coupon_discount: couponDiscount,
      family_discount: familyDiscount,
      coupon_code: couponCode,
      total_amount: total,
      currency: "INR",
      booking_status: "payment_pending",
      payment_status: "pending",
      payment_gateway: "cashfree",
      cashfree_order_id: orderId,
      cashfree_payment_session_id: cashfree.payment_session_id,
      patient_details: {
        name: patientName,
        relation,
        age: patient.age ? String(patient.age).slice(0, 3) : null,
        gender: String(patient.gender || "")
      },
      collection_date: preferredDate,
      collection_slot: preferredSlot
    });
    if (insertError) throw insertError;

    return NextResponse.json({
      orderId,
      orderNumber,
      paymentSessionId: cashfree.payment_session_id,
      environment: isProduction ? "production" : "sandbox",
      amount: total
    });
  } catch (error) {
    console.error("MFIT checkout error", error);
    return NextResponse.json({ error: "Unable to start checkout. Please try again or contact MFIT Healthcare." }, { status: 500 });
  }
}
