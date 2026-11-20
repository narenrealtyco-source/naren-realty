import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

export async function POST(request: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !service) return NextResponse.json({ error: "Booking request service is not configured." }, { status: 503 });
    const body = await request.json();
    const customer = body?.customer || {};
    const patient = body?.patient || {};
    const lines = Array.isArray(body?.items) ? body.items : [];
    const name = String(customer.name || "").trim();
    const phone = String(customer.phone || "").replace(/\D/g, "").slice(-10);
    const email = String(customer.email || "").trim();
    const pincode = String(customer.pincode || "").replace(/\D/g, "").slice(0, 6);
    const address = String(customer.address || "").trim();
    const patientName = String(patient.name || name).trim();
    const preferredDate = String(body?.preferredDate || "");
    const preferredSlot = String(body?.preferredSlot || "").trim();
    if (name.length < 2 || !/^[6-9]\d{9}$/.test(phone) || !/^[1-9]\d{5}$/.test(pincode) || address.length < 8 || lines.length < 1 || lines.length > 10 || !patientName || !preferredDate || !preferredSlot) {
      return NextResponse.json({ error: "Please complete contact, address, patient and preferred collection details." }, { status: 400 });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    const date = new Date(preferredDate + "T00:00:00+05:30");
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0,10) !== preferredDate) return NextResponse.json({ error: "Please select a valid collection date." }, { status: 400 });
    if (lines.some((x:any) => typeof x.slug !== "string" || !Number.isInteger(x.quantity) || x.quantity !== 1) || new Set(lines.map((x:any)=>x.slug)).size !== lines.length) {
      return NextResponse.json({ error: "Invalid selected items." }, { status: 400 });
    }

    const supabase = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    const slugs = lines.map((x:any)=>x.slug);
    const { data: catalog, error: catalogError } = await supabase.from("health_catalog_items")
      .select("id,slug,item_type,title,category,description,inclusions,sample_type,preparation,report_tat,price,mrp,is_active,provider_verified")
      .in("slug", slugs);
    if (catalogError) throw catalogError;
    if (!catalog || catalog.length !== slugs.length) return NextResponse.json({ error: "One or more selected tests or packages could not be found. Please refresh and try again." }, { status: 404 });

    const { data: packageMappings } = await supabase.from("health_package_test_items").select("package_id,test_id,mapping_status").in("package_id",catalog.map((x:any)=>x.id));
    const catalogById = new Map(catalog.map((x:any)=>[x.id,x]));
    const packageTests = new Map<string,Array<{slug:string;title:string;mappingStatus:string}>>();
    for (const mapping of packageMappings || []) { const test:any = catalogById.get(mapping.test_id); if(test) (packageTests.get(mapping.package_id) || (packageTests.set(mapping.package_id,[]),packageTests.get(mapping.package_id)!)).push({slug:test.slug,title:test.title,mappingStatus:mapping.mapping_status}); }

    let subtotal: number | null = null;
    let couponDiscount = 0;
    let familyDiscount = 0;
    let couponCode: string | null = String(body?.couponCode || "").trim().toUpperCase() || null;
    const allPricedAndVerified = catalog.every((item:any)=>item.is_active && item.price !== null);
    if (allPricedAndVerified) {
      subtotal = Number(catalog.reduce((sum:number,item:any)=>sum + Number(item.price),0).toFixed(2));
      if (String(patient.relation || "Self") !== "Self") {
        const {data:rule}=await supabase.from("health_discount_rules").select("*").eq("rule_key","family_member").eq("is_active",true).maybeSingle();
        const now=Date.now();
        if(rule && (!rule.valid_from||new Date(rule.valid_from).getTime()<=now) && (!rule.valid_until||new Date(rule.valid_until).getTime()>=now)) {
          const rawFamily=subtotal*Number(rule.discount_value)/100;
          familyDiscount=Number(Math.min(rawFamily,rule.max_discount==null?rawFamily:Number(rule.max_discount),subtotal).toFixed(2));
        }
      }
      if (couponCode) {
        const { data: coupon, error: couponError } = await supabase.from("health_coupons").select("*").eq("code",couponCode).eq("is_active",true).maybeSingle();
        if (couponError) throw couponError;
        const now = Date.now();
        const couponValid = coupon && (!coupon.valid_from || new Date(coupon.valid_from).getTime() <= now) && (!coupon.valid_until || new Date(coupon.valid_until).getTime() >= now) && (!coupon.usage_limit || coupon.usage_count < coupon.usage_limit) && subtotal >= Number(coupon.min_order_amount || 0) && catalog.every((item:any)=>coupon.applicable_item_types.includes(item.item_type));
        if (!couponValid) return NextResponse.json({ error: "This coupon is invalid or not applicable to the selected items." }, { status: 400 });
        const raw = coupon.discount_type === "percentage" ? subtotal * Number(coupon.discount_value) / 100 : Number(coupon.discount_value);
        couponDiscount = Number(Math.min(raw, coupon.max_discount == null ? raw : Number(coupon.max_discount), subtotal).toFixed(2));
      }
    } else if (couponCode) {
      const { data: coupon } = await supabase.from("health_coupons").select("code,is_active").eq("code",couponCode).maybeSingle();
      if (!coupon?.is_active) return NextResponse.json({ error: "Coupon is not currently available. Please check the code." }, { status: 400 });
    }

    const snapshots = catalog.map((item:any)=>({
      slug:item.slug,title:item.title,type:item.item_type,category:item.category,
      inclusions:item.inclusions || [],package_tests:(packageTests.get(item.id) || []),
      price:item.price === null ? null : Number(item.price),
      provider_verified:item.provider_verified,is_active:item.is_active
    }));
    const reference = "MFIT-" + randomUUID().replace(/-/g,"").slice(0,10).toUpperCase();
    const { error: insertError } = await supabase.from("health_booking_requests").insert({
      reference,customer_name:name,customer_phone:phone,customer_email:email || null,
      pincode,address,selected_items:snapshots,
      patient_details:{name:patientName,relation:String(patient.relation || "Self"),age:patient.age ? String(patient.age).slice(0,3) : null,gender:String(patient.gender || "")},
      coupon_code:couponCode,coupon_discount:couponDiscount,family_discount:familyDiscount,
      preferred_date:preferredDate,preferred_slot:preferredSlot,status:"pending_confirmation"
    });
    if (insertError) throw insertError;
    return NextResponse.json({
      success:true,reference,status:"pending_confirmation",
      quoteAvailable:subtotal !== null,subtotal,discount:couponDiscount,familyDiscount,total:subtotal === null ? null : Number((subtotal-couponDiscount-familyDiscount).toFixed(2)),
      message:"Your request has been received. MFIT will confirm collection availability and the selected test panel before confirming your booking."
    }, { status: 201 });
  } catch (error) {
    console.error("MFIT booking request error",error);
    return NextResponse.json({ error:"We could not submit your request. Please try again." }, { status:500 });
  }
}
