"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "../../lib/supabase-server";

function serviceClient() {
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!key) throw new Error("Admin service configuration missing.");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,key,{auth:{persistSession:false}});
}

export async function reviewCollectionPartnerApplication(formData:FormData) {
  const id=String(formData.get("application_id")||"");
  const decision=String(formData.get("decision")||"");
  const review_note=String(formData.get("review_note")||"").trim().slice(0,2000);
  if(!id||!["rejected"].includes(decision)) throw new Error("Invalid application review.");
  const {user}=await requireAdmin();
  const db=serviceClient();
  const {data:app,error:readError}=await db.from("health_collection_partner_applications").select("id,status").eq("id",id).single();
  if(readError||!app) throw new Error("Application not found.");
  if(app.status==="approved") throw new Error("This application is already approved.");
  const {error}=await db.from("health_collection_partner_applications").update({status:decision,review_note:review_note||null,reviewed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",id);
  if(error) throw new Error("Could not update application: "+error.message);
  revalidatePath("/admin/health/collection-partners");
  revalidatePath("/admin/health");
}

export async function approveAndInviteCollectionPartner(formData:FormData) {
  const id=String(formData.get("application_id")||"");
  const review_note=String(formData.get("review_note")||"").trim().slice(0,2000);
  if(!id) throw new Error("Application ID is required.");
  const {user}=await requireAdmin();
  const db=serviceClient();
  const {data:app,error:readError}=await db.from("health_collection_partner_applications").select("id,business_name,contact_name,phone,email,address,service_areas,status,created_partner_id").eq("id",id).single();
  if(readError||!app) throw new Error("Application not found.");
  if(app.status==="rejected") throw new Error("Rejected applications cannot be approved. Review the application first.");
  if(app.created_partner_id) throw new Error("Partner account has already been created.");
  const email=String(app.email||"").trim().toLowerCase();
  if(!email) throw new Error("Applicant email is missing.");
  const slugBase=String(app.business_name||app.contact_name||"collection-partner").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,35)||"collection-partner";
  const public_slug=slugBase+"-"+app.id.slice(0,8);
  const {data:invite,error:inviteError}=await db.auth.admin.inviteUserByEmail(email,{data:{full_name:app.contact_name},redirectTo:(process.env.NEXT_PUBLIC_SITE_URL||"https://narenrealty.co")+"/auth/callback?next=%2Fcollection-partner"});
  if(inviteError||!invite.user) throw new Error("Partner invitation could not be sent: "+(inviteError?.message||"No user returned."));
  const userId=invite.user.id;
  const {error:profileError}=await db.from("profiles").upsert({id:userId,full_name:app.contact_name,phone:app.phone,role:"collection_partner",manager_active:true});
  if(profileError){await db.auth.admin.deleteUser(userId);throw new Error("Could not create partner profile: "+profileError.message);}
  const {data:partner,error:partnerError}=await db.from("health_collection_partners").insert({
    user_id:userId,public_slug,display_name:app.business_name||app.contact_name,contact_name:app.contact_name,
    phone:app.phone,email,service_areas:app.service_areas||[],is_active:true,verified_at:new Date().toISOString()
  }).select("id").single();
  if(partnerError||!partner){
    await db.from("profiles").delete().eq("id",userId);
    await db.auth.admin.deleteUser(userId);
    throw new Error("Could not create collection partner record: "+(partnerError?.message||"No record returned."));
  }
  const {error:updateError}=await db.from("health_collection_partner_applications").update({
    status:"approved",review_note:review_note||null,reviewed_at:new Date().toISOString(),created_partner_id:partner.id,updated_at:new Date().toISOString()
  }).eq("id",id);
  if(updateError){
    await db.from("health_collection_partners").delete().eq("id",partner.id);
    await db.from("profiles").delete().eq("id",userId);
    await db.auth.admin.deleteUser(userId);
    throw new Error("Partner was created but application status could not be updated: "+updateError.message);
  }
  revalidatePath("/admin/health/collection-partners");
  revalidatePath("/admin/health");
}
