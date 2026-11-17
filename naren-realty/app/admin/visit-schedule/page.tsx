import Link from "next/link";
import { connection } from "next/server";
import { requireAdmin } from "../../lib/supabase-server";
import { createSupabaseServiceClient } from "../../lib/supabase-service";

export default async function AdminVisitSchedulePage() {
  await connection();
  try { await requireAdmin(); } catch { return <main className="p-6"><p role="alert">Admin authorization is required.</p><Link href="/admin/login" className="underline">Admin login</Link></main>; }
  const supabase = await createSupabaseServiceClient();
  const [enquiries, visits] = await Promise.all([
    supabase.from("enquiries").select("id", { count: "exact", head: true }),
    supabase.from("visit_requests").select("id", { count: "exact", head: true }),
  ]);
  return <main className="min-h-screen bg-slate-50 p-4 sm:p-8"><div className="mx-auto max-w-5xl">
    <Link href="/admin" className="text-sm font-semibold underline">← Admin Dashboard</Link>
    <header className="mt-5"><p className="text-xs font-bold tracking-widest text-amber-700">NAREN REALTY · CUSTOMER OPERATIONS</p><h1 className="mt-1 text-3xl font-bold text-[#10243A]">Visit Schedule</h1><p className="mt-2 text-sm text-slate-600">Customer enquiries, site visits and follow-ups — managed under one module.</p></header>
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      <Link href="/admin/enquiries" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-amber-400"><p className="text-sm font-semibold text-slate-500">Customer enquiries</p><p className="mt-2 text-3xl font-bold text-[#10243A]">{enquiries.count ?? "—"}</p><h2 className="mt-2 text-lg font-bold">Enquiries & Follow-ups</h2><p className="mt-1 text-sm text-slate-600">Customer details, enquiry status, call notes and next follow-up.</p><span className="mt-4 inline-block text-sm font-bold text-amber-800">Open enquiries →</span></Link>
      <Link href="/admin/visits" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-amber-400"><p className="text-sm font-semibold text-slate-500">Property visit requests</p><p className="mt-2 text-3xl font-bold text-[#10243A]">{visits.count ?? "—"}</p><h2 className="mt-2 text-lg font-bold">Site Visit Schedule</h2><p className="mt-1 text-sm text-slate-600">Visit date/time, confirmation, rescheduling and manager assignment.</p><span className="mt-4 inline-block text-sm font-bold text-amber-800">Open visit schedule →</span></Link>
    </div>
  </div></main>;
}
