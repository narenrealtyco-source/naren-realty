import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "../../../lib/supabase-server";

export const instant = false;
export const metadata = { title: "MFIT Prescription Enquiries | NAREN REALTY" };

async function PrescriptionList() {
  await connection();
  try { await requireAdmin(); } catch { redirect("/admin/login"); }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) throw new Error("Prescription service is unavailable.");
  const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await db.from("health_prescription_uploads")
    .select("id,customer_name,customer_phone,original_filename,content_type,file_size_bytes,storage_path,created_at")
    .order("created_at", { ascending: false }).limit(200);
  if (error) throw new Error("Could not load prescription enquiries.");
  const uploads = await Promise.all((data || []).map(async (item) => {
    const { data: signed } = await db.storage.from("mfit-prescriptions").createSignedUrl(item.storage_path, 300);
    return { ...item, downloadUrl: signed?.signedUrl || null };
  }));

  return <main className="min-h-screen bg-slate-50 p-4 text-slate-900"><div className="mx-auto max-w-5xl">
    <Link href="/admin/health" className="text-sm font-semibold text-slate-600">‹ MFIT Admin</Link>
    <header className="mt-4 rounded-2xl bg-[#0b7778] p-6 text-white"><p className="text-xs font-bold uppercase tracking-widest text-teal-100">MFIT Healthcare</p><h1 className="mt-2 text-2xl font-extrabold">Prescription enquiries</h1><p className="mt-2 text-sm text-teal-50">Customer-submitted prescriptions are stored in a private bucket. Download links expire after five minutes.</p></header>
    <p className="mt-5 text-sm font-semibold text-slate-600">{uploads.length} latest uploads</p>
    <div className="mt-3 space-y-3">{uploads.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-extrabold">{item.customer_name}</h2><p className="mt-1 text-sm text-slate-600">{item.customer_phone}</p></div><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">New enquiry</span></div><div className="mt-3 border-t pt-3 text-xs leading-6 text-slate-500"><p><b>File:</b> {item.original_filename}</p><p><b>Type:</b> {item.content_type} · <b>Size:</b> {(item.file_size_bytes / 1024 / 1024).toFixed(2)} MB</p><p><b>Submitted:</b> {new Date(item.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</p></div>{item.downloadUrl ? <a href={item.downloadUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-xl bg-[#087f82] px-4 py-3 text-xs font-bold text-white">Open private prescription</a> : <p className="mt-3 text-xs font-semibold text-rose-700">Private file link unavailable. Check storage record.</p>}</article>)}</div>
    {uploads.length === 0 && <p className="mt-3 rounded-xl bg-white p-6 text-sm text-slate-500">No prescriptions have been submitted yet.</p>}
  </div></main>;
}

export default function MfitPrescriptionAdminPage() {
  return <Suspense fallback={<main className="min-h-screen bg-slate-50 p-8 text-center text-sm text-slate-500">Loading prescription enquiries…</main>}><PrescriptionList /></Suspense>;
}
