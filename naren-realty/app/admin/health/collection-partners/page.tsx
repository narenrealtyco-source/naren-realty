import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { requireAdmin } from "../../../lib/supabase-server";
import { approveAndInviteCollectionPartner, reviewCollectionPartnerApplication } from "../collection-partner-actions";

export const metadata={title:"MFIT Collection Partners | NAREN REALTY"};
async function CollectionPartnersContent(){
  await connection();
  let supabase;try{({supabase}=await requireAdmin())}catch{redirect("/admin/login")}
  const {data:apps,error}=await supabase.from("health_collection_partner_applications").select("id,business_name,contact_name,phone,email,address,service_areas,gstin,pan,notes,status,review_note,reviewed_at,created_partner_id,created_at").order("created_at",{ascending:false}).limit(300);
  if(error) throw new Error("Could not load collection partner applications: "+error.message);
  const rows=apps||[];
  const pending=rows.filter(x=>x.status==="pending_review").length;
  const approved=rows.filter(x=>x.status==="approved").length;
  const rejected=rows.filter(x=>x.status==="rejected").length;
  return <main className="min-h-screen bg-slate-50 p-4 text-slate-900"><div className="mx-auto max-w-6xl">
    <Link href="/admin/health" className="text-sm font-semibold text-slate-600">‹ MFIT Admin</Link>
    <header className="mt-4 rounded-3xl bg-[#0b7778] p-6 text-white"><p className="text-xs font-bold uppercase tracking-widest text-teal-100">MFIT Healthcare</p><h1 className="mt-2 text-2xl font-extrabold">Collection Partners</h1><p className="mt-2 text-sm text-teal-50">Review independent collection partner applications, verify details and issue partner login invitations only after approval.</p></header>
    <section className="mt-5 grid gap-3 sm:grid-cols-3">{[["Pending review",pending],["Approved",approved],["Rejected",rejected]].map(([label,value])=><div key={label} className="rounded-2xl border bg-white p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-extrabold">{value}</p></div>)}</section>
    <div className="mt-6 flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-extrabold">Applications ({rows.length})</h2><Link href="/collection-partner/apply" className="rounded-lg border bg-white px-3 py-2 text-xs font-bold text-teal-800">Open application form ↗</Link></div>
    <div className="mt-3 space-y-3">{rows.map(a=><article key={a.id} className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-extrabold">{a.business_name||a.contact_name}</h3><p className="mt-1 text-sm text-slate-600">{a.contact_name} · {a.phone} · {a.email}</p><p className="mt-1 text-xs text-slate-500">Applied {new Date(a.created_at).toLocaleString("en-IN")}</p></div><span className={"rounded-full px-3 py-1 text-xs font-bold "+(a.status==="approved"?"bg-emerald-50 text-emerald-800":a.status==="rejected"?"bg-rose-50 text-rose-800":"bg-amber-50 text-amber-900")}>{a.status.replaceAll("_"," ")}</span></div>
      <p className="mt-3 text-sm text-slate-700">{a.address}</p><p className="mt-2 text-sm"><b>Service areas:</b> {(a.service_areas||[]).join(", ")||"—"}</p><p className="mt-1 text-xs text-slate-500">GSTIN: {a.gstin||"—"} · PAN: {a.pan||"—"}</p>{a.notes&&<p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm">{a.notes}</p>}
      {a.created_partner_id&&<p className="mt-3 text-xs font-semibold text-emerald-700">Partner account created · ID {a.created_partner_id}</p>}
      {a.review_note&&<p className="mt-2 text-xs text-slate-600">Review note: {a.review_note}</p>}
      {a.status!=="approved"&&<div className="mt-4 grid gap-3 border-t pt-3 md:grid-cols-2"><form action={approveAndInviteCollectionPartner} className="space-y-2 rounded-xl bg-emerald-50 p-3"><input type="hidden" name="application_id" value={a.id}/><label className="block text-xs font-bold text-emerald-900">Approve & send login invitation</label><textarea name="review_note" defaultValue={a.review_note||""} placeholder="Verification notes (optional)" rows={2} className="w-full rounded-lg border border-emerald-200 bg-white p-2 text-xs"/><button disabled={!!a.created_partner_id} className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Approve & Invite Partner</button></form>
      <form action={reviewCollectionPartnerApplication} className="space-y-2 rounded-xl bg-rose-50 p-3"><input type="hidden" name="application_id" value={a.id}/><input type="hidden" name="decision" value="rejected"/><label className="block text-xs font-bold text-rose-900">Reject application</label><textarea name="review_note" defaultValue={a.review_note||""} placeholder="Reason / internal review note" rows={2} className="w-full rounded-lg border border-rose-200 bg-white p-2 text-xs"/><button className="rounded-lg border border-rose-300 bg-white px-4 py-2 text-xs font-bold text-rose-800">Reject application</button></form></div>}
    </article>)}</div>{!rows.length&&<p className="mt-3 rounded-xl bg-white p-6 text-sm text-slate-500">No collection partner applications received yet.</p>}
  </div></main>;
}
export default function CollectionPartnersPage(){return <Suspense fallback={<main className="min-h-screen bg-slate-50 p-8 text-center text-sm text-slate-500">Loading collection partner applications…</main>}><CollectionPartnersContent/></Suspense>}
