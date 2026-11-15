import Link from "next/link";
import { Suspense } from "react";
import { createSupabaseServerClient } from "../lib/supabase-server";
import { vendorMarketplaceReady, type MarketplaceCategory, type PublicVendor } from "../lib/vendor-marketplace";
import ServicesDirectory from "./ServicesDirectory";

type Search = { category?: string | string[] };
export default function HomeServicesPage({ searchParams }: { searchParams: Promise<Search> }) {
  return <main className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-8"><div className="mx-auto max-w-6xl">
    <Link href="/" className="text-sm font-semibold text-[#10243A] underline">← Home</Link>
    <div className="mt-4 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl font-bold text-[#10243A]">Home Services</h1><p className="mt-2 text-sm text-slate-600">Find service professionals in your area.</p></div><Link href="/home-services/register" className="rounded-lg border border-[#10243A] px-4 py-3 text-sm font-bold text-[#10243A]">Apply as a provider</Link></div>
    {!vendorMarketplaceReady() ? <p role="status" className="mt-5 rounded-xl bg-amber-50 p-4 text-amber-950">The services directory is unavailable until secure database setup is verified. No applications or enquiries can be saved yet.</p> :
      <Suspense fallback={<p className="mt-5" role="status">Loading services...</p>}><Directory searchParams={searchParams} /></Suspense>}
  </div></main>;
}
async function Directory({ searchParams }: { searchParams: Promise<Search> }) {
  const search = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: categoriesData, error: categoryError } = await supabase.from("service_categories").select("id,name,slug,active").eq("active", true).neq("slug", "new-builder-projects").neq("slug", "builder-projects").not("name", "ilike", "New Builder Projects").order("name");
  if (categoryError) { console.error("[services] Categories lookup failed", { code: categoryError.code }); return <p role="alert" className="mt-5">Service categories could not be loaded.</p>; }
  const categories: MarketplaceCategory[] = categoriesData ?? [];
  const requested = typeof search.category === "string" ? search.category : "";
  const selected = categories.find((category) => category.id === requested) ?? categories[0];
  if (!selected) return <p className="mt-5">No service categories are available right now.</p>;
  const { data, error } = await supabase.from("service_vendors").select("id,category_id,public_name,business_name,services,description,city,locality").eq("active", true).eq("category_id", selected.id).order("business_name").order("id").limit(101);
  if (error) { console.error("[services] Provider lookup failed", { code: error.code }); return <p role="alert" className="mt-5">Providers could not be loaded. Please try again.</p>; }
  const providers: PublicVendor[] = data ?? [];
  return <ServicesDirectory categories={categories} selected={selected} providers={providers.slice(0, 100)} hasMore={providers.length > 100} />;
}
