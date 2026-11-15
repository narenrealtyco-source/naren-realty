import Link from "next/link";
import { Suspense } from "react";
import { LoanForm } from "../components/RequirementForms";
import { LoanDashboard } from "../components/RequirementDashboards";
import { requirementsReady } from "../lib/requirements";
import { createSupabaseServerClient } from "../lib/supabase-server";

export default function LoansPage() {
  return <main className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-8"><div className="mx-auto max-w-4xl">
    <Link href="/" className="text-sm font-semibold underline">← Home</Link><h1 className="mt-4 text-3xl font-bold text-[#10243A]">Loans</h1>
    <p className="mb-5 mt-2 text-sm text-slate-600">Request loan assistance. Submitting a request does not approve a loan.</p>
    <a href="#create-loan" className="mb-5 inline-flex min-h-11 items-center rounded-lg bg-amber-400 px-4 text-sm font-bold text-slate-950">Create Loan Requirement</a>
    <div id="create-loan">
    {!requirementsReady() ? <LoanForm ready={false} types={[]} /> : <Suspense fallback={<p>Loading loan requirements...</p>}><LoansContent /></Suspense>}
    </div>
  </div></main>;
}
async function LoansContent() {
  const supabase = await createSupabaseServerClient();
  const { data: types, error: typeError } = await supabase.from("loan_types").select("id,name").eq("active", true).order("name");
  if (typeError) { console.error("[loans] Loan types lookup failed", { code: typeError.code }); return <p role="alert">Loan types could not be loaded.</p>; }
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return <><LoanForm ready types={types ?? []} /><p className="mt-4">Sign in to view your requests. <Link className="underline" href="/account#login">Sign in</Link></p></>;
  const { data, error } = await supabase.from("loan_requirements").select("id,customer_name,phone,loan_type_id,amount,status,created_at").eq("customer_id", user.id).order("created_at", { ascending: false });
  if (error) { console.error("[loans] Requirements lookup failed", { code: error.code }); return <><LoanForm ready types={types ?? []} /><p role="alert" className="mt-4">Loan requirements could not be loaded.</p></>; }
  const summaries = (data ?? []).map((row) => ({ id: row.id, customer_name: row.customer_name, phone: row.phone, loan_type_id: row.loan_type_id, amount: row.amount, status: row.status, created_at: row.created_at, type_name: types?.find((type) => type.id === row.loan_type_id)?.name ?? "Loan type unavailable" }));
  return <><LoanForm ready types={types ?? []} /><LoanDashboard loans={summaries} types={types ?? []} /></>;
}
