"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "../../lib/supabase-server";
import { requireMfitLab } from "../../lib/mfit-lab";

function serviceClient() {
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!key) throw new Error("Service configuration missing.");
 return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,key,{auth:{persistSession:false}});
}

async function notifyCollectionPartner(admin:any,requestId:string,subject:string,message:string){
 try{
  const key=process.env.RESEND_API_KEY,from=process.env.MFIT_RESEND_FROM_EMAIL;
  if(!key||!from)return;
  const {data:request}=await admin.from("health_booking_requests").select("reference,collection_partner_id").eq("id",requestId).single();
  if(!request?.collection_partner_id)return;
  const {data:partner}=await admin.from("health_collection_partners").select("email,display_name").eq("id",request.collection_partner_id).single();
  if(!partner?.email)return;
  const safe=(value:string)=>value.replace(/[&<>"']/g,(ch:string)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]||ch));
  const html=`<p>Dear ${safe(partner.display_name||"Collection Partner")},</p><p>${safe(message)}</p><p><b>Booking ID:</b> ${safe(request.reference||requestId)}</p><p>You can see the latest sample and report status in your MFIT Collection Partner Dashboard.</p><p>Regards,<br>MFIT Healthcare Support</p>`;
  const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify({from,to:[partner.email],subject,html})});
  if(!response.ok)console.error("MFIT partner notification email failed",response.status);
 }catch(error){console.error("MFIT partner notification error",error);}
}

export async function createMfitLabStaff(formData:FormData) {
 await requireAdmin();
 const full_name=String(formData.get("full_name")||"").trim();
 const email=String(formData.get("email")||"").trim().toLowerCase();
 const password=String(formData.get("password")||"");
 if(full_name.length<2||!/^\S+@\S+\.\S+$/.test(email)||password.length<10) throw new Error("Enter name, valid email and a password of at least 10 characters.");
 const db=serviceClient();
 const {data:partner,error:partnerError}=await db.from("health_lab_partners").select("id").eq("is_internal",true).single();
 if(partnerError||!partner) throw new Error("MFIT internal lab team is not configured.");
 const {data,error}=await db.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name}});
 if(error||!data.user) throw new Error(error?.message||"Could not create lab login.");
 const {error:profileError}=await db.from("profiles").upsert({id:data.user.id,full_name,role:"lab",manager_active:true});
 if(profileError){await db.auth.admin.deleteUser(data.user.id);throw new Error("Could not create lab profile.");}
 const {error:staffError}=await db.from("health_lab_staff").insert({user_id:data.user.id,lab_partner_id:partner.id,full_name,is_active:true});
 if(staffError){await db.auth.admin.deleteUser(data.user.id);throw new Error("Could not activate lab staff account.");}
 revalidatePath("/admin/health/team");
}

export async function setMfitLabStaffActive(formData:FormData) {
 await requireAdmin();
 const user_id=String(formData.get("user_id")||"");
 const is_active=formData.get("is_active")==="on";
 if(!user_id) throw new Error("Staff user is required.");
 const db=serviceClient();
 const {error}=await db.from("health_lab_staff").update({is_active}).eq("user_id",user_id);
 if(error) throw new Error("Could not update lab access.");
 revalidatePath("/admin/health/team");
}

export async function createCollectionBoy(formData:FormData) {
 await requireAdmin();
 const full_name=String(formData.get("full_name")||"").trim();
 const phone=String(formData.get("phone")||"").replace(/\D/g,"").slice(-10);
 if(full_name.length<2||phone.length!==10) throw new Error("Enter collection boy name and 10 digit phone.");
 const db=serviceClient();
 const {data:partner}=await db.from("health_lab_partners").select("id").eq("is_internal",true).single();
 if(!partner) throw new Error("MFIT internal team is not configured.");
 const {error}=await db.from("health_collection_boys").insert({lab_partner_id:partner.id,full_name,phone,is_active:true});
 if(error) throw new Error("Could not add collection boy.");
 revalidatePath("/admin/health/team");
}

export async function assignMfitOrder(formData:FormData) {
 await requireAdmin();
 const order_id=String(formData.get("order_id")||"");
 const boy_id=String(formData.get("collection_boy_id")||"");
 if(!order_id||!boy_id) throw new Error("Choose an order and collection boy.");
 const db=serviceClient();
 const [{data:partner},{data:boy,error:boyError}]=await Promise.all([
  db.from("health_lab_partners").select("id").eq("is_internal",true).single(),
  db.from("health_collection_boys").select("id,lab_partner_id,is_active").eq("id",boy_id).single()
 ]);
 if(!partner||boyError||!boy?.is_active||boy.lab_partner_id!==partner.id) throw new Error("Invalid collection boy.");
 const {error}=await db.from("health_orders").update({lab_partner_id:partner.id,assigned_collection_boy_id:boy_id,assigned_at:new Date().toISOString(),sample_status:"assigned",fulfilment_status:"collection_scheduled",updated_at:new Date().toISOString()}).eq("id",order_id);
 if(error) throw new Error("Could not assign collection.");
 revalidatePath("/admin/health/bookings"); revalidatePath("/lab");
}

export async function updateLabOrderStatus(formData:FormData) {
 const order_id=String(formData.get("order_id")||"");
 const status=String(formData.get("sample_status")||"");
 const note=String(formData.get("note")||"").slice(0,1000);
 const allowed=["assigned","boy_reached","sample_collected","received_at_lab","processing","report_ready"];
 if(!order_id||!allowed.includes(status)) throw new Error("Invalid status.");
 const {admin,user,staff}=await requireMfitLab();
 const {data:order,error:readError}=await admin.from("health_orders").select("id,lab_partner_id,sample_status").eq("id",order_id).eq("lab_partner_id",staff.lab_partner_id).single();
 if(readError||!order) throw new Error("Order is not assigned to this MFIT lab.");
 const map:any={assigned:"collection_scheduled",boy_reached:"collection_scheduled",sample_collected:"sample_collected",received_at_lab:"sample_collected",processing:"processing",report_ready:"report_ready"};
 const {error}=await admin.from("health_orders").update({sample_status:status,fulfilment_status:map[status],report_ready_at:status==="report_ready"?new Date().toISOString():undefined,updated_at:new Date().toISOString()}).eq("id",order_id);
 if(error) throw new Error("Could not update sample status.");
 await admin.from("health_lab_activity").insert({order_id,lab_user_id:user.id,from_status:order.sample_status,to_status:status,note:note||null});
 revalidatePath("/lab"); revalidatePath("/admin/health/bookings");
}

export async function uploadMfitReport(formData:FormData) {
 const order_id=String(formData.get("order_id")||"");
 const file=formData.get("report");
 if(!order_id||!(file instanceof File)||file.type!=="application/pdf"||file.size<1||file.size>15*1024*1024) throw new Error("Upload a PDF report up to 15 MB.");
 const {admin,user,staff}=await requireMfitLab();
 const {data:order,error}=await admin.from("health_orders").select("id,lab_partner_id,order_number").eq("id",order_id).eq("lab_partner_id",staff.lab_partner_id).single();
 if(error||!order) throw new Error("Order is not assigned to this MFIT lab.");
 const path=order.id+"/"+Date.now()+"-"+file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
 const {error:uploadError}=await admin.storage.from("mfit-private-reports").upload(path,file,{contentType:"application/pdf",upsert:false});
 if(uploadError) throw new Error("Report upload failed: "+uploadError.message);
 const {error:insertError}=await admin.from("health_reports").insert({order_id,report_title:file.name,storage_path:path,uploaded_by:user.id,visible_to_customer:false});
 if(insertError){await admin.storage.from("mfit-private-reports").remove([path]);throw new Error("Report record could not be saved.");}
 await admin.from("health_orders").update({sample_status:"report_ready",fulfilment_status:"report_ready",report_ready_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",order_id);
 revalidatePath("/lab"); revalidatePath("/admin/health/reports"); revalidatePath("/admin/health/bookings");
}

export async function assignMfitRequest(formData:FormData) {
 await requireAdmin();
 const request_id=String(formData.get("request_id")||"");
 const boy_id=String(formData.get("collection_boy_id")||"");
 if(!request_id||!boy_id) throw new Error("Choose a request and collection boy.");
 const db=serviceClient();
 const [{data:partner},{data:boy,error:boyError}]=await Promise.all([
  db.from("health_lab_partners").select("id").eq("is_internal",true).single(),
  db.from("health_collection_boys").select("id,lab_partner_id,is_active").eq("id",boy_id).single()
 ]);
 if(!partner||boyError||!boy?.is_active||boy.lab_partner_id!==partner.id) throw new Error("Invalid collection boy.");
 const {error}=await db.from("health_booking_requests").update({lab_partner_id:partner.id,assigned_collection_boy_id:boy_id,assigned_at:new Date().toISOString(),sample_status:"assigned",status:"confirmed",updated_at:new Date().toISOString()}).eq("id",request_id);
 if(error) throw new Error("Could not assign booking request.");
 revalidatePath("/admin/health/bookings"); revalidatePath("/lab");
}

export async function updateLabRequestStatus(formData:FormData) {
 const request_id=String(formData.get("request_id")||"");
 const status=String(formData.get("sample_status")||"");
 let note=String(formData.get("note")||"").trim().slice(0,1000);
 if(!request_id||!["received_at_lab","processing"].includes(status)) throw new Error("Choose sample receipt or processing status.");
 const {admin,user,staff}=await requireMfitLab();
 const {data:request,error:readError}=await admin.from("health_booking_requests").select("id,reference,lab_partner_id,sample_status,sample_collected_at,lab_received_at,selected_items").eq("id",request_id).eq("lab_partner_id",staff.lab_partner_id).single();
 if(readError||!request) throw new Error("Request is not assigned to this MFIT lab.");
 if(status==="received_at_lab"){
  const receiptCode=String(formData.get("receipt_code")||"").trim();
  const receiptMethod=String(formData.get("receipt_method")||"");
  if(!receiptCode||!["scan","manual"].includes(receiptMethod))throw new Error("Scan the sample QR/barcode or enter the booking ID manually.");
  const normalized=receiptCode.split("/").filter(Boolean).pop()!.trim().toLowerCase();
  if(normalized!==String(request.reference||"").trim().toLowerCase()&&normalized!==request_id.toLowerCase())throw new Error("Scanned code does not match this booking. Check the sample label and try again.");
  const methodLabel=receiptMethod==="scan"?"QR/Barcode scan":"Manual backup";
  note=(note?note+" · ":"")+"Lab receipt verified by "+methodLabel+" ("+receiptCode.slice(0,120)+").";
 }
 const now=new Date();
 const nowIso=now.toISOString();
 const update:any={sample_status:status,updated_at:nowIso};
 if(status==="received_at_lab"){
  if(!request.sample_collected_at) throw new Error("Collection Partner must confirm sample collection before Lab receiving.");
  if(request.lab_received_at) throw new Error("Lab receiving is already confirmed.");
  const items=Array.isArray(request.selected_items)?request.selected_items:[];
  const parseTatHours=(value:any,label:any)=>{const direct=Number(value);if(value!==null&&value!==undefined&&Number.isFinite(direct)&&direct>=0.25&&direct<=720)return direct;const text=String(label||"");const range=text.match(/(\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)\s*hours?/i);if(range)return Math.max(Number(range[1]),Number(range[2]));const single=text.match(/(\d+(?:\.\d+)?)\s*hours?/i);return single?Number(single[1]):null;};
  const hours=items.map((x:any)=>parseTatHours(x.report_tat_hours,x.report_tat)).filter((n:number|null)=>n!==null) as number[];
  const allConfigured=items.length>0&&hours.length===items.length;
  const tatHours=allConfigured?Math.max(...hours):null;
  update.lab_received_at=nowIso;
  update.lab_received_by=user.id;
  update.report_tat_hours=tatHours;
  update.report_due_at=tatHours===null?null:new Date(now.getTime()+tatHours*60*60*1000).toISOString();
  update.partner_tracking_note=note||null;
 }else{
  if(!request.lab_received_at) throw new Error("Confirm Lab Receiving before starting processing.");
  if(request.sample_status==="report_ready") throw new Error("A submitted report cannot be moved back to processing.");
  if(note)update.partner_tracking_note=note;
 }
 const {error}=await admin.from("health_booking_requests").update(update).eq("id",request_id).eq("lab_partner_id",staff.lab_partner_id);
 if(error) throw new Error("Could not update request status.");
 const {error:eventError}=await admin.from("health_booking_request_tracking_events").insert({request_id,actor_user_id:user.id,actor_role:"lab",event_key:status,from_status:request.sample_status,to_status:status,note:note||null});
 if(eventError)throw new Error("Status was saved but the tracking event could not be recorded. Contact MFIT Admin.");
 const {error:activityError}=await admin.from("health_lab_request_activity").insert({request_id,lab_user_id:user.id,from_status:request.sample_status,to_status:status,note:note||null});
 if(activityError)throw new Error("Status was saved but the lab activity log could not be recorded. Contact MFIT Admin.");
 if(status==="received_at_lab"){const due=update.report_due_at?new Date(update.report_due_at).toLocaleString("en-IN",{timeZone:"Asia/Kolkata"}):"not configured yet";await notifyCollectionPartner(admin,request_id,"MFIT Healthcare – Sample Received at Lab",`Your sample has been received by MFIT Lab. Expected report deadline: ${due}.`);}else{await notifyCollectionPartner(admin,request_id,"MFIT Healthcare – Testing in Progress","Your sample is received and testing is now in progress.");}
 revalidatePath("/lab"); revalidatePath("/collection-partner"); revalidatePath("/admin/health/bookings");
}

export async function uploadMfitRequestReport(formData:FormData) {
 const request_id=String(formData.get("request_id")||"");
 const file=formData.get("report");
 if(!request_id||!(file instanceof File)||file.type!=="application/pdf"||file.size<1||file.size>15*1024*1024) throw new Error("Upload a PDF report up to 15 MB.");
 const {admin,user,staff}=await requireMfitLab();
 const {data:request,error}=await admin.from("health_booking_requests").select("id,lab_partner_id,reference,sample_status,lab_received_at").eq("id",request_id).eq("lab_partner_id",staff.lab_partner_id).single();
 if(error||!request) throw new Error("Request is not assigned to this MFIT lab.");
 if(!request.lab_received_at)throw new Error("Confirm sample receipt at the lab before uploading a report.");
 const path="requests/"+request.id+"/"+Date.now()+"-"+file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
 const {error:uploadError}=await admin.storage.from("mfit-private-reports").upload(path,file,{contentType:"application/pdf",upsert:false});
 if(uploadError) throw new Error("Report upload failed: "+uploadError.message);
 const {error:insertError}=await admin.from("health_booking_request_reports").insert({request_id,report_title:file.name,storage_path:path,uploaded_by:user.id,visible_to_customer:false});
 if(insertError){await admin.storage.from("mfit-private-reports").remove([path]);throw new Error("Report record could not be saved.");}
 const now=new Date().toISOString();
 const {error:updateError}=await admin.from("health_booking_requests").update({sample_status:"report_ready",report_submitted_at:now,updated_at:now}).eq("id",request_id).eq("lab_partner_id",staff.lab_partner_id);
 if(updateError)throw new Error("Report was uploaded but booking status could not be updated. Contact MFIT Admin.");
 const {error:eventError}=await admin.from("health_booking_request_tracking_events").insert({request_id,actor_user_id:user.id,actor_role:"lab",event_key:"report_submitted",from_status:request.sample_status,to_status:"report_ready",note:"Lab team submitted the report for MFIT Admin review."});
 if(eventError)throw new Error("Report was uploaded but tracking event could not be recorded. Contact MFIT Admin.");
 await notifyCollectionPartner(admin,request_id,"MFIT Healthcare – Report Submitted","The lab has submitted your booking report to MFIT Admin for review. The report will become available according to approval and partner payment rules.");
 revalidatePath("/lab"); revalidatePath("/collection-partner"); revalidatePath("/admin/health/reports"); revalidatePath("/admin/health/bookings");
}

export async function setHealthBookingRequestReportVisibility(formData:FormData) {
 const {user}=await requireAdmin();
 const id=String(formData.get("report_id")||"");
 const visible_to_customer=formData.get("visible_to_customer")==="on";
 if(!id) throw new Error("Report ID is required.");
 const db=serviceClient();
 const {data:report,error:readError}=await db.from("health_booking_request_reports").select("id,request_id,visible_to_customer").eq("id",id).single();
 if(readError||!report)throw new Error("Report not found.");
 const {error}=await db.from("health_booking_request_reports").update({visible_to_customer}).eq("id",id);
 if(error) throw new Error("Could not update report visibility.");
 if(visible_to_customer&&!report.visible_to_customer){
  const {error:eventError}=await db.from("health_booking_request_tracking_events").insert({request_id:report.request_id,actor_user_id:user.id,actor_role:"admin",event_key:"report_approved",from_status:"report_ready",to_status:"report_approved",note:"MFIT Admin approved report visibility."});
  if(eventError)throw new Error("Report visibility saved but approval event could not be recorded.");
  await notifyCollectionPartner(db,report.request_id,"MFIT Healthcare – Report Approved","MFIT Admin has approved the report. Customer access will follow the partner B2B payment and report-release rules.");
 }
 revalidatePath("/admin/health/reports");revalidatePath("/collection-partner");
}
