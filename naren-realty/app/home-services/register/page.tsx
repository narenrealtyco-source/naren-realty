import Link from "next/link";
import { Suspense } from "react";
import { createSupabaseServerClient } from "../../lib/supabase-server";
import { vendorMarketplaceReady, type MarketplaceCategory } from "../../lib/vendor-marketplace";
import { VendorApplicationForm } from "../VendorForms";

export default function RegisterVendorPage() {
  return <Suspense fallback={<main className="p-5">Loading application...</main>}><Content /></Suspense>;
}

const previewCategories: MarketplaceCategory[] = [
  { id: "preview-plumbing", name: "Plumbing", slug: "plumbing", active: true },
  { id: "preview-electrical", name: "Electrical", slug: "electrical", active: true },
  { id: "preview-painting", name: "Painting", slug: "painting", active: true },
  { id: "preview-carpentry-furniture", name: "Carpentry & Furniture", slug: "carpentry-furniture", active: true },
  { id: "preview-home-cleaning", name: "Home Cleaning", slug: "home-cleaning", active: true },
  { id: "preview-housekeeping-maid", name: "Housekeeping / Maid", slug: "housekeeping-maid", active: true },
  { id: "preview-interior-design", name: "Interior Design", slug: "interior-design", active: true },
  { id: "preview-pest-control", name: "Pest Control", slug: "pest-control", active: true },
  { id: "preview-civil-renovation", name: "Civil Work & Renovation", slug: "civil-renovation", active: true },
  { id: "preview-ac-installation", name: "AC Installation", slug: "ac-installation", active: true },
  { id: "preview-packers-movers", name: "Packers & Movers", slug: "packers-movers", active: true },
  { id: "preview-appliance-repair", name: "Appliance Repair", slug: "appliance-repair", active: true },
  { id: "preview-waterproofing", name: "Waterproofing", slug: "waterproofing", active: true },
  { id: "preview-pet-services", name: "Pet Services", slug: "pet-services", active: true },
  { id: "preview-ac-cleaning-repair", name: "AC Cleaning & Repair", slug: "ac-cleaning-repair", active: true },
  { id: "preview-kitchen-services", name: "Kitchen Services", slug: "kitchen-services", active: true },
];

async function Content() {
  const ready = vendorMarketplaceReady();
  let categories: MarketplaceCategory[] = ready ? [] : previewCategories;
  let failed = false;
  if (ready) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("service_categories").select("id,name,slug,active").eq("active", true).neq("slug", "new-builder-projects").neq("slug", "builder-projects").not("name", "ilike", "New Builder Projects").order("name");
    if (error) { console.error("[vendor] Categories lookup failed", { code: error.code }); failed = true; }
    else categories = data ?? [];
  }
  return <main className="min-h-screen bg-slate-50 p-4 sm:p-8"><div className="mx-auto max-w-2xl">
    <Link href="/home-services" className="text-sm font-semibold underline">← Home Services</Link>
    <h1 className="mb-3 mt-5 text-3xl font-bold text-[#10243A]">Join our service network</h1>
    <p className="mb-5 rounded-xl border border-[#E8E1D6] bg-white px-4 py-3 text-sm leading-6 text-slate-600">A NAREN REALTY account is required to submit an application. <Link href="/account#login" className="font-semibold text-[#10243A] underline underline-offset-2">Sign in or create an account</Link> first, then complete the form below.</p>
    {failed ? <p role="alert">Categories could not be loaded. Please try again later.</p> : <VendorApplicationForm categories={categories} ready={ready} />}
  </div></main>;
}
