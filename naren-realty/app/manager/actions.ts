"use server";
import{revalidatePath}from"next/cache";import{requireManager}from"../lib/supabase-server";import{createSupabaseServiceClient}from"../lib/supabase-service";
export type ManagerResponseState={status:"idle"|"error"|"success";message:string};
export async function respondToAssignedVisit(_state:ManagerResponseState,form:FormData):Promise<ManagerResponseState>{
 let managerId="";try{const auth=await requireManager();managerId=auth.user.id;}catch{return{status:"error",message:"Manager authorization is required."};}
 const id=form.get("id"),response=form.get("response");if(typeof id!=="string"||!/^[0-9a-f-]{36}$/i.test(id)||(response!=="accepted"&&response!=="rejected"))return{status:"error",message:"Invalid visit response."};
 const service=createSupabaseServiceClient();const{data,error}=await service.from("visit_requests").update({manager_response:response,manager_response_at:new Date().toISOString()}).eq("id",id).eq("assigned_manager_id",managerId).eq("manager_response","pending").select("id").maybeSingle();
 if(error||!data)return{status:"error",message:"This visit is no longer pending or is not assigned to you."};revalidatePath("/manager");revalidatePath("/admin/visits");return{status:"success",message:response==="accepted"?"Visit accepted.":"Visit declined."};
}
