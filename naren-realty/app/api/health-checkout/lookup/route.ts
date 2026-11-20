import { NextRequest,NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
export async function POST(request:NextRequest){
 try{
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,service=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!service)return NextResponse.json({error:"Order lookup unavailable."},{status:503});
  const body=await request.json(),reference=String(body?.reference||"").trim().toUpperCase(),phone=String(body?.phone||"").replace(/\D/g,"").slice(-10);
  if(!/^MFIT-[A-F0-9]{10}$/.test(reference)||!/^([6-9]\d{9})$/.test(phone))return NextResponse.json({error:"Enter the booking reference and registered 10-digit mobile number."},{status:400});
  const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await db.from("health_booking_requests").select("reference,selected_items,preferred_date,preferred_slot,status,coupon_code,created_at").eq("reference",reference).eq("customer_phone",phone).maybeSingle();
  if(error)throw error;
  if(!data)return NextResponse.json({error:"No request found for this reference and mobile number."},{status:404});
  return NextResponse.json({request:data});
 }catch(error){console.error("MFIT request lookup",error);return NextResponse.json({error:"Unable to look up this request."},{status:500});}
}
