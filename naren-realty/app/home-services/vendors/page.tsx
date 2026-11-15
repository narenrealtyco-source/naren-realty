import Link from "next/link";
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
      .select("id,public_name,business_name,services,description,city,locality,verified,service_categories!inner(name,slug,active)")
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
    <main className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/home-services" className="text-sm font-semibold text-[#10243A] underline">
          ← All home services
        </Link>
        <header className="mt-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">NAREN REALTY · HOME SERVICES</p>
          <h1 className="mt-2 text-2xl font-extrabold text-[#10243A] sm:text-3xl">
            {categoryName ? `${categoryName} Providers` : "Service Providers"}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {categoryName ? `Choose an approved professional for ${categoryName.toLowerCase()} services.` : "Select a service category to find professionals."}
          </p>
        </header>

        {!categoryName ? (
          <section className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <h2 className="font-bold text-[#10243A]">Please select a valid category</h2>
            <Link href="/home-services" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-[#176B45] px-5 font-bold text-white">Browse services</Link>
          </section>
        ) : loadFailed ? (
          <section className="mt-5 rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
            <h2 className="font-bold text-[#10243A]">Providers could not be loaded</h2>
            <p className="mt-2 text-sm text-slate-600">Please try again in a little while.</p>
          </section>
        ) : vendors.length === 0 ? (
          <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7">
            <div className="mx-auto max-w-xl py-5 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-50 text-3xl" aria-hidden="true">⌂</div>
              <h2 className="mt-4 text-lg font-bold text-[#10243A]">No approved providers available yet</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                NAREN REALTY is onboarding and verifying {categoryName.toLowerCase()} professionals. Approved providers will appear here once they are available in your area.
              </p>
            </div>
          </section>
        ) : (
          <section className="mt-5 grid gap-4 sm:grid-cols-2">
            {vendors.map((vendor) => (
              <article key={vendor.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-[#10243A]">{vendor.public_name}</h2>
                    <p className="mt-1 text-sm font-medium text-slate-600">{vendor.business_name}</p>
                  </div>
                  {vendor.verified ? <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Verified</span> : null}
                </div>
                <p className="mt-3 text-sm text-slate-700">{vendor.services}</p>
                <p className="mt-2 line-clamp-3 text-sm text-slate-500">{vendor.description}</p>
                <p className="mt-3 text-xs font-semibold text-slate-500">{vendor.locality}, {vendor.city}</p>
                <Link href={`/home-services/vendors/${vendor.id}`} className="mt-4 inline-flex min-h-10 items-center rounded-xl bg-[#176B45] px-4 text-sm font-bold text-white">
                  View details & enquire
                </Link>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
