import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { AdminLoanEdit, AdminRequirementForm } from "../../components/RequirementForms";
import { requirementsReady } from "../../lib/requirements";
import { requireAdmin } from "../../lib/supabase-server";

type Followup = { requirement_id: string; assigned_to: string | null; remarks: string };
export default function AdminRequirementsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  return <Suspense fallback={<main className="p-5">Loading requirements...</main>}><Content searchParams={searchParams} /></Suspense>;
}
async function Content({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const requestedStatus = (await searchParams).status?.trim().toLowerCase() ?? "all";
  const validFilters = new Set(["all", "pending", "approved", "rejected", "closed"]);
  const statusFilter = validFilters.has(requestedStatus) ? requestedStatus : "all";
  await connection();
  let supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"];
  try { ({ supabase } = await requireAdmin()); } catch { return <main className="p-5"><p role="alert">Admin authorization is required.</p><Link className="underline" href="/admin/login">Admin login</Link></main>; }
  if (!requirementsReady()) return <main className="p-5"><Link href="/admin" className="underline">Admin dashboard</Link><h1 className="mt-4 text-2xl font-bold">Requirements</h1><p role="status" className="mt-3">Requirements are unavailable until secure database setup is verified.</p></main>;
  const [matches, loans, loanFollowups, loanTypes] = await Promise.all([
    supabase.from("property_requirements").select("*").order("created_at", { ascending: false }).limit(100),
    supabase.from("loan_requirements").select("*,loan_types(name)").order("created_at", { ascending: false }).limit(100),
    supabase.from("loan_requirement_followups").select("requirement_id,assigned_to,remarks").limit(1000),
    supabase.from("loan_types").select("id,name,active").order("name"),
  ]);
  if (matches.error || loans.error || loanFollowups.error || loanTypes.error) { console.error("[requirements] Admin lookup failed", { match: matches.error?.code, loan: loans.error?.code, loanFollowup: loanFollowups.error?.code, types: loanTypes.error?.code }); return <main className="p-5"><p role="alert">Requirements could not be loaded.</p></main>; }
  const notes: Followup[] = loanFollowups.data ?? [];
  const propertyRows = (matches.data ?? []).filter((row) => {
    const status = String(row.status).toLowerCase();
    if (statusFilter === "pending") return status === "new" || status === "contacted";
    if (statusFilter === "closed") return status === "closed";
    return statusFilter === "all";
  });
  const loanRows = (loans.data ?? []).filter((row) => {
    const status = String(row.status).toLowerCase();
    if (statusFilter === "pending") return ["new", "contacted", "documents pending", "under process"].includes(status);
    if (status === "approved" || status === "rejected" || status === "closed") return statusFilter === status;
    return statusFilter === "all";
  });
  return <main className="min-h-screen bg-slate-50 p-4 sm:p-8"><div className="mx-auto max-w-4xl"><Link href="/admin" className="underline">← Admin dashboard</Link><h1 className="mt-4 text-3xl font-bold text-[#10243A]">Requirements</h1>
    <nav aria-label="Requirement status filter" className="mt-5 flex flex-wrap gap-2">{(["all","pending","approved","rejected","closed"] as const).map((status) => <Link key={status} href={status === "all" ? "/admin/requirements" : `/admin/requirements?status=${status}`} aria-current={statusFilter === status ? "page" : undefined} className={`rounded-lg border px-3 py-2 text-sm font-semibold ${statusFilter === status ? "border-[#10243A] bg-[#10243A] text-white" : "border-slate-300 bg-white text-slate-700"}`}>{status === "all" ? "All" : status[0].toUpperCase() + status.slice(1)}</Link>)}</nav>
    {(["match","loan"] as const).map((kind) => <section key={kind} className="mt-6"><h2 className="text-xl font-bold">{kind === "match" ? "Property requirements" : "Loan requirements"}</h2>
      {(kind === "match" ? propertyRows : loanRows).map((row) => { const note = kind === "loan" ? notes.find((item) => item.requirement_id === row.id) : null; return <article key={row.id} className="mt-3 rounded-xl border bg-white p-4 [overflow-wrap:anywhere]"><h3 className="font-bold">{row.customer_name} · {kind === "match" ? row.customer_phone : row.phone}</h3>
        {kind === "match" ? <p className="mt-2 text-sm">{row.requirement_type} · {row.property_category} · {row.preferred_location} · {row.preferred_bhk ?? "Any"} BHK · {row.min_budget ?? "Any"} – {row.max_budget ?? "Any"} · {row.move_in_date ?? "No date"}</p> : <p className="mt-2 text-sm">{row.loan_types?.name ?? "Loan type unavailable"} · ₹{Number(row.amount).toLocaleString("en-IN")} · {row.employment} · {row.property_location} · {row.property_value ?? "No property value"} · {row.email}</p>}
        <p className="mt-2 whitespace-pre-wrap text-sm">{kind === "match" ? row.additional_requirements : row.details}</p><p className="mt-2 text-sm">{row.created_at}</p>
        {kind === "loan" && <AdminLoanEdit loan={row} types={loanTypes.data ?? []} />}
        <AdminRequirementForm id={row.id} kind={kind} status={row.status} remarks={kind === "match" ? (row.admin_notes ?? "") : (note?.remarks ?? "")} assigned={note?.assigned_to ?? ""} /></article>; })}
      {(kind === "match" ? matches.data : loans.data)?.length === 100 && <p className="mt-3 text-sm">Showing the latest 100 requirements.</p>}
    </section>)}
  </div></main>;
}
