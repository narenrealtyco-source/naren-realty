"use server";
import {revalidatePath} from "next/cache";
import {requireAdmin} from "../../../lib/supabase-server";
export async function saveMfitPaymentSettings(formData:FormData){
 const upi=String(formData.get("upi_id")||"").trim();const payee=String(formData.get("payee_name")||"").trim();
 if(upi&&!/^[A-Za-z0-9._-]{2,128}@[A-Za-z0-9.-]{2,64}$/.test(upi))throw new Error("Enter a valid UPI ID.");
 const {supabase,user}=await requireAdmin();
 const {error}=await supabase.from("mfit_payment_settings").upsert({id:true,upi_id:upi||null,payee_name:payee||null,bank_name:String(formData.get("bank_name")||"").trim()||null,account_name:String(formData.get("account_name")||"").trim()||null,account_number:String(formData.get("account_number")||"").trim()||null,ifsc_code:String(formData.get("ifsc_code")||"").trim().toUpperCase()||null,qr_image_url:String(formData.get("qr_image_url")||"").trim()||null,instructions:String(formData.get("instructions")||"").trim()||null,updated_at:new Date().toISOString(),updated_by:user.id},{onConflict:"id"});
 if(error)throw new Error("Could not save payment settings: "+error.message);revalidatePath("/admin/health/payments");revalidatePath("/collection-partner/payments");
}
export async function reviewMfitPartnerPayment(formData:FormData){
 const id=String(formData.get("payment_id")||"");const decision=String(formData.get("decision")||"");const note=String(formData.get("review_note")||"").slice(0,1000);
 if(!id||!["paid","rejected"].includes(decision))throw new Error("Invalid payment review.");
 const {supabase,user}=await requireAdmin();
 const {data:p,error:readError}=await supabase.from("health_collection_partner_payments").select("id,booking_request_id,partner_id,amount,status").eq("id",id).single();
 if(readError||!p)throw new Error("Payment record not found.");
 if(decision==="paid"){
  const now=new Date().toISOString();
  const {error}=await supabase.from("health_collection_partner_payments").update({status:"paid",verified_at:now,verified_by:user.id,review_note:note||null,paid_at:now,updated_at:now}).eq("id",id);
  if(error)throw error;
  const {error:bookingError}=await supabase.from("health_booking_requests").update({partner_b2b_payment_status:"paid",partner_b2b_paid_at:now}).eq("id",p.booking_request_id).eq("collection_partner_id",p.partner_id);
  if(bookingError)throw bookingError;
 }else{
  const {error}=await supabase.from("health_collection_partner_payments").update({status:"rejected",verified_at:new Date().toISOString(),verified_by:user.id,review_note:note||"Proof rejected",updated_at:new Date().toISOString()}).eq("id",id);
  if(error)throw error;
  const {error:bookingError}=await supabase.from("health_booking_requests").update({partner_b2b_payment_status:"pending"}).eq("id",p.booking_request_id).eq("collection_partner_id",p.partner_id);
  if(bookingError)throw bookingError;
 }
 revalidatePath("/admin/health/payments");revalidatePath("/admin/health/bookings");revalidatePath("/collection-partner/payments");revalidatePath("/collection-partner/reports");
}
export async function reviewMfitCustomerPayment(formData:FormData){
 const id=String(formData.get("request_id")||""),decision=String(formData.get("decision")||""),note=String(formData.get("review_note")||"").slice(0,1000);
 if(!id||!["paid","rejected"].includes(decision))throw new Error("Invalid customer payment review.");
 const {supabase,user}=await requireAdmin();
 const {data:b,error:readError}=await supabase.from("health_booking_requests").select("id,customer_payment_status").eq("id",id).single();
 if(readError||!b)throw new Error("Customer booking request not found.");
 if(b.customer_payment_status==="paid")throw new Error("Customer payment is already verified.");
 const now=new Date().toISOString();
 const {error}=await supabase.from("health_booking_requests").update({customer_payment_status:decision,customer_payment_verified_at:now,customer_payment_verified_by:user.id,customer_payment_review_note:note|| (decision==="rejected"?"Proof rejected":null),updated_at:now}).eq("id",id);
 if(error)throw new Error("Could not update customer payment: "+error.message);
 revalidatePath("/admin/health/payments");revalidatePath("/admin/health/bookings");
}
