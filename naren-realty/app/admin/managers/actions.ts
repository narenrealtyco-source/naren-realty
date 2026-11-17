"use server";
import{revalidatePath}from"next/cache";import{requireAdmin}from"../../lib/supabase-server";import{createSupabaseServiceClient}from"../../lib/supabase-service";import{sendManagerSetupEmail as deliverManagerSetupEmail}from"../../lib/resend-manager-email";
export type ManagerActionState={status:"idle"|"error"|"success";message:string};
export async function createManager(_state:ManagerActionState,form:FormData):Promise<ManagerActionState>{
 try{await requireAdmin();}catch{return{status:"error",message:"Admin authorization is required."};}
 const fullName=String(form.get("full_name")??"").trim(),email=String(form.get("email")??"").trim().toLowerCase(),phone=String(form.get("phone")??"").replace(/[\s()-]/g,""),area=String(form.get("area")??"").trim();
 if(fullName.length<2||fullName.length>100||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!/^\+91[6-9]\d{9}$/.test(phone)||area.length>100)return{status:"error",message:"Enter valid manager details."};
 const service=createSupabaseServiceClient();
 const{data,error}=await service.auth.admin.createUser({email,email_confirm:true,user_metadata:{full_name:fullName,phone}});
 if(error||!data.user)return{status:"error",message:error?.message??"Manager account could not be created."};
 const{error:phoneError}=await service.auth.admin.updateUserById(data.user.id,{phone,phone_confirm:true});
 if(phoneError){await service.auth.admin.deleteUser(data.user.id);return{status:"error",message:"Manager phone setup failed; account creation was rolled back."};}
 const{data:profile,error:profileError}=await service.from("profiles").upsert({
  id:data.user.id,full_name:fullName,phone,role:"manager",manager_active:true,
  manager_area:area||null,manager_email:email,
 },{onConflict:"id"}).select("id,role").single();
 if(profileError||!profile||profile.id!==data.user.id||profile.role!=="manager"){
  await service.auth.admin.deleteUser(data.user.id);
  console.error("[manager] Profile upsert failed",{code:profileError?.code??"profile_verification_failed"});
  return{status:"error",message:"Manager profile could not be verified. Account creation was rolled back."};
 }
 try {
  const siteUrl=(process.env.NEXT_PUBLIC_SITE_URL??"https://narenrealty.co").replace(/\/$/,"");
  const{data:linkData,error:linkError}=await service.auth.admin.generateLink({type:"recovery",email,options:{redirectTo:`${siteUrl}/auth/callback?next=/manager/accept-invite`}});
  if(linkError||!linkData.properties?.action_link)throw new Error("Secure setup link could not be generated.");
  await deliverManagerSetupEmail({to:email,name:fullName,actionLink:linkData.properties.action_link});
 } catch(error) {
  console.error("[manager] Setup email failed",error);
  revalidatePath("/admin/managers");
  return{status:"error",message:"Manager account was created, but setup email could not be sent. Use Send / Resend Setup Email."};
 }
 revalidatePath("/admin");revalidatePath("/admin/managers");revalidatePath("/admin/visits");
 return{status:"success",message:"Manager account created. Secure password setup email accepted by email provider."};
}
export async function sendManagerSetupEmail(_state:ManagerActionState,form:FormData):Promise<ManagerActionState>{
 try{await requireAdmin();}catch{return{status:"error",message:"Admin authorization is required."};}
 const id=String(form.get("id")??"");
 if(!/^[0-9a-f-]{36}$/i.test(id))return{status:"error",message:"Invalid manager."};
 const service=createSupabaseServiceClient();
 const{data:manager,error:lookupError}=await service.from("profiles").select("manager_email,manager_active").eq("id",id).eq("role","manager").maybeSingle();
 if(lookupError||!manager?.manager_email)return{status:"error",message:"Manager email was not found."};
 if(manager.manager_active!==true)return{status:"error",message:"Activate this manager before sending the setup email."};
 const siteUrl=(process.env.NEXT_PUBLIC_SITE_URL??"https://narenrealty.co").replace(/\/$/,"");
 try {
  const{data:linkData,error:linkError}=await service.auth.admin.generateLink({type:"recovery",email:manager.manager_email,options:{redirectTo:`${siteUrl}/auth/callback?next=/manager/accept-invite`}});
  if(linkError||!linkData.properties?.action_link)throw new Error("Secure setup link could not be generated.");
  await deliverManagerSetupEmail({to:manager.manager_email,name:"Manager",actionLink:linkData.properties.action_link});
 } catch(error) {
  console.error("[manager] Setup email resend failed",error);
  return{status:"error",message:error instanceof Error?error.message:"Setup email could not be sent."};
 }
 return{status:"success",message:"Setup email accepted by email provider."};
}
export async function setManagerActive(_state:ManagerActionState,form:FormData):Promise<ManagerActionState>{
 try{await requireAdmin();}catch{return{status:"error",message:"Admin authorization is required."};}
 const id=String(form.get("id")??""),active=String(form.get("active")??"");
 if(!/^[0-9a-f-]{36}$/i.test(id)||!["true","false"].includes(active))return{status:"error",message:"Invalid manager update."};
 const service=createSupabaseServiceClient();const{data,error}=await service.from("profiles").update({manager_active:active==="true"}).eq("id",id).eq("role","manager").select("id").maybeSingle();
 if(error||!data)return{status:"error",message:"Manager status could not be updated."};revalidatePath("/admin/managers");return{status:"success",message:active==="true"?"Manager activated.":"Manager deactivated."};
}
export async function assignVisitToManager(_state:ManagerActionState,form:FormData):Promise<ManagerActionState>{
 try{await requireAdmin();}catch{return{status:"error",message:"Admin authorization is required."};}
 const visitId=String(form.get("visit_id")??""),managerId=String(form.get("manager_id")??"");
 if(!/^[0-9a-f-]{36}$/i.test(visitId)||!(/^[0-9a-f-]{36}$/i.test(managerId)))return{status:"error",message:"Select a valid manager."};
 const service=createSupabaseServiceClient();const{data:manager,error:managerError}=await service.from("profiles").select("id").eq("id",managerId).eq("role","manager").eq("manager_active",true).maybeSingle();
 if(managerError||!manager)return{status:"error",message:"Selected manager is not active."};
 const{data,error}=await service.from("visit_requests").update({assigned_manager_id:managerId,manager_response:"pending",manager_response_at:null}).eq("id",visitId).select("id").maybeSingle();
 if(error||!data)return{status:"error",message:"Visit assignment failed."};revalidatePath("/admin/visits");revalidatePath("/manager");return{status:"success",message:"Visit assigned to manager."};
}
