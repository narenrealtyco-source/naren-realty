import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { requireAdmin } from "../../lib/supabase-server";
import { findHomeService } from "../../lib/home-services";
import { homeServicesReady } from "../../lib/home-services-config";
import StatusForm from "./StatusForm";
import AdminRecordDeleteButton from "../../components/AdminRecordDeleteButton";

type ServiceRow = { id: string; service: string; customer_name: string; mobile_number: string; requirement: string; preferred_time: string; locality: string; status: string; created_at: string };

export default function AdminServicesPage() {
  return <Suspense fallback={<main className="p-5">Loading service enquiries...</main>}><AdminServicesContent /></Suspense>;
}

async function AdminServicesContent() {
  await connection();
  let supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"];
  try { ({ supabase } = await requireAdmin()); }
  catch { return <main className="p-5"><p role="alert">Admin authorization is required.</p><Link className="underline" href="/admin/login">Admin login</Link></main>; }
  if (!homeServicesReady()) return <main className="p-5"><Link href="/admin" className="underline">Admin dashboard</Link><h1 className="mt-4 text-2xl font-bold">Home service enquiries</h1><p className="mt-3" role="status">Service enquiries are awaiting secure database setup.</p><Link href="/admin/services/vendors" className="mt-4 inline-block underline">Manage service providers</Link></main>;
  const rows: ServiceRow[] = [];
  let failed = false;
  for (;;) {
    const { data, error, count } = await supabase.from("home_service_enquiries")
      .select("id,service,customer_name,mobile_number,requirement,preferred_time,locality,status,created_at", { count: "exact" })
      .order("created_at", { ascending: false }).order("id").range(rows.length, rows.length + 99);
    if (error || count === null || (!data?.length && rows.length < count)) {
      console.error("[home-service] Admin lookup failed", { code: error?.code });
      failed = true; break;
    }
    rows.push(...(data ?? []));
    if (rows.length >= count) break;
  }
  return <main className="min-h-screen bg-slate-50 p-5 text-slate-900"><div className="mx-auto max-w-4xl">
    <Link href="/admin" className="text-sm underline">Admin dashboard</Link><h1 className="mt-4 text-2xl font-bold text-[#10243A]">Home service enquiries</h1><Link href="/admin/services/vendors" className="mt-3 inline-block underline">Manage service providers</Link>
    {failed ? <p role="alert" className="mt-4 text-rose-700">Enquiries could not be loaded.</p> : rows.length === 0 ? <p className="mt-4">No enquiries yet.</p> :
      <div className="mt-5 space-y-4">{rows.map((row) => <article key={row.id} className="rounded-xl border border-slate-200 bg-white p-4 [overflow-wrap:anywhere]">
        <h2 className="font-bold">{findHomeService(row.service)?.name ?? row.service}</h2>
        <p className="mt-2 text-sm"><strong>Customer:</strong> {row.customer_name} · {row.mobile_number}</p>
        <p className="mt-2 text-sm"><strong>Locality:</strong> {row.locality}</p>
        <p className="mt-2 whitespace-pre-wrap text-sm"><strong>Requirement:</strong> {row.requirement}</p>
        {row.preferred_time && <p className="mt-2 text-sm"><strong>Preferred time:</strong> {row.preferred_time}</p>}
        <p className="mt-2 text-sm"><strong>Received:</strong> {row.created_at}</p>
        <StatusForm key={`${row.id}-${row.status}`} id={row.id} status={row.status} />
        <AdminRecordDeleteButton kind="home-service" id={row.id} label="Delete service enquiry" />
      </article>)}</div>}
  </div></main>;
}
