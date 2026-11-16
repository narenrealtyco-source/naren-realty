import Link from "next/link";
import { Suspense } from "react";
import MatchesPostRequirement from "../components/MatchesPostRequirement";
import { MatchDashboard } from "../components/RequirementDashboards";
import { matchesReady, type MatchRequirement } from "../lib/requirements";
import { createSupabaseServerClient } from "../lib/supabase-server";
import { getApprovedPropertiesFromSupabase } from "../lib/supabase-properties";
import { visitRequestsReady } from "../properties/visit-actions";

export default function MatchesPage() {
  const ready = matchesReady();
  return <main className="min-h-screen bg-white p-4 text-slate-800 sm:p-8"><div className="mx-auto max-w-6xl">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><Link href="/" className="text-sm font-semibold text-[#8A672E] hover:underline">← Home</Link><h1 className="mt-3 text-3xl font-bold tracking-tight text-[#7A5A27]">Property Matches</h1><p className="mt-2 text-sm text-slate-600">Explore approved rental and resale properties matching your needs.</p></div>
      <div className="sm:self-start"><MatchesPostRequirement ready={ready} /></div>
    </div>
    {ready && <Suspense fallback={<p className="mt-6 text-sm text-slate-500">Loading matching properties...</p>}><Requirements /></Suspense>}
  </div></main>;
}
async function Requirements() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return <section className="mt-8 rounded-2xl border border-[#E8D9BC] bg-white p-5"><h2 className="font-semibold text-[#7A5A27]">Sign in to see your saved requirements</h2><p className="mt-2 text-sm text-slate-600">You can browse approved properties below. Sign in to post and track your requirements.</p><Link className="mt-3 inline-block font-semibold text-[#9A702E] underline" href="/account#login">Sign in</Link><PublicProperties /></section>;

  const { data, error } = await supabase.from("property_requirements")
    .select("id,requirement_type,property_category,preferred_location,preferred_bhk,min_budget,max_budget,move_in_date,additional_requirements,customer_name,customer_phone,status")
    .eq("customer_id", user.id).order("created_at", { ascending: false });
  if (error) { console.error("[matches] Requirements lookup failed", { code: error.code }); return <p role="alert" className="mt-5">Requirements could not be loaded.</p>; }
  const categoryMap = { flat: "Flat", pg: "PG", hostel: "Hostel", airbnb: "Airbnb", short_stay: "Short Stay" } as const;
  const requirements: MatchRequirement[] = (data ?? []).map((row) => ({
    id: row.id, purpose: row.requirement_type === "buy" ? "Buy" : "Rent",
    category: categoryMap[row.property_category as keyof typeof categoryMap] ?? "Flat",
    location: row.preferred_location, bedrooms: row.preferred_bhk, min_budget: row.min_budget, max_budget: row.max_budget,
    move_in_date: row.move_in_date, details: row.additional_requirements ?? "", customer_name: row.customer_name,
    phone: row.customer_phone, status: row.status === "closed" ? "Closed" : row.status.charAt(0).toUpperCase() + row.status.slice(1)
  }));
  let properties;
  try { properties = await getApprovedPropertiesFromSupabase(); }
  catch { return <p role="alert" className="mt-5">Approved properties could not be loaded.</p>; }
  const visitsReady = await visitRequestsReady();
  return <MatchDashboard requirements={requirements} properties={properties} visitsReady={visitsReady} />;
}
async function PublicProperties() {
  let properties;
  try { properties = await getApprovedPropertiesFromSupabase(); }
  catch { return <p role="alert" className="mt-4">Approved properties could not be loaded.</p>; }
  const { PublicPropertyBrowser } = await import("../components/RequirementDashboards");
  const visitsReady = await visitRequestsReady();
  return <PublicPropertyBrowser properties={properties} visitsReady={visitsReady} />;
}
