import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization") || "";
    const token = authorization.replace(/^Bearer\s+/i, "").trim();
    if (!token) return NextResponse.json({ error: "Sign in to view bookings linked to your MFIT account." }, { status: 401 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !service) return NextResponse.json({ error: "Order history is temporarily unavailable." }, { status: 503 });
    const supabase = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });

    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) return NextResponse.json({ error: "Your customer session has expired. Please sign in again." }, { status: 401 });
    const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", authData.user.id).maybeSingle();
    if (profileError) throw profileError;
    if (!profile || profile.role !== "customer") return NextResponse.json({ error: "A customer account is required to view MFIT bookings." }, { status: 403 });

    const { data: bookings, error } = await supabase.from("health_booking_requests")
      .select("id,reference,selected_items,preferred_date,preferred_slot,status,sample_status,coupon_code,created_at,customer_payable_amount,customer_payment_status,collection_partner_id,partner_b2b_payment_status")
      .eq("customer_id", authData.user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw error;

    const requests = await Promise.all((bookings || []).map(async (booking: any) => {
      const partnerSettlementOk = !booking.collection_partner_id || booking.partner_b2b_payment_status === "paid";
      const { data: reports } = partnerSettlementOk
        ? await supabase.from("health_booking_request_reports").select("report_title,storage_path,uploaded_at").eq("request_id", booking.id).eq("visible_to_customer", true).order("uploaded_at", { ascending: false })
        : { data: [] as any[] };
      const customerReports = await Promise.all((reports || []).map(async (report: any) => {
        const { data: signed } = await supabase.storage.from("mfit-private-reports").createSignedUrl(report.storage_path, 300);
        return { title: report.report_title, uploadedAt: report.uploaded_at, url: signed?.signedUrl || null };
      }));
      return { ...booking, reports: customerReports.filter((report) => report.url) };
    }));

    return NextResponse.json({ requests });
  } catch (error) {
    console.error("MFIT customer order history error", error);
    return NextResponse.json({ error: "Unable to load your MFIT booking history." }, { status: 500 });
  }
}
