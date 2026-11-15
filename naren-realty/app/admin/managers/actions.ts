"use server";
import{revalidatePath}from"next/cache";import{requireAdmin}from"../../lib/supabase-server";import{createSupabaseServiceClient}from"../../lib/supabase-service";
export type ManagerActionState={status:"idle"|"error"|"success";message:string};
export async function createManager(_state:ManagerActionState,form:FormData):Promise<ManagerActionState>{
 try{await requireAdmin();}catch{return{status:"error",message:"Admin authorization is required."};}
 const fullName=String(form.get("full_name")??"").trim(),email=String(form.get("email")??"").trim().toLowerCase(),phone=String(form.get("phone")??"").replace(/[\s()-]/g,""),password=String(form.get("password")??""),area=String(form.get("area")??"").trim();
 if(fullName.length<2||fullName.length>100||!/^\\S+@\\S+\\.\\S+$/.test(email)||!/^\\+91[6-9]\\d{9}$/.test(phone)||password.length<12||area.length>100)return{status:"error",message:"Enter valid details. Password must be at least 12 characters."};
 const service=createSupabaseServiceClient();
 const{data,error}=await service.auth.admin.createUser({email,password,phone,email_confirm:true,user_metadata:{full_name:fullName,phone}});
 if(error||!data.user)return{status:"error",message:error?.message??"Manager account could not be created."};
 const{error:profileError}=await service.from("profiles").update({full_name:fullName,phone,role:"manager",manager_active:true,manager_area:area||null,manager_email:email}).eq("id",data.user.id);
 if(profileError){await service.auth.admin.deleteUser(data.user.id);return{status:"error",message:"Manager profile could not be created. Account creation was rolled back."};}
 revalidatePath("/admin/managers");return{status:"success",message:"Manager account created. Share the email/password securely; mobile OTP requires SMS provider setup."};
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
