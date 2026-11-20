"use server";
import {revalidatePath} from "next/cache";
import {requireCollectionPartner} from "../lib/collection-partner";
export async function updatePartnerBooking(formData:FormData){
 const {admin,user,partner}=await requireCollectionPartner();
 const id=String(formData.get("request_id")||"");
 const action=String(formData.get("action")||"");
 const method=String(formData.get("method")||"");
 const {data:b,error:readError}=await admin.from("health_booking_requests").select("id,status,sample_status,sample_collected_at,partner_customer_amount").eq("id",id).eq("collection_partner_id",partner.id).single();
 if(readError||!b)throw new Error("Booking not found.");
 if(action==="customer_paid"){
  if(!["cash","upi"].includes(method))throw new Error("Choose cash or UPI.");
  const {error}=await admin.from("health_booking_requests").update({partner_customer_payment_status:"paid",partner_customer_payment_method:method,updated_at:new Date().toISOString()}).eq("id",id).eq("collection_partner_id",partner.id);
  if(error)throw error;
 }else if(action==="sample_collected"){
  if(b.sample_collected_at)throw new Error("Sample collection is already confirmed.");
  const now=new Date().toISOString();
  const {error}=await admin.from("health_booking_requests").update({sample_status:"sample_collected",sample_collected_at:now,sample_collected_by:user.id,updated_at:now}).eq("id",id).eq("collection_partner_id",partner.id);
  if(error)throw error;
  const {error:eventError}=await admin.from("health_booking_request_tracking_events").insert({request_id:id,actor_user_id:user.id,actor_role:"collection_partner",actor_partner_id:partner.id,event_key:"sample_collected",from_status:b.sample_status,to_status:"sample_collected",note:"Collection partner confirmed sample collection."});
  if(eventError)throw eventError;
 }else throw new Error("Invalid action.");
 revalidatePath("/collection-partner");
}
