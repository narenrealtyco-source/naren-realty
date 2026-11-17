import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { requireAdmin } from "../../lib/supabase-server";
import { requirementsReady } from "../../lib/requirements";
import { AdminLoanEdit, AdminRequirementForm } from "../../components/RequirementForms";

export default function AdminLoansPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  return <Suspense fallback={<main className="p-6">Loading loan management...</main>}><Content searchParams={searchParams} /></Suspense>;
}
async function Content({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  await connection();
  let supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"];
  try { ({ supabase } = await requireAdmin()); } catch { return <main className="p-6"><p role="alert">Admin authorization is required.</p><Link href="/admin/login" className="underline">Admin login</Link></main>; }
  if (!requirementsReady()) return <main className="p-6"><Link href="/admin" className="underline">← Admin Dashboard</Link><h1 className="mt-4 text-3xl font-bold">Loans</h1><p className="mt-3 rounded-lg border bg-white p-4 text-sm">Loan management is unavailable until the secure loan database setup is enabled.</p></main>;
  const params = await searchParams;
  const [typeResult, loanResult, followupResult] = await Promise.all([
    supabase.from("loan_types").select("id,name,active").order("name"),
    supabase.from("loan_requirements").select("*,loan_types(id,name)").order("created_at", { ascending: false }).limit(500),
    supabase.from("loan_requirement_followups").select("requirement_id,assigned_to,remarks").limit(1000),
  ]);
  if (typeResult.error || loanResult.error || followupResult.error) return <main className="p-6"><Link href="/admin" className="underline">← Admin Dashboard</Link><p role="alert" className="mt-4 text-red-700">Loan records could not be loaded. Please check the database setup.</p></main>;
  const types = typeResult.data ?? [];
  const selected = params.type ?? "all";
  const filtered = selected === "all" ? loanResult.data ?? [] : (loanResult.data ?? []).filter((row) => row.loan_type_id === selected);
  const followups = followupResult.data ?? [];
  return <main className="min-h-screen bg-slate-50 p-4 sm:p-8"><div className="mx-auto max-w-6xl">
    <Link href="/admin" className="text-sm font-semibold underline">← Admin Dashboard</Link>
    <header className="mt-5"><p className="text-xs font-bold tracking-widest text-amber-700">NAREN REALTY · FINANCE</p><h1 className="mt-1 text-3xl font-bold text-[#10243A]">Loans</h1><p className="mt-2 text-sm text-slate-600">Select a loan type to view and manage its applications.</p></header>
    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <Link href="/admin/loans" className={`rounded-xl border bg-white p-4 ${selected === "all" ? "border-[#10243A] ring-2 ring-amber-200" : "border-slate-200"}`}><p className="text-2xl font-bold">{(loanResult.data ?? []).length}</p><p className="mt-1 text-sm font-semibold">All Loan Requests</p></Link>
      {types.map((type) => { const count = (loanResult.data ?? []).filter((row) => row.loan_type_id === type.id).length; return <Link key={type.id} href={`/admin/loans?type=${type.id}`} className={`rounded-xl border bg-white p-4 ${selected === type.id ? "border-[#10243A] ring-2 ring-amber-200" : "border-slate-200"}`}><p className="text-2xl font-bold">{count}</p><p className="mt-1 text-sm font-semibold">{type.name}</p>{!type.active && <span className="text-xs text-slate-500">Inactive</span>}</Link>; })}
    </div>
    <section className="mt-7"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold text-[#10243A]">{selected === "all" ? "All Loan Applications" : types.find((type) => type.id === selected)?.name ?? "Loan Applications"}</h2><span className="text-sm text-slate-500">{filtered.length} records</span></div>
      {filtered.length ? <div className="mt-4 space-y-4">{filtered.map((loan) => { const note = followups.find((item) => item.requirement_id === loan.id); return <article key={loan.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold text-[#10243A]">{loan.customer_name}</h3><p className="mt-1 text-sm text-slate-600">{loan.phone} · {loan.email || "No email"}</p><p className="mt-2 text-sm font-semibold">{loan.loan_types?.name ?? "Loan type unavailable"} · ₹{Number(loan.amount).toLocaleString("en-IN")}</p><p className="mt-1 text-xs text-slate-500">{loan.employment} · {loan.property_location || "Location not provided"} · {loan.created_at}</p></div><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900">{loan.status}</span></div><AdminLoanEdit loan={loan} types={types} /><AdminRequirementForm id={loan.id} kind="loan" status={loan.status} remarks={note?.remarks ?? ""} assigned={note?.assigned_to ?? ""} /></article>; })}</div> : <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">No loan applications in this category yet.</p>}
    </section>
  </div></main>;
}
