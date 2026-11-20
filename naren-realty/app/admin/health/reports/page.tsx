import Link from "next/link";
import {redirect} from "next/navigation";
import {createClient} from "@supabase/supabase-js";
import {requireAdmin} from "../../../lib/supabase-server";
import {setHealthBookingRequestReportVisibility} from "../lab-actions";
export const metadata={title:"MFIT Diagnostic Reports"};
export default async function HealthReportsPage(){
 try{await requireAdmin()}catch{redirect("/admin/login")}
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!key)throw new Error("Report service unavailable.");
 const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,key,{auth:{persistSession:false}});
 const [{data:reports,error},{data:requests}]=await Promise.all([
  db.from("health_reports").select("id,order_id,report_title,storage_path,uploaded_by,visible_to_customer,uploaded_at").order("uploaded_at",{ascending:false}).limit(200),
  db.from("health_booking_request_reports").select("id,request_id,report_title,storage_path,uploaded_by,visible_to_customer,uploaded_at").order("uploaded_at",{ascending:false}).limit(200)
 ]);
 if(error)throw new Error("Could not load MFIT reports.");
 const all=await Promise.all((requests||[]).map(async r=>{const {data}=await db.storage.from("mfit-private-reports").createSignedUrl(r.storage_path,300);return {...r,downloadUrl:data?.signedUrl||null}}));
 return <main className="min-h-screen bg-slate-50 p-4"><div className="mx-auto max-w-5xl"><Link href="/admin/health">‹ MFIT Admin</Link><h1 className="mt-4 text-2xl font-extrabold">Diagnostic Reports</h1><p className="mt-1 text-sm text-slate-500">Reports uploaded by MFIT Lab users stay private until Admin approves customer visibility.</p><h2 className="mt-6 font-bold">Booking request reports ({all.length})</h2><div className="mt-3 space-y-2">{all.map(r=><article key={r.id} className="rounded-xl border bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-2"><b>{r.report_title}</b><span className="text-xs text-slate-500">{r.visible_to_customer?"Visible to customer":"Admin review pending"}</span></div><p className="mt-1 text-xs text-slate-500">Request: {r.request_id} · Uploaded: {new Date(r.uploaded_at).toLocaleString("en-IN")}</p><div className="mt-3 flex flex-wrap gap-3">{r.downloadUrl&&<a href={r.downloadUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-teal-700 underline">Open private PDF</a>}<form action={setHealthBookingRequestReportVisibility} className="flex items-center gap-2"><input type="hidden" name="report_id" value={r.id}/><label className="flex items-center gap-2 text-xs"><input type="checkbox" name="visible_to_customer" defaultChecked={r.visible_to_customer}/> Customer can view</label><button className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-bold text-white">Save visibility</button></form></div></article>)}</div>{!all.length&&<p className="mt-3 rounded-xl bg-white p-5 text-sm text-slate-500">No booking request reports uploaded yet.</p>}<h2 className="mt-7 font-bold">Paid order reports ({reports?.length||0})</h2><div className="mt-3 space-y-2">{(reports||[]).map(r=><article key={r.id} className="rounded-xl border bg-white p-4"><b>{r.report_title}</b><p className="mt-1 text-xs text-slate-500">Order: {r.order_id} · Uploaded: {new Date(r.uploaded_at).toLocaleString("en-IN")} · Customer visible: {r.visible_to_customer?"Yes":"No"}</p></article>)}</div></div></main>;
}
