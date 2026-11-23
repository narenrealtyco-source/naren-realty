import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { createSupabaseServerClient } from "../../lib/supabase-server";

const categories: Record<string, string> = {
  plumbing: "Plumbing",
  electrical: "Electrical",
  painting: "Painting",
  "carpentry-furniture": "Carpentry & Furniture",
  "home-cleaning": "Home Cleaning",
  "housekeeping-maid": "Housekeeping / Maid",
  "interior-design": "Interior Design",
  "pest-control": "Pest Control",
  "civil-renovation": "Civil Work & Renovation",
  "ac-installation": "AC Installation",
  "packers-movers": "Packers & Movers",
  "appliance-repair": "Appliance Repair",
  waterproofing: "Waterproofing",
  "pet-services": "Pet Services",
  "ac-cleaning-repair": "AC Cleaning & Repair",
  "kitchen-services": "Kitchen Services",
};

type Vendor = {
  id: string;
  public_name: string;
  business_name: string;
  services: string;
  description: string;
  city: string;
  locality: string;
  verified: boolean;
  profile_image_url: string | null;
  gallery_urls: string[];
  opening_time: string | null;
  closing_time: string | null;
};

export default function VendorsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string | string[] }>;
}) {
  return (
    <Suspense fallback={<main className="min-h-screen p-6">Loading service providers...</main>}>
      <VendorCategoryContent searchParams={searchParams} />
    </Suspense>
  );
}

async function VendorCategoryContent({
  searchParams,
}: {
  searchParams: Promise<{ category?: string | string[] }>;
}) {
  const params = await searchParams;
  const slug = typeof params.category === "string" ? params.category : "";
  const categoryName = categories[slug];
  let vendors: Vendor[] = [];
  let loadFailed = false;

  if (categoryName) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("service_vendors")
      .select("id,public_name,business_name,services,description,city,locality,verified,profile_image_url,gallery_urls,opening_time,closing_time,service_categories!inner(name,slug,active)")
      .eq("active", true)
      .eq("service_categories.active", true)
      .eq("service_categories.slug", slug)
      .order("verified", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[vendor] Directory lookup failed", { code: error.code });
      loadFailed = true;
    } else {
      vendors = (data ?? []) as unknown as Vendor[];
    }
  }

  return (
    <main className="min-h-screen bg-[#F4F1EF] p-4 text-slate-900 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/home-services" className="text-sm font-semibold text-[#A71930] underline">
          ← All home services
        </Link>
        <header className="mt-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#A71930]">NAREN REALTY · HOME SERVICES</p>
          <h1 className="mt-2 text-2xl font-extrabold text-[#A71930] sm:text-3xl">
            {categoryName ? `${categoryName} Providers` : "Service Providers"}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {categoryName ? `Choose an approved professional for ${categoryName.toLowerCase()} services.` : "Select a service category to find professionals."}
          </p>
        </header>

        {!categoryName ? (
          <section className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <h2 className="font-bold text-[#A71930]">Please select a valid category</h2>
            <Link href="/home-services" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-[#A71930] px-5 font-bold text-white">Browse services</Link>
          </section>
        ) : loadFailed ? (
          <section className="mt-5 rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
            <h2 className="font-bold text-[#A71930]">Providers could not be loaded</h2>
            <p className="mt-2 text-sm text-slate-600">Please try again in a little while.</p>
          </section>
        ) : vendors.length === 0 ? (
          <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7">
            <div className="mx-auto max-w-xl py-5 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-[#F8E9EC] text-3xl" aria-hidden="true">⌂</div>
              <h2 className="mt-4 text-lg font-bold text-[#A71930]">No approved providers available yet</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                NAREN REALTY is onboarding and verifying {categoryName.toLowerCase()} professionals. Approved providers will appear here once they are available in your area.
              </p>
            </div>
          </section>
        ) : (
          <section className="mt-5 grid gap-4 sm:grid-cols-2">
            {vendors.map((vendor) => {
              const cleanDescription = vendor.description.replace(/service\s+partner\s+application/gi, "").replace(/\s{2,}/g, " ").trim();
              const cleanServices = vendor.services.replace(/service\s+partner\s+application/gi, "").replace(/\s{2,}/g, " ").trim();
              const photos = [vendor.profile_image_url, ...(Array.isArray(vendor.gallery_urls) ? vendor.gallery_urls : [])]
                .filter((photo): photo is string => typeof photo === "string" && photo.trim().length > 0);
              const detailHref = `/home-services/vendors/${vendor.id}`;
              const opening = vendor.opening_time?.slice(0, 5) ?? null;
              const closing = vendor.closing_time?.slice(0, 5) ?? null;
              const now = new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false });
              const isOpen = opening && closing ? (closing > opening ? now >= opening && now < closing : now >= opening || now < closing) : null;
              const servicesList = cleanServices.split(",").map((item) => item.trim()).filter(Boolean);
              return (
                <article key={vendor.id} className="group flex h-full flex-col overflow-hidden rounded-3xl border border-[#EAD5D9] bg-white shadow-[0_8px_28px_rgba(167,25,48,0.07)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(167,25,48,0.13)]">
                  <div className="relative h-52 w-full shrink-0 overflow-hidden bg-[#F4F1EF] sm:h-60">
                    {photos[0] ? (
                      <Image src={photos[0]} alt={`${vendor.business_name} service provider`} fill sizes="(max-width: 639px) 100vw, 50vw" unoptimized className="object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                    ) : (
                      <div className="flex size-full items-center justify-center bg-gradient-to-br from-[#FCFAF5] via-[#F8E9EC] to-[#EAD5D9]">
                        <div className="text-center text-[#A71930]"><span className="block text-5xl" aria-hidden="true">⌂</span><span className="mt-2 block text-xs font-bold uppercase tracking-[0.18em]">NAREN REALTY</span></div>
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-slate-950/75 to-transparent px-4 pb-4 pt-12">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-white">{categoryName} Professional</p>
                      {vendor.verified ? <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#EAD5D9] bg-[#F8E9EC] px-3 py-1.5 text-[11px] font-bold text-[#A71930]"><span aria-hidden="true">✓</span> Verified</span> : null}
                    </div>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col p-5 sm:p-6">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-500">{vendor.public_name}</p>
                      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-2xl font-extrabold tracking-tight text-[#A71930]">{vendor.business_name}</h2>
                        <span className="rounded-full bg-[#F4F1EF] px-3 py-1.5 text-xs font-semibold text-[#A71930]">⌖ {vendor.locality}, {vendor.city}</span>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full bg-[#F8E9EC] px-3 py-1.5 text-xs font-semibold text-[#A71930]"><span aria-label="No ratings yet" className="tracking-[0.12em] text-[#A71930]">☆☆☆☆☆</span><span className="text-slate-600">Not rated yet</span></span>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-[#F8F9FA] p-4">
                      <div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Shop timings</p><p className="mt-1 text-sm font-bold text-[#A71930]">{opening && closing ? opening + " – " + closing : "Timing not provided"}</p></div>
                      <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${isOpen === null ? "bg-slate-200 text-slate-600" : isOpen ? "bg-[#F8E9EC] text-[#A71930]" : "bg-rose-50 text-rose-700"}`}>{isOpen === null ? "Hours unavailable" : isOpen ? "● Open Now" : "● Closed"}</span>
                    </div>
                    <div className="mt-4 rounded-2xl bg-[#F8F9FA] p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-[#A71930]">Services offered</p>
                      <div className="mt-3 flex flex-wrap gap-2">{servicesList.map((service, index) => <span key={service + index} className="rounded-full border border-[#EAD5D9] bg-white px-3 py-2 text-xs font-semibold text-[#252525]">{service}</span>)}</div>
                    </div>
                    {cleanDescription ? <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-500">{cleanDescription}</p> : null}
                    <p className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-500"><span aria-hidden="true" className="text-[#A71930]">⌖</span>{vendor.locality}, {vendor.city}</p>
                    <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
                      <Link href={detailHref} className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#A71930] bg-white px-3 text-sm font-bold text-[#A71930] transition hover:bg-[#F4F1EF]">View Details</Link>
                      <Link href={`${detailHref}#enquiry`} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#A71930] px-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#861326]">Enquire Now</Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
