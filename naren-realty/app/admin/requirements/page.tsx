import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { AdminLoanEdit, AdminRequirementDelete, AdminRequirementForm } from "../../components/RequirementForms";
import { requirementsReady } from "../../lib/requirements";
import { requireAdmin } from "../../lib/supabase-server";

type Followup = { requirement_id: string; assigned_to: string | null; remarks: string };

function parsePropertyExtras(raw: unknown) {
  const empty = { clientType: "", bhkChoice: "", furnishingChoice: "", notes: "" };
  if (typeof raw !== "string" || !raw.trim()) return empty;
  try {
    const value: unknown = JSON.parse(raw);
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const item = value as Record<string, unknown>;
      return {
        clientType: typeof item.clientType === "string" ? item.clientType : "",
        bhkChoice: typeof item.bhkChoice === "string" ? item.bhkChoice : "",
        furnishingChoice: typeof item.furnishingChoice === "string" ? item.furnishingChoice : "",
        notes: typeof item.notes === "string" ? item.notes : "",
      };
    }
  } catch {}
  return { ...empty, notes: raw };
}
function displayLabel(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "—";
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function formatBudget(value: unknown) {
  if (value === null || value === undefined || value === "") return "Any";
  const amount = Number(value);
  return Number.isFinite(amount) ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount) : "Any";
}
function formatCreatedAt(value: unknown) {
  if (typeof value !== "string") return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(date) + " IST";
}
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
  return <main className="min-h-screen bg-slate-50 p-4 sm:p-8"><div className="mx-auto max-w-4xl"><Link href="/admin" className="text-sm font-semibold text-[#24527A] underline">← Admin dashboard</Link><h1 className="mt-4 text-3xl font-bold text-[#10243A]">Requirements</h1>
    <nav aria-label="Requirement status filter" className="mt-5 flex flex-wrap gap-2">{(["all","pending","approved","rejected","closed"] as const).map((status) => <Link key={status} href={status === "all" ? "/admin/requirements" : `/admin/requirements?status=${status}`} aria-current={statusFilter === status ? "page" : undefined} className={`rounded-full border px-4 py-2 text-sm font-semibold ${statusFilter === status ? "border-[#10243A] bg-[#10243A] text-white" : "border-slate-300 bg-white text-slate-700"}`}>{status === "all" ? "All" : status[0].toUpperCase() + status.slice(1)}</Link>)}</nav>
    {(["match","loan"] as const).map((kind) => <section key={kind} className="mt-8"><div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-bold text-[#10243A]">{kind === "match" ? "Property requirements" : "Loan requirements"}</h2><span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">{(kind === "match" ? propertyRows : loanRows).length} shown</span></div>
      {(kind === "match" ? propertyRows : loanRows).map((row) => {
        const note = kind === "loan" ? notes.find((item) => item.requirement_id === row.id) : null;
        if (kind === "match") {
          const extra = parsePropertyExtras(row.additional_requirements);
          const config = extra.bhkChoice || (row.preferred_bhk ? `${row.preferred_bhk} BHK` : "Any");
          const status = displayLabel(row.status);
          return <article key={row.id} className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Property requirement</p><h3 className="mt-1 break-words text-lg font-bold text-[#10243A]">{row.customer_name || "Customer"}</h3><a className="mt-1 inline-flex text-sm font-semibold text-[#24527A] underline" href={`tel:${row.customer_phone}`}>{row.customer_phone || "Phone unavailable"}</a></div>
              <span className="w-fit rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800">{status}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 sm:p-5">
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-medium text-slate-500">Looking to</p><p className="mt-1 font-semibold text-slate-900">{displayLabel(row.requirement_type)}</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-medium text-slate-500">Property type</p><p className="mt-1 font-semibold text-slate-900">{displayLabel(row.property_category)}</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-medium text-slate-500">Preferred location</p><p className="mt-1 break-words font-semibold text-slate-900">{row.preferred_location || "—"}</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-medium text-slate-500">Configuration</p><p className="mt-1 font-semibold text-slate-900">{config}</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-medium text-slate-500">Budget</p><p className="mt-1 break-words font-semibold text-slate-900">{formatBudget(row.min_budget)} – {formatBudget(row.max_budget)}</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-medium text-slate-500">Move-in date</p><p className="mt-1 font-semibold text-slate-900">{row.move_in_date || "Flexible / not specified"}</p></div>
            </div>
            {(extra.clientType || extra.furnishingChoice) && <div className="px-4 pb-4 sm:px-5"><p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Preferences</p><div className="flex flex-wrap gap-2">{extra.clientType && <span className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-700">Client: {displayLabel(extra.clientType)}</span>}{extra.furnishingChoice && <span className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-700">Furnishing: {displayLabel(extra.furnishingChoice)}</span>}</div></div>}
            {extra.notes && <div className="mx-4 mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 sm:mx-5"><p className="text-xs font-bold uppercase tracking-wider text-amber-900">Additional requirements</p><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">{extra.notes}</p></div>}
            <div className="flex flex-col gap-1 border-t border-slate-100 px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-5"><span>Submitted: {formatCreatedAt(row.created_at)}</span><span className="break-all">ID: {row.id}</span></div>
            <div className="border-t border-slate-100 p-4 sm:p-5"><details><summary className="cursor-pointer select-none font-semibold text-[#10243A]">Manage status & follow-up</summary><div className="pt-3"><AdminRequirementForm id={row.id} kind="match" status={row.status} remarks={row.admin_notes ?? ""} assigned="" /></div></details><AdminRequirementDelete id={row.id} kind="match" /></div>
          </article>;
        }
        return <article key={row.id} className="mt-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm [overflow-wrap:anywhere]"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-[#10243A]">{row.customer_name} · {row.phone}</h3><p className="mt-2 text-sm">{row.loan_types?.name ?? "Loan type unavailable"} · ₹{Number(row.amount).toLocaleString("en-IN")} · {row.employment} · {row.property_location} · {row.property_value ?? "No property value"} · {row.email}</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">{displayLabel(row.status)}</span></div>
          <p className="mt-2 whitespace-pre-wrap text-sm">{row.details}</p><p className="mt-2 text-xs text-slate-500">Submitted: {formatCreatedAt(row.created_at)}</p>
          <AdminLoanEdit loan={row} types={loanTypes.data ?? []} /><details className="mt-3"><summary className="cursor-pointer font-semibold">Manage status & follow-up</summary><div className="pt-3"><AdminRequirementForm id={row.id} kind="loan" status={row.status} remarks={note?.remarks ?? ""} assigned={note?.assigned_to ?? ""} /></div></details><AdminRequirementDelete id={row.id} kind="loan" /></article>;
      })}
      {(kind === "match" ? matches.data : loans.data)?.length === 100 && <p className="mt-3 text-sm text-slate-600">Showing the latest 100 requirements.</p>}
      {(kind === "match" ? propertyRows : loanRows).length === 0 && <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">No {kind === "match" ? "property" : "loan"} requirements found for this filter.</p>}
    </section>)}
  </div></main>;
}
