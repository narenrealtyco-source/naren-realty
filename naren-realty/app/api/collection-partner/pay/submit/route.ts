import {NextRequest,NextResponse} from "next/server";
import {randomUUID} from "node:crypto";
import {requireCollectionPartner} from "../../../../lib/collection-partner";
export async function POST(req:NextRequest){
 try{
  const {admin,partner}=await requireCollectionPartner();const form=await req.formData();
  const requestId=String(form.get("request_id")||"");const reference=String(form.get("payment_reference")||"").trim();
  const proof=form.get("proof");
  if(reference.length<6||reference.length>100)throw new Error("Enter a valid UTR / transaction reference.");
  if(!(proof instanceof File)||proof.size<1||proof.size>10*1024*1024)throw new Error("Upload a payment proof up to 10 MB.");
  if(!["image/jpeg","image/png","image/webp","application/pdf"].includes(proof.type))throw new Error("Only JPG, PNG, WEBP or PDF proof is accepted.");
  const {data:b,error}=await admin.from("health_booking_requests").select("id,partner_b2b_amount,partner_b2b_payment_status").eq("id",requestId).eq("collection_partner_id",partner.id).single();
  if(error||!b)throw new Error("Booking not found.");if(b.partner_b2b_payment_status==="paid")throw new Error("This booking is already settled.");
  const path=partner.id+"/"+requestId+"/"+Date.now()+"-"+randomUUID()+"-"+proof.name.replace(/[^a-zA-Z0-9._-]/g,"_");
  const {error:uploadError}=await admin.storage.from("mfit-payment-proofs").upload(path,proof,{contentType:proof.type,upsert:false});if(uploadError)throw uploadError;
  const now=new Date().toISOString();
  const {error:paymentError}=await admin.from("health_collection_partner_payments").upsert({partner_id:partner.id,booking_request_id:requestId,gateway:"manual_upi",gateway_order_id:"manual-"+requestId,gateway_payment_session_id:null,gateway_payment_id:null,amount:Number(b.partner_b2b_amount),currency:"INR",status:"submitted",payment_reference:reference,payment_proof_path:path,submitted_at:now,verified_at:null,verified_by:null,review_note:null,updated_at:now},{onConflict:"booking_request_id"});
  if(paymentError){await admin.storage.from("mfit-payment-proofs").remove([path]);throw paymentError;}
  const {error:updateError}=await admin.from("health_booking_requests").update({partner_b2b_payment_status:"submitted"}).eq("id",requestId).eq("collection_partner_id",partner.id);
  if(updateError)throw updateError;
  return NextResponse.redirect(new URL("/collection-partner/payments?submitted=1",req.url),303);
 }catch(e:any){return NextResponse.json({error:e.message||"Unable to submit payment proof."},{status:400});}
}