import Link from "next/link";
import { Suspense } from "react";
import { MatchForm } from "../components/RequirementForms";
import { MatchDashboard } from "../components/RequirementDashboards";
import { matchesReady, type MatchRequirement } from "../lib/requirements";
import { createSupabaseServerClient } from "../lib/supabase-server";
import { getApprovedPropertiesFromSupabase } from "../lib/supabase-properties";
import { visitRequestsReady } from "../properties/visit-actions";

export default function MatchesPage() {
  const ready = matchesReady();
  return <main className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-8"><div className="mx-auto max-w-5xl">
    <Link href="/" className="text-sm font-semibold underline">← Home</Link><h1 className="mt-4 text-3xl font-bold text-[#10243A]">Matches</h1>
    <p className="mb-5 mt-2 text-sm text-slate-600">Tell us what you need and view matching approved properties.</p>
    <MatchForm ready={ready} />
    {ready && <Suspense fallback={<p className="mt-5">Loading requirements...</p>}><Requirements /></Suspense>}
  </div></main>;
}
async function Requirements() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return <p className="mt-5">Sign in to view your requirements. <Link className="underline" href="/account#login">Sign in</Link></p>;

  const { data, error } = await supabase
    .from("property_requirements")
    .select("id,requirement_type,property_category,preferred_location,preferred_bhk,min_budget,max_budget,move_in_date,additional_requirements,customer_name,customer_phone,status")
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[matches] Requirements lookup failed", { code: error.code });
    return <p role="alert" className="mt-5">Requirements could not be loaded.</p>;
  }

  const categoryMap = {
    flat: "Flat",
    pg: "PG",
    hostel: "Hostel",
    airbnb: "Airbnb",
    short_stay: "Short Stay"
  } as const;

  const requirements: MatchRequirement[] = (data ?? []).map((row) => ({
    id: row.id,
    purpose: row.requirement_type === "buy" ? "Buy" : "Rent",
    category: categoryMap[row.property_category as keyof typeof categoryMap] ?? "Flat",
    location: row.preferred_location,
    bedrooms: row.preferred_bhk,
    min_budget: row.min_budget,
    max_budget: row.max_budget,
    move_in_date: row.move_in_date,
    details: row.additional_requirements ?? "",
    customer_name: row.customer_name,
    phone: row.customer_phone,
    status: row.status === "closed" ? "Closed" : row.status.charAt(0).toUpperCase() + row.status.slice(1)
  }));

  let properties;
  try { properties = await getApprovedPropertiesFromSupabase(); }
  catch { return <p role="alert" className="mt-5">Approved properties could not be loaded.</p>; }

  const visitsReady = await visitRequestsReady();
  return <MatchDashboard requirements={requirements} properties={properties} visitsReady={visitsReady} />;
}