import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

async function signedReports(db: any, reports: Array<{report_title:string;storage_path:string;uploaded_at:string}>) {
  return Promise.all(reports.map(async (report) => {
    const { data } = await db.storage.from("mfit-private-reports").createSignedUrl(report.storage_path, 300);
    return { title: report.report_title, uploadedAt: report.uploaded_at, url: data?.signedUrl || null };
  }));
}

export async function POST(request: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !service) return NextResponse.json({ error: "Order lookup unavailable." }, { status: 503 });

    const body = await request.json();
    const reference = String(body?.reference || "").trim().toUpperCase();
    const phone = String(body?.phone || "").replace(/\D/g, "").slice(-10);
    if (!/^MFIT-[A-F0-9]{10}$/.test(reference) || !/^[6-9]\d{9}$/.test(phone)) {
      return NextResponse.json({ error: "Enter the MFIT booking reference and registered 10-digit mobile number." }, { status: 400 });
    }

    const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });

    const { data: requestBooking, error: requestError } = await db
      .from("health_booking_requests")
      .select("id,reference,selected_items,preferred_date,preferred_slot,status,sample_status,coupon_code,created_at,collection_partner_id,partner_b2b_payment_status")
      .eq("reference", reference)
      .eq("customer_phone", phone)
      .maybeSingle();
    if (requestError) throw requestError;

    if (requestBooking) {
      const { data: reports, error: reportError } = await db
        .from("health_booking_request_reports")
        .select("report_title,storage_path,uploaded_at")
        .eq("request_id", requestBooking.id)
        .eq("visible_to_customer", true)
        .order("uploaded_at", { ascending: false });
      if (reportError) throw reportError;

      const partnerPaymentClear = !requestBooking.collection_partner_id || requestBooking.partner_b2b_payment_status === "paid";
      const customerReports = partnerPaymentClear ? await signedReports(db, reports || []) : [];
      return NextResponse.json({
        request: {
          reference: requestBooking.reference,
          selected_items: requestBooking.selected_items,
          preferred_date: requestBooking.preferred_date,
          preferred_slot: requestBooking.preferred_slot,
          status: requestBooking.status,
          sample_status: requestBooking.sample_status,
          coupon_code: requestBooking.coupon_code,
          created_at: requestBooking.created_at,
          payment_status: null,
          total_amount: null,
          reports: customerReports.filter((report) => report.url),
          reportLockedReason: requestBooking.collection_partner_id && !partnerPaymentClear
            ? "Report access is locked until the collection partner's payment to MFIT is fully settled. MFIT Admin approval is also required before a report becomes available."
            : null
        }
      });
    }

    const { data: order, error: orderError } = await db
      .from("health_orders")
      .select("id,order_number,items,collection_date,collection_slot,booking_status,payment_status,total_amount,currency,sample_status,fulfilment_status,created_at")
      .eq("order_number", reference)
      .eq("customer_phone", phone)
      .maybeSingle();
    if (orderError) throw orderError;
    if (!order) return NextResponse.json({ error: "No booking or order found for this reference and mobile number." }, { status: 404 });

    const { data: orderReports, error: orderReportError } = await db
      .from("health_reports")
      .select("report_title,storage_path,uploaded_at")
      .eq("order_id", order.id)
      .eq("visible_to_customer", true)
      .order("uploaded_at", { ascending: false });
    if (orderReportError) throw orderReportError;

    const paymentClear = order.payment_status === "paid";
    const customerReports = paymentClear ? await signedReports(db, orderReports || []) : [];
    const items = Array.isArray(order.items) ? order.items : [];

    return NextResponse.json({
      request: {
        reference: order.order_number,
        selected_items: items.map((item: any) => ({ title: String(item.title || item.slug || "Diagnostic service"), type: String(item.item_type || "test") })),
        preferred_date: order.collection_date,
        preferred_slot: order.collection_slot,
        status: order.booking_status,
        sample_status: order.sample_status,
        coupon_code: null,
        created_at: order.created_at,
        payment_status: order.payment_status,
        total_amount: order.total_amount,
        currency: order.currency,
        fulfilment_status: order.fulfilment_status,
        reports: customerReports.filter((report) => report.url),
        reportLockedReason: !paymentClear
          ? "Report access remains locked until Cashfree confirms the customer payment and MFIT Admin approves the report."
          : null
      }
    });
  } catch (error) {
    console.error("MFIT order lookup", error);
    return NextResponse.json({ error: "Unable to look up this booking. Please try again." }, { status: 500 });
  }
}
