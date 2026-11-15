"use server";
import{revalidatePath}from"next/cache";import{requireManager}from"../lib/supabase-server";
export type ManagerResponseState={status:"idle"|"error"|"success";message:string};
export async function respondToAssignedVisit(_state:ManagerResponseState,form:FormData):Promise<ManagerResponseState>{
 let supabase:Awaited<ReturnType<typeof requireManager>>["supabase"];try{({supabase}=await requireManager());}catch{return{status:"error",message:"Manager authorization is required."};}
 const id=form.get("id"),response=form.get("response");if(typeof id!=="string"||!/^[0-9a-f-]{36}$/i.test(id)||(response!=="accepted"&&response!=="rejected"))return{status:"error",message:"Invalid visit response."};
 const{data:{user}}=await supabase.auth.getUser();if(!user)return{status:"error",message:"Please sign in again."};
 const{data,error}=await supabase.from("visit_requests").update({manager_response:response,manager_response_at:new Date().toISOString()}).eq("id",id).eq("assigned_manager_id",user.id).eq("manager_response","pending").select("id").maybeSingle();
 if(error||!data)return{status:"error",message:"This visit is no longer pending or is not assigned to you."};revalidatePath("/manager");return{status:"success",message:response==="accepted"?"Visit accepted.":"Visit declined."};
}
