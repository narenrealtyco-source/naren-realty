import Link from "next/link";
import { Suspense } from "react";

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

export default function VendorsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string | string[] }>;
}) {
  return <Suspense fallback={<main className="min-h-screen p-6">Loading service providers...</main>}><VendorCategoryContent searchParams={searchParams} /></Suspense>;
}

async function VendorCategoryContent({ searchParams }: { searchParams: Promise<{ category?: string | string[] }> }) {
  const params = await searchParams;
  const slug = typeof params.category === "string" ? params.category : "";
  const categoryName = categories[slug];

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
        ) : (
          <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7">
            <div className="mx-auto max-w-xl py-5 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-50 text-3xl" aria-hidden="true">⌂</div>
              <h2 className="mt-4 text-lg font-bold text-[#10243A]">No approved providers available yet</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                NAREN REALTY is onboarding and verifying {categoryName.toLowerCase()} professionals. Approved providers will appear here once they are available in your area.
              </p>
              <Link href="/home-services/register" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#176B45] px-5 text-sm font-bold text-white hover:bg-[#125638]">
                Apply as Service Provider
              </Link>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}