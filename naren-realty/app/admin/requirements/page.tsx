import Link from "next/link";
import { Suspense } from "react";
import { AdminLoanEdit, AdminRequirementForm } from "../../components/RequirementForms";
import { requirementsReady } from "../../lib/requirements";
import { requireAdmin } from "../../lib/supabase-server";

type Followup = { kind: string; requirement_id: string; assigned_to: string | null; remarks: string };
export default function AdminRequirementsPage() {
  return <Suspense fallback={<main className="p-5">Loading requirements...</main>}><Content /></Suspense>;
}
async function Content() {
  let supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"];
  try { ({ supabase } = await requireAdmin()); } catch { return <main className="p-5"><p role="alert">Admin authorization is required.</p><Link className="underline" href="/admin/login">Admin login</Link></main>; }
  if (!requirementsReady()) return <main className="p-5"><Link href="/admin" className="underline">Admin dashboard</Link><h1 className="mt-4 text-2xl font-bold">Requirements</h1><p role="status" className="mt-3">Requirements are unavailable until secure database setup is verified.</p></main>;
  const [matches, loans, followups, loanTypes] = await Promise.all([
    supabase.from("property_requirements").select("*").order("created_at", { ascending: false }).limit(100),
    supabase.from("loan_requirements").select("*,loan_types(name)").order("created_at", { ascending: false }).limit(100),
    supabase.from("requirement_followups").select("kind,requirement_id,assigned_to,remarks").limit(1000),
    supabase.from("loan_types").select("id,name,active").order("name"),
  ]);
  if (matches.error || loans.error || followups.error || loanTypes.error) { console.error("[requirements] Admin lookup failed", { match: matches.error?.code, loan: loans.error?.code, followup: followups.error?.code, types: loanTypes.error?.code }); return <main className="p-5"><p role="alert">Requirements could not be loaded.</p></main>; }
  const notes: Followup[] = followups.data ?? [];
  return <main className="min-h-screen bg-slate-50 p-4 sm:p-8"><div className="mx-auto max-w-4xl"><Link href="/admin" className="underline">← Admin dashboard</Link><h1 className="mt-4 text-3xl font-bold text-[#10243A]">Requirements</h1>
    {(["match","loan"] as const).map((kind) => <section key={kind} className="mt-6"><h2 className="text-xl font-bold">{kind === "match" ? "Property requirements" : "Loan requirements"}</h2>
      {(kind === "match" ? matches.data : loans.data)?.map((row) => { const note = notes.find((item) => item.kind === kind && item.requirement_id === row.id); return <article key={row.id} className="mt-3 rounded-xl border bg-white p-4 [overflow-wrap:anywhere]"><h3 className="font-bold">{row.customer_name} · {row.phone}</h3>
        {kind === "match" ? <p className="mt-2 text-sm">{row.purpose} · {row.category} · {row.location} · {row.bedrooms ?? "Any"} BHK · {row.min_budget ?? "Any"} – {row.max_budget ?? "Any"} · {row.move_in_date ?? "No date"}</p> : <p className="mt-2 text-sm">{row.loan_types?.name ?? "Loan type unavailable"} · ₹{Number(row.amount).toLocaleString("en-IN")} · {row.employment} · {row.property_location} · {row.property_value ?? "No property value"} · {row.email}</p>}
        <p className="mt-2 whitespace-pre-wrap text-sm">{row.details}</p><p className="mt-2 text-sm">{row.created_at}</p>
        {kind === "loan" && <AdminLoanEdit loan={row} types={loanTypes.data ?? []} />}
        <AdminRequirementForm id={row.id} kind={kind} status={row.status} remarks={note?.remarks ?? ""} assigned={note?.assigned_to ?? ""} /></article>; })}
      {(kind === "match" ? matches.data : loans.data)?.length === 100 && <p className="mt-3 text-sm">Showing the latest 100 requirements.</p>}
    </section>)}
  </div></main>;
}
