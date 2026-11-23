import { NextRequest,NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
export async function POST(request:NextRequest){
 try{
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,service=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!service)return NextResponse.json({error:"Order lookup unavailable."},{status:503});
  const body=await request.json(),reference=String(body?.reference||"").trim().toUpperCase(),phone=String(body?.phone||"").replace(/\D/g,"").slice(-10);
  if(!/^MFIT-[A-Z0-9]{10}$/.test(reference)||!/^([6-9]\d{9})$/.test(phone))return NextResponse.json({error:"Enter the booking reference and registered 10-digit mobile number."},{status:400});
  const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await db.from("health_booking_requests").select("id,reference,selected_items,preferred_date,preferred_slot,status,sample_status,coupon_code,created_at,customer_payable_amount,customer_payment_status,collection_partner_id,partner_b2b_payment_status").eq("reference",reference).eq("customer_phone",phone).maybeSingle();
  if(error)throw error;
  if(!data)return NextResponse.json({error:"No request found for this reference and mobile number."},{status:404});
  const partnerSettlementOk=!data.collection_partner_id||data.partner_b2b_payment_status==="paid";
  const {data:reports}=partnerSettlementOk?await db.from("health_booking_request_reports").select("id,report_title,storage_path,uploaded_at").eq("request_id",data.id).eq("visible_to_customer",true).order("uploaded_at",{ascending:false}):{data:[]};
  const customerReports=await Promise.all((reports||[]).map(async report=>{const {data:signed}=await db.storage.from("mfit-private-reports").createSignedUrl(report.storage_path,300);return {title:report.report_title,uploadedAt:report.uploaded_at,url:signed?.signedUrl||null};}));
  return NextResponse.json({request:{...data,reports:customerReports.filter(x=>x.url)}});
 }catch(error){console.error("MFIT request lookup",error);return NextResponse.json({error:"Unable to look up this request."},{status:500});}
}
