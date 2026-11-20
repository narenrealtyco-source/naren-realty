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
  const {data:p}=await db.from("health_collection_partners").select("id,display_name").eq("public_slug",slug).eq("is_active",true).single();if(!p)return NextResponse.json({error:"Partner link inactive."},{status:404});const {data:internalLab}=await db.from("health_lab_partners").select("id").eq("is_internal",true).single();if(!internalLab)return NextResponse.json({error:"Lab processing is not configured. Please contact the partner."},{status:503});
  const slugs=lines.map((x:any)=>String(x.slug||""));if(lines.some((x:any)=>x.quantity!==1)||new Set(slugs).size!==slugs.length)return NextResponse.json({error:"Invalid selection."},{status:400});
  const [{data:catalog},{data:rates}]=await Promise.all([
   db.from("health_catalog_items").select("id,slug,title,item_type,category,inclusions,sample_type,preparation,report_tat,price,is_active").in("slug",slugs).eq("is_active",true).in("item_type",["package","test"]),
   db.from("health_collection_partner_rates").select("catalog_item_id,b2b_price,customer_price").eq("partner_id",p.id).eq("is_active",true)
  ]);
  const rateMap=new Map((rates||[]).map((r:any)=>[r.catalog_item_id,r]));
  const chosen=(catalog||[]).filter((x:any)=>slugs.includes(x.slug));
  if(chosen.length!==slugs.length)return NextResponse.json({error:"One or more selected items are no longer available."},{status:409});
  const items=chosen.map((x:any)=>{const r:any=rateMap.get(x.id);const retail=r?.customer_price??x.price;const b2b=r?.b2b_price??x.price;return {slug:x.slug,title:x.title,type:x.item_type,category:x.category,inclusions:x.inclusions||[],sample_type:x.sample_type,preparation:x.preparation,report_tat:x.report_tat,mrp_price:x.price===null?null:Number(x.price),customer_price:retail===null?null:Number(retail),b2b_price:b2b===null?null:Number(b2b),price:retail===null?null:Number(retail),quantity:1};});
  if(items.some((x:any)=>x.customer_price===null||!Number.isFinite(x.customer_price)||x.customer_price<0||x.b2b_price===null||!Number.isFinite(x.b2b_price)||x.b2b_price<0))return NextResponse.json({error:"Price is not configured for a selected item."},{status:409});
  const customerAmount=Number(items.reduce((s:number,x:any)=>s+Number(x.customer_price),0).toFixed(2));const b2bAmount=Number(items.reduce((s:number,x:any)=>s+Number(x.b2b_price),0).toFixed(2));
  const reference="CP-"+randomUUID().replace(/-/g,"").slice(0,10).toUpperCase();
  const {data:created,error}=await db.from("health_booking_requests").insert({reference,partner_reference:reference,collection_partner_id:p.id,lab_partner_id:internalLab.id,customer_name:name,customer_phone:phone,customer_email:email||null,pincode,address,selected_items:items,patient_details:{name,relation:"Self"},preferred_date:preferredDate,preferred_slot:preferredSlot,status:"pending_confirmation",partner_customer_amount:customerAmount,partner_customer_payment_status:"not_recorded",partner_b2b_amount:b2bAmount,partner_b2b_payment_status:"unpaid"}).select("id,reference").single();
  if(error)throw error;
  return NextResponse.json({success:true,reference:created.reference,partner:p.display_name,amount:customerAmount,message:"Your request has been received. Your collection partner will confirm the visit."},{status:201});
 }catch(e){console.error("Collection partner booking error",e);return NextResponse.json({error:"Could not submit booking. Please try again."},{status:500});}
}
