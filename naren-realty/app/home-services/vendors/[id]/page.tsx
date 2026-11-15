import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { createSupabaseServerClient } from "../../../lib/supabase-server";
import { uuid, vendorMarketplaceReady } from "../../../lib/vendor-marketplace";
import { VendorEnquiryFlow } from "../../VendorEnquiryFlow";

export default function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (!vendorMarketplaceReady()) return <main className="p-5"><Link href="/home-services/vendors" className="underline">Provider directory</Link><p className="mt-4" role="status">The provider directory is not available yet.</p></main>;
  return <Suspense fallback={<main className="p-5">Loading provider...</main>}><Content params={params} /></Suspense>;
}
async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid(id)) notFound();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("service_vendors").select("id,public_name,business_name,services,description,city,locality,service_categories!inner(name,active)").eq("id", id).eq("active", true).eq("service_categories.active", true).neq("service_categories.slug", "new-builder-projects").neq("service_categories.slug", "builder-projects").not("service_categories.name", "ilike", "New Builder Projects").maybeSingle();
  if (error) { console.error("[vendor] Provider lookup failed", { code: error.code }); return <main className="p-5"><p role="alert">Provider details could not be loaded.</p></main>; }
  if (!data) notFound();
  return <main className="min-h-screen bg-slate-50 p-4 sm:p-8"><div className="mx-auto max-w-3xl">
    <Link href="/home-services/vendors" className="text-sm font-semibold underline">← Providers</Link>
    <h1 className="mt-5 text-3xl font-bold text-[#10243A]">{data.public_name}</h1><p className="mt-1 font-semibold">{data.business_name}</p>
    <p className="mt-2 text-slate-600">{data.locality}, {data.city}</p>
    <p className="mt-4 font-semibold">{data.services}</p><p className="mb-6 mt-3 whitespace-pre-wrap text-slate-700">{data.description}</p>
    <VendorEnquiryFlow vendorId={data.id} initialLocality={data.locality} />
  </div></main>;
}
