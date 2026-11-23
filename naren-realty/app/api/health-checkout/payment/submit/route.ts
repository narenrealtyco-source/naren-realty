import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {randomUUID} from "node:crypto";
export async function POST(req:NextRequest){
 try{
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)return NextResponse.json({error:"Payment service is not configured."},{status:503});
  const form=await req.formData(), reference=String(form.get("reference")||"").trim().toUpperCase(), phone=String(form.get("phone")||"").replace(/\\D/g,"").slice(-10), utr=String(form.get("payment_reference")||"").trim(), proof=form.get("proof");
  if(!/^MFIT-[A-Z0-9]{10}$/.test(reference)||!/^\\d{10}$/.test(phone)||utr.length<6||utr.length>100)return NextResponse.json({error:"Enter the booking reference, registered mobile and valid UTR."},{status:400});
  if(!(proof instanceof File)||proof.size<1||proof.size>10*1024*1024||!["image/jpeg","image/png","image/webp","application/pdf"].includes(proof.type))return NextResponse.json({error:"Upload JPG, PNG, WEBP or PDF proof up to 10 MB."},{status:400});
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:b,error}=await db.from("health_booking_requests").select("id,customer_payable_amount,customer_payment_status").eq("reference",reference).eq("customer_phone",phone).single();
  if(error||!b)return NextResponse.json({error:"Booking reference and mobile number did not match."},{status:404});
  if(Number(b.customer_payable_amount||0)<=0)return NextResponse.json({error:"Payment amount is not confirmed yet. MFIT will confirm your quote first."},{status:409});
  if(b.customer_payment_status==="paid")return NextResponse.json({error:"This booking payment is already verified."},{status:409});
  const path="customers/"+b.id+"/"+Date.now()+"-"+randomUUID()+"-"+proof.name.replace(/[^a-zA-Z0-9._-]/g,"_");
  const {error:uploadError}=await db.storage.from("mfit-payment-proofs").upload(path,proof,{contentType:proof.type,upsert:false});
  if(uploadError)throw uploadError;
  const now=new Date().toISOString();
  const {error:updateError}=await db.from("health_booking_requests").update({customer_payment_reference:utr,customer_payment_proof_path:path,customer_payment_status:"submitted",customer_payment_submitted_at:now,customer_payment_verified_at:null,customer_payment_verified_by:null,customer_payment_review_note:null,updated_at:now}).eq("id",b.id);
  if(updateError){await db.storage.from("mfit-payment-proofs").remove([path]);throw updateError;}
  return NextResponse.json({success:true,status:"submitted",message:"Payment proof submitted to MFIT. Your payment will remain pending until MFIT Admin verifies the UTR and proof."});
 }catch(e:any){console.error("MFIT customer payment submission error",e);return NextResponse.json({error:"Could not submit payment proof. Please try again."},{status:500});}
}
