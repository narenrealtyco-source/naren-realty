import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { createSupabaseServerClient } from "../../../lib/supabase-server";
import { uuid, vendorMarketplaceReady } from "../../../lib/vendor-marketplace";
import { VendorEnquiryForm } from "../../VendorForms";

export default function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (!vendorMarketplaceReady()) return <main className="min-h-screen bg-[#F4F1EF] p-5 text-[#252525]"><Link href="/home-services/vendors" className="font-semibold text-[#A71930] underline">Provider directory</Link><p className="mt-4" role="status">The provider directory is not available yet.</p></main>;
  return <Suspense fallback={<main className="min-h-screen bg-[#F4F1EF] p-5 text-[#252525]">Loading provider...</main>}><Content params={params} /></Suspense>;
}
async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid(id)) notFound();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("service_vendors").select("id,public_name,business_name,services,description,city,locality,opening_time,closing_time,service_categories!inner(name,active)").eq("id", id).eq("active", true).eq("service_categories.active", true).neq("service_categories.slug", "new-builder-projects").neq("service_categories.slug", "builder-projects").not("service_categories.name", "ilike", "New Builder Projects").maybeSingle();
  if (error) { console.error("[vendor] Provider lookup failed", { code: error.code }); return <main className="min-h-screen bg-[#F4F1EF] p-5"><p role="alert">Provider details could not be loaded.</p></main>; }
  if (!data) notFound();
  const opening = data.opening_time as string | null;
  const closing = data.closing_time as string | null;
  const now = new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false });
  const openNow = opening && closing ? (closing.slice(0, 5) > opening.slice(0, 5) ? now >= opening.slice(0, 5) && now < closing.slice(0, 5) : now >= opening.slice(0, 5) || now < closing.slice(0, 5)) : null;
  const serviceItems: string[] = String(data.services ?? "").split(/[,;\\n]+/).map((item: string) => item.trim()).filter(Boolean);
  return <main className="min-h-screen bg-[#F4F1EF] px-4 py-6 text-[#252525] sm:px-6 sm:py-10">
    <div className="mx-auto max-w-3xl">
      <Link href="/home-services/vendors" className="inline-flex min-h-10 items-center text-sm font-semibold text-[#A71930] transition hover:text-[#861326]">← Back to providers</Link>
      <section className="mt-4 overflow-hidden rounded-2xl border border-[#E7DEDA] bg-white shadow-sm">
        <div className="bg-[#A71930] px-5 py-5 text-white sm:px-7 sm:py-7">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/80">NAREN REALTY · HOME SERVICES</p>
          <p className="mt-5 text-sm font-semibold text-white/85">{data.public_name}</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">{data.business_name}</h1>
          <p className="mt-3 flex items-center gap-2 text-sm text-white/90"><span aria-hidden="true">⌖</span>{data.locality}, {data.city}</p>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-7">
          <section className="rounded-xl border border-[#E7DEDA] bg-[#F4F1EF] p-4">
            <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-[#6B625F]">Shop timings</h2>
            {opening && closing ? <>
              <p className="mt-2 font-semibold text-[#252525]">{opening.slice(0,5)} – {closing.slice(0,5)}</p>
              <p className="mt-1 text-sm font-semibold text-[#A71930]">{openNow ? "Open Now" : "Closed"}</p>
            </> : <p className="mt-2 text-sm font-medium text-[#6B625F]">Hours not provided by this provider</p>}
          </section>
          <section className="rounded-xl border border-[#E7DEDA] bg-white p-4">
            <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-[#6B625F]">Service location</h2>
            <p className="mt-2 font-semibold text-[#252525]">{data.locality}, {data.city}</p>
            <p className="mt-1 text-sm text-[#6B625F]">Service provider · NAREN REALTY Home Services</p>
          </section>
        </div>
        {serviceItems.length > 0 && <section className="border-t border-[#EEE8E5] px-5 py-5 sm:px-7 sm:py-6">
          <h2 className="text-lg font-bold text-[#A71930]">Services offered</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {serviceItems.map((service: string, index: number) => <li key={service + index} className="flex items-start gap-2 rounded-lg bg-[#F4F1EF] px-3 py-2.5 text-sm leading-5 text-[#252525]"><span className="mt-0.5 font-bold text-[#A71930]" aria-hidden="true">✓</span><span>{service}</span></li>)}
          </ul>
        </section>}
        {data.description && <section className="border-t border-[#EEE8E5] px-5 py-5 sm:px-7">
          <h2 className="text-lg font-bold text-[#A71930]">About this provider</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#4B4543]">{data.description}</p>
        </section>}
      </section>
      <div className="mt-5 rounded-2xl border border-[#E7DEDA] bg-white p-4 sm:p-6">
        <h2 className="mb-4 text-lg font-bold text-[#A71930]">Enquire with this provider</h2>
        <VendorEnquiryForm vendorId={data.id} ready />
      </div>
    </div>
  </main>;
}
