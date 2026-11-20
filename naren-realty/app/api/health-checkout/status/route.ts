import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get("order_id") || "";
  if (!/^mfit_[a-f0-9]{24}$/.test(orderId)) return NextResponse.json({error:"Invalid order reference."},{status:400});
  const appId=process.env.CASHFREE_APP_ID;
  const secret=process.env.CASHFREE_SECRET_KEY;
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!appId||!secret||!url||!service) return NextResponse.json({error:"Payment verification is not configured."},{status:503});
  try {
    const base=process.env.CASHFREE_ENV==="production"?"https://api.cashfree.com/pg":"https://sandbox.cashfree.com/pg";
    const response=await fetch(base+"/orders/"+encodeURIComponent(orderId),{headers:{"x-api-version":"2023-08-01","x-client-id":appId,"x-client-secret":secret},cache:"no-store"});
    const gateway=await response.json();
    if(!response.ok) return NextResponse.json({error:"Unable to verify payment with gateway."},{status:502});
    const supabase=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:order,error}=await supabase.from("health_orders").select("id,order_number,payment_status,booking_status,total_amount").eq("cashfree_order_id",orderId).maybeSingle();
    if(error||!order) return NextResponse.json({error:"Booking reference not found."},{status:404});
    if(gateway.order_status==="PAID" && order.payment_status!=="paid") {
      const {error:updateError}=await supabase.from("health_orders").update({payment_status:"paid",booking_status:"confirmed",paid_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",order.id).neq("payment_status","paid");
      if(updateError) throw updateError;
    }
    return NextResponse.json({orderId:order.order_number,status:gateway.order_status==="PAID"?"paid":gateway.order_status==="EXPIRED"?"expired":"pending",amount:order.total_amount});
  } catch(error) {
    console.error("MFIT payment verification error",error);
    return NextResponse.json({error:"Payment verification failed."},{status:500});
  }
}
