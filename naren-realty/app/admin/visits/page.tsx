import Link from "next/link";
import { connection } from "next/server";
import { requireAdmin } from "../../lib/supabase-server";
import VisitReviewForm from "./VisitReviewForm";

export const instant = false;

type VisitRow = {
  id: string; customer_name: string; mobile_number: string; message: string; visit_date: string;
  visit_time: string; status: string; created_at: string;
  properties: { id: string; title: string; locality: string; category: string } | null;
};

export default async function AdminVisitsPage() {
  await connection();
  let supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"];
  try { ({ supabase } = await requireAdmin()); } catch { return <main className="p-4 sm:p-8"><p role="alert">Admin authorization is required.</p><Link className="underline" href="/admin/login">Admin login</Link></main>; }
  const rows: VisitRow[] = [];
  let failed = false;
  for (;;) {
    const { data, error, count } = await supabase.from("visit_requests").select("id,customer_name,mobile_number,message,visit_date,visit_time,status,created_at,properties(id,title,locality,category)", { count: "exact" }).order("created_at", { ascending: false }).order("id").range(rows.length, rows.length + 99).overrideTypes<VisitRow[], { merge: false }>();
    if (error || count === null || (!data?.length && rows.length < count)) {
      console.error("[visit-admin] Lookup failed", { code: error?.code });
      failed = true; break;
    }
    rows.push(...(data ?? []));
    if (rows.length >= count) break;
  }
  return <main className="min-h-screen bg-slate-50 p-5 text-slate-900"><div className="mx-auto max-w-5xl">
    <Link href="/admin" className="text-sm font-semibold underline">Admin dashboard</Link>
    <h1 className="mt-5 text-3xl font-bold text-[#10243A]">Visit Requests</h1>
    <p className="mt-2 text-sm text-slate-600">Requested times are not confirmed until an Admin reviews them.</p>
    {failed ? <p role="alert" className="mt-5 text-rose-700">Visit requests could not be loaded. Check database setup and Admin permissions.</p> : rows.length === 0 ? <p className="mt-5">No visit requests yet.</p> : <div className="mt-5 space-y-4">{rows.map((row) => <article key={row.id} className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="break-words text-lg font-bold text-[#10243A]">{row.properties?.title ?? "Property details unavailable"}</h2>
      {row.properties && <p className="break-words text-sm text-slate-600">{row.properties.locality} · {row.properties.category}</p>}
      <p className="mt-3 break-words text-sm"><strong>Customer:</strong> {row.customer_name} · {row.mobile_number}</p>
      <p className="mt-2 text-sm"><strong>Requested:</strong> {row.visit_date} at {row.visit_time.slice(0, 5)} IST</p>
      <p className="mt-2 text-sm"><strong>Status:</strong> {row.status}</p>
      {row.message && <p className="mt-2 whitespace-pre-wrap break-words text-sm"><strong>Message:</strong> {row.message}</p>}
      <VisitReviewForm key={`${row.id}-${row.status}-${row.visit_date}-${row.visit_time}`} id={row.id} status={row.status} date={row.visit_date} time={row.visit_time} />
    </article>)}</div>}
  </div></main>;
}
