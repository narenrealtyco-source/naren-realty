import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {randomUUID} from "node:crypto";
export async function POST(req:NextRequest){
 try{
  const body=await req.json();const slug=String(body.partner||"");const lines=Array.isArray(body.items)?body.items:[];
  const c=body.customer||{};const name=String(c.name||"").trim();const phone=String(c.phone||"").replace(/\D/g,"").slice(-10);const email=String(c.email||"").trim();const pincode=String(c.pincode||"").replace(/\D/g,"").slice(0,6);const address=String(c.address||"").trim();const preferredDate=String(body.date||"");const preferredSlot=String(body.slot||"").trim();
  if(!slug||name.length<2||! /^[6-9]\d{9}$/.test(phone)||! /^[1-9]\d{5}$/.test(pincode)||address.length<8||!preferredDate||!preferredSlot||!lines.length||lines.length>10)return NextResponse.json({error:"Please complete all booking details."},{status:400});
  if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return NextResponse.json({error:"Invalid email."},{status:400});
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!key)return NextResponse.json({error:"Booking unavailable."},{status:503});
  const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,key,{auth:{persistSession:false}});
  const {data:p}=await db.from("health_collection_partners").select("id,display_name").eq("public_slug",slug).eq("is_active",true).single();if(!p)return NextResponse.json({error:"Partner link inactive."},{status:404});
  const slugs=lines.map((x:any)=>String(x.slug||""));if(lines.some((x:any)=>x.quantity!==1)||new Set(slugs).size!==slugs.length)return NextResponse.json({error:"Invalid selection."},{status:400});
  const {data:rates}=await db.from("health_collection_partner_rates").select("catalog_item_id,b2b_price,customer_price,catalog:health_catalog_items(id,slug,title,item_type,category,inclusions,sample_type,preparation,report_tat,is_active)").eq("partner_id",p.id).eq("is_active",true);
  const chosen=(rates||[]).filter((r:any)=>slugs.includes(r.catalog?.slug)&&r.catalog?.is_active);
  if(chosen.length!==slugs.length||chosen.some((r:any)=>r.customer_price===null))return NextResponse.json({error:"Selected package is currently unavailable."},{status:409});
  const items=chosen.map((r:any)=>({slug:r.catalog.slug,title:r.catalog.title,type:r.catalog.item_type,category:r.catalog.category,inclusions:r.catalog.inclusions||[],sample_type:r.catalog.sample_type,preparation:r.catalog.preparation,report_tat:r.catalog.report_tat,price:Number(r.customer_price),quantity:1}));
  const customerAmount=Number(items.reduce((s:number,x:any)=>s+x.price,0).toFixed(2));const b2bAmount=Number(chosen.reduce((s:number,r:any)=>s+Number(r.b2b_price),0).toFixed(2));
  const reference="CP-"+randomUUID().replace(/-/g,"").slice(0,10).toUpperCase();
  const {data:created,error}=await db.from("health_booking_requests").insert({reference,partner_reference:reference,collection_partner_id:p.id,customer_name:name,customer_phone:phone,customer_email:email||null,pincode,address,selected_items:items,patient_details:{name,relation:"Self"},preferred_date:preferredDate,preferred_slot:preferredSlot,status:"pending_confirmation",partner_customer_amount:customerAmount,partner_customer_payment_status:"not_recorded",partner_b2b_amount:b2bAmount,partner_b2b_payment_status:"unpaid"}).select("id,reference").single();
  if(error)throw error;
  return NextResponse.json({success:true,reference:created.reference,partner:p.display_name,amount:customerAmount,message:"Your request has been received. Your collection partner will confirm the visit."},{status:201});
 }catch(e){console.error("Collection partner booking error",e);return NextResponse.json({error:"Could not submit booking. Please try again."},{status:500});}
}
