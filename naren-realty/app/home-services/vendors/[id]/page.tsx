import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { createSupabaseServerClient } from "../../../lib/supabase-server";
import { uuid, vendorMarketplaceReady } from "../../../lib/vendor-marketplace";
import { VendorEnquiryForm } from "../../VendorForms";

export default function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (!vendorMarketplaceReady()) return <main className="p-5"><Link href="/home-services/vendors" className="underline">Provider directory</Link><p className="mt-4" role="status">The provider directory is not available yet.</p></main>;
  return <Suspense fallback={<main className="p-5">Loading provider...</main>}><Content params={params} /></Suspense>;
}
async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid(id)) notFound();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("service_vendors").select("id,public_name,business_name,services,description,city,locality,opening_time,closing_time,service_categories!inner(name,active)").eq("id", id).eq("active", true).eq("service_categories.active", true).neq("service_categories.slug", "new-builder-projects").neq("service_categories.slug", "builder-projects").not("service_categories.name", "ilike", "New Builder Projects").maybeSingle();
  if (error) { console.error("[vendor] Provider lookup failed", { code: error.code }); return <main className="p-5"><p role="alert">Provider details could not be loaded.</p></main>; }
  if (!data) notFound();
  const opening = data.opening_time as string | null;
  const closing = data.closing_time as string | null;
  const now = new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false });
  const openNow = opening && closing ? (closing.slice(0, 5) > opening.slice(0, 5) ? now >= opening.slice(0, 5) && now < closing.slice(0, 5) : now >= opening.slice(0, 5) || now < closing.slice(0, 5)) : null;
  const serviceChips: string[] = String(data.services ?? "").split(",").map((item: string) => item.trim()).filter(Boolean);
  return <main className="min-h-screen bg-slate-50 p-4 sm:p-8"><div className="mx-auto max-w-3xl">
    <Link href="/home-services/vendors" className="text-sm font-semibold underline">← Providers</Link>
    <p className="mt-5 text-sm text-slate-500">{data.public_name}</p><h1 className="mt-1 text-3xl font-bold text-[#10243A]">{data.business_name}</h1>
    <p className="mt-2 text-slate-600">{data.locality}, {data.city}</p>
    <div className="mt-4 rounded-xl border border-[#E8E1D6] bg-white p-4"><p className="text-xs font-bold uppercase text-slate-500">Shop timings</p><p className="mt-1 font-semibold text-[#10243A]">{opening && closing ? opening.slice(0,5) + " – " + closing.slice(0,5) : "Timing not provided"}</p><p className="mt-1 text-sm font-semibold">{openNow === null ? "Hours unavailable" : openNow ? "Open Now" : "Closed"}</p></div><div className="mt-4 flex flex-wrap gap-2">{serviceChips.map((service: string,index: number) => <span key={service + index} className="rounded-full border border-[#D8C49F] bg-white px-3 py-2 text-sm text-[#33465A]">{service}</span>)}</div><p className="mb-6 mt-3 whitespace-pre-wrap text-slate-700">{data.description}</p>
    <VendorEnquiryForm vendorId={data.id} ready />
  </div></main>;
}
