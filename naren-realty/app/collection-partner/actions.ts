"use server";
import {revalidatePath} from "next/cache";
import {requireCollectionPartner} from "../lib/collection-partner";

export async function updatePartnerBooking(formData:FormData){
 const {admin,user,partner}=await requireCollectionPartner();
 const id=String(formData.get("request_id")||"");
 const action=String(formData.get("action")||"");
 const method=String(formData.get("method")||"");
 const {data:b,error:readError}=await admin.from("health_booking_requests")
  .select("id,status,sample_status,sample_collected_at,partner_customer_amount,preferred_date,preferred_slot")
  .eq("id",id).eq("collection_partner_id",partner.id).single();
 if(readError||!b)throw new Error("Booking not found.");

 if(action==="customer_paid"){
  if(!["cash","upi"].includes(method))throw new Error("Choose cash or UPI.");
  const {error}=await admin.from("health_booking_requests")
   .update({partner_customer_payment_status:"paid",partner_customer_payment_method:method,updated_at:new Date().toISOString()})
   .eq("id",id).eq("collection_partner_id",partner.id);
  if(error)throw error;
 }else if(action==="sample_collected"){
  if(b.sample_collected_at)throw new Error("Sample collection is already confirmed.");
  const now=new Date().toISOString();
  const {error}=await admin.from("health_booking_requests")
   .update({sample_status:"sample_collected",sample_collected_at:now,sample_collected_by:user.id,updated_at:now})
   .eq("id",id).eq("collection_partner_id",partner.id);
  if(error)throw error;
  const {error:eventError}=await admin.from("health_booking_request_tracking_events").insert({
   request_id:id,actor_user_id:user.id,actor_role:"collection_partner",actor_partner_id:partner.id,
   event_key:"sample_collected",from_status:b.sample_status,to_status:"sample_collected",
   note:"Collection partner confirmed sample collection."
  });
  if(eventError)throw eventError;
 }else if(action==="reschedule"){
  const date=String(formData.get("new_date")||"");
  const slot=String(formData.get("new_slot")||"").trim();
  const reason=String(formData.get("reason")||"").trim();
  if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(date)||!slot||reason.length<3)throw new Error("Choose a new visit date, time and reason.");
  const dateTime=new Date(date+"T00:00:00");
  const today=new Date();today.setHours(0,0,0,0);
  if(Number.isNaN(dateTime.getTime())||dateTime<today)throw new Error("New visit date must be today or later.");
  const now=new Date().toISOString();
  const {error}=await admin.from("health_booking_requests").update({
   preferred_date:date,preferred_slot:slot,updated_at:now
  }).eq("id",id).eq("collection_partner_id",partner.id);
  if(error)throw error;
  const {error:eventError}=await admin.from("health_booking_request_tracking_events").insert({
   request_id:id,actor_user_id:user.id,actor_role:"collection_partner",actor_partner_id:partner.id,
   event_key:"visit_rescheduled",from_status:b.status,to_status:b.status,
   note:"Visit rescheduled from "+b.preferred_date+" ("+b.preferred_slot+") to "+date+" ("+slot+"). Reason: "+reason
  });
  if(eventError)throw eventError;
 }else throw new Error("Invalid action.");
 revalidatePath("/collection-partner");
}
