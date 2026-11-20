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
 if(boyError||!boy?.is_active||boy.lab_partner_id!==partner?.id) throw new Error("Invalid collection boy.");
 const {error}=await db.from("health_orders").update({lab_partner_id:partner.id,assigned_collection_boy_id:boy_id,assigned_collection_boy:undefined,assigned_at:new Date().toISOString(),sample_status:"assigned",fulfilment_status:"collection_scheduled",updated_at:new Date().toISOString()}).eq("id",order_id);
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
