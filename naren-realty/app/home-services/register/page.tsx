import Link from "next/link";
import { Suspense } from "react";
import { createSupabaseServerClient } from "../../lib/supabase-server";
import { vendorMarketplaceReady, type MarketplaceCategory } from "../../lib/vendor-marketplace";
import { VendorApplicationForm } from "../VendorForms";

export default function RegisterVendorPage() {
  return <Suspense fallback={<main className="p-5">Loading application...</main>}><Content /></Suspense>;
}

async function Content() {
  const ready = vendorMarketplaceReady();
  let categories: MarketplaceCategory[] = [];
  let failed = false;
  if (ready) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("service_categories").select("id,name,slug,active").eq("active", true).neq("slug", "new-builder-projects").neq("slug", "builder-projects").not("name", "ilike", "New Builder Projects").order("name");
    if (error) { console.error("[vendor] Categories lookup failed", { code: error.code }); failed = true; }
    else categories = data ?? [];
  }
  return <main className="min-h-screen bg-slate-50 p-4 sm:p-8"><div className="mx-auto max-w-2xl">
    <Link href="/home-services" className="text-sm font-semibold underline">← Home Services</Link>
    <h1 className="mb-5 mt-5 text-3xl font-bold text-[#10243A]">Join our service network</h1>
    {failed ? <p role="alert">Categories could not be loaded. Please try again later.</p> : <VendorApplicationForm categories={categories} ready={ready} />}
  </div></main>;
}
