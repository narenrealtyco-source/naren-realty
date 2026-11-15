"use server";
import{revalidatePath}from"next/cache";import{requireAdmin}from"../../lib/supabase-server";import{createSupabaseServiceClient}from"../../lib/supabase-service";import{validVisitId,validateVisitTime,visitStatuses,type VisitStatus}from"../../lib/visit-requests";
export type AdminVisitResult={status:"idle"|"error"|"success";message:string};
export async function updateVisit(_state:AdminVisitResult,form:FormData):Promise<AdminVisitResult>{
 try{await requireAdmin();}catch{return{status:"error",message:"Admin authorization is required."};}
 const id=form.get("id"),expected=form.get("expected_status"),expectedDate=form.get("expected_date"),expectedTime=form.get("expected_time"),next=form.get("status");
 if(!validVisitId(id)||typeof expected!=="string"||!visitStatuses.some(s=>s===expected)||typeof next!=="string"||!visitStatuses.some(s=>s===next)||typeof expectedDate!=="string"||!/^\\d{4}-\\d{2}-\\d{2}$/.test(expectedDate)||typeof expectedTime!=="string"||!/^\\d{2}:\\d{2}(?::\\d{2})?$/.test(expectedTime))return{status:"error",message:"Invalid request update."};
 const status=next as VisitStatus;if(status==="pending")return{status:"error",message:"Select a review status."};let schedule;
 if(status==="rescheduled"){try{schedule=validateVisitTime(form.get("date"),form.get("time"));}catch(e){return{status:"error",message:e instanceof Error?e.message:"Invalid date or time."};}}
 const service=createSupabaseServiceClient();const values=schedule?{status,visit_date:schedule.date,visit_time:schedule.time}:{status};
 const{data,error}=await service.from("visit_requests").update(values).eq("id",id).eq("status",expected).eq("visit_date",expectedDate).eq("visit_time",expectedTime).select("id").maybeSingle();
 if(error||!data){console.error("[visit-admin] Update failed",{code:error?.code});return{status:"error",message:"Update could not be saved. Refresh and try again."};}
 revalidatePath("/admin/visits");revalidatePath("/manager");return{status:"success",message:"Visit request updated."};
}
