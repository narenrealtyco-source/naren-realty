import Link from "next/link";
import { Suspense } from "react";
import { LoanForm } from "../components/RequirementForms";
import { LoanDashboard } from "../components/RequirementDashboards";
import { requirementsReady } from "../lib/requirements";
import { createSupabaseServerClient } from "../lib/supabase-server";

const loanCategories = [
  { slug: "home-loan", name: "Home Loan", description: "Finance for buying, constructing or renovating your home.", image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=900&q=85", tag: "For your dream home" },
  { slug: "car-loan", name: "Car Loan", description: "Funding options for a new or pre-owned car.", image: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=900&q=85", tag: "New & used cars" },
  { slug: "personal-loan", name: "Personal Loan", description: "Unsecured finance for eligible personal needs.", image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=900&q=85", tag: "Flexible personal needs" },
  { slug: "lap", name: "Loan Against Property (LAP)", description: "Explore funding by offering eligible residential or commercial property as security.", image: "https://images.unsplash.com/photo-1460472178825-e5240623afd5?auto=format&fit=crop&w=900&q=85", tag: "Property-backed finance" },
  { slug: "plot-land-loan", name: "Plot / Land Loan", description: "Finance options for purchasing an eligible residential plot or land.", image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=85", tag: "Buy a plot or land" },
  { slug: "commercial-property-loan", name: "Commercial Property Loan", description: "Funding support for eligible shops, offices and commercial premises.", image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=85", tag: "Business properties" },
  { slug: "balance-transfer", name: "Balance Transfer", description: "Explore transferring an existing eligible loan to another lender.", image: "https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=900&q=85", tag: "Review existing loan" },
  { slug: "top-up-loan", name: "Top-up Loan", description: "Check additional borrowing options over an eligible existing loan.", image: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=900&q=85", tag: "Additional funds" },
];

export default function LoansPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  return <Suspense fallback={<main className="min-h-screen bg-[#f7f8fa] p-6 text-slate-600">Loading loan options...</main>}><LoansPageContent searchParams={searchParams} /></Suspense>;
}

async function LoansPageContent({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const params = await searchParams;
  const selected = loanCategories.find((item) => item.slug === params.type);
  return <main className="min-h-screen bg-[#f7f8fa] px-3 py-4 text-slate-900 sm:px-6 sm:py-7">
    <div className="mx-auto max-w-7xl">
      <Link href="/" className="inline-flex min-h-9 items-center text-sm font-semibold text-[#A71930] hover:underline">← Home</Link>
      <header className="mt-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">NAREN REALTY · LOAN ASSISTANCE</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#A71930] sm:text-3xl">Explore Loan Options</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">Choose the type of finance you need and submit your requirement. Our team can review your request and guide you on the next steps.</p>
      </header>

      <section className="mt-7" aria-labelledby="loan-categories">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div><h2 id="loan-categories" className="text-xl font-extrabold text-[#A71930] sm:text-2xl">Browse Loan Categories</h2><p className="mt-1 text-sm text-slate-600">Select a card to start your loan requirement.</p></div>
          <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">8 Options</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {loanCategories.map((item) => {
            const active = selected?.slug === item.slug;
            return <Link key={item.slug} href={`/loans?type=${item.slug}#loan-requirement`} aria-current={active ? "true" : undefined} className={`group min-w-0 overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${active ? "border-emerald-600 ring-2 ring-emerald-100" : "border-slate-200"}`}>
              <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                <img src={item.image} alt={item.name} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                <span className="absolute right-2 top-2 rounded-full bg-white/95 px-2 py-1 text-[10px] font-bold text-[#A71930]">{active ? "Selected" : "Explore"}</span>
              </div>
              <div className="p-3 sm:p-4">
                <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">{item.tag}</p>
                <h3 className="mt-1 text-sm font-bold leading-snug text-[#A71930] sm:text-base">{item.name}</h3>
                <p className="mt-1 hidden text-xs leading-relaxed text-slate-500 sm:block">{item.description}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-800">Apply / Enquire <span aria-hidden="true">→</span></span>
              </div>
            </Link>;
          })}
        </div>
      </section>

      {selected ? <section id="loan-requirement" className="mt-7 scroll-mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3 sm:p-5">
        <div className="mb-4 flex items-start gap-3">
          <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Selected loan category</p><h2 className="mt-1 text-xl font-extrabold text-[#A71930]">{selected.name}</h2><p className="mt-1 text-sm text-slate-600">{selected.description}</p></div>
          <Link href="/loans#loan-categories" className="ml-auto shrink-0 text-xs font-bold text-emerald-800 hover:underline">Change</Link>
        </div>
        <Suspense fallback={<p className="rounded-xl bg-white p-5 text-sm text-slate-600">Loading requirement form...</p>}><LoansContent selectedSlug={selected.slug} /></Suspense>
      </section> : <section className="mt-7 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-50 text-2xl" aria-hidden="true">₹</div>
        <h2 className="mt-3 font-bold text-[#A71930]">Start with a loan category</h2>
        <p className="mx-auto mt-1 max-w-lg text-sm text-slate-600">Choose any card above to open its requirement form. You can review your submitted requests in the same section.</p>
      </section>}
    </div>
  </main>;
}

async function LoansContent({ selectedSlug }: { selectedSlug: string }) {
  const ready = requirementsReady();
  const supabase = await createSupabaseServerClient();
  const { data: types, error: typeError } = await supabase.from("loan_types").select("id,name").eq("active", true).order("name");
  if (typeError) {
    console.error("[loans] Loan types lookup failed", { code: typeError.code });
    return <p role="alert" className="rounded-xl bg-white p-4 text-sm text-red-700">Loan categories could not be loaded. Please try again later.</p>;
  }
  const aliases: Record<string, string[]> = {
    "home-loan": ["home loan"],
    "car-loan": ["car loan", "vehicle loan"],
    "personal-loan": ["personal loan"],
    "lap": ["loan against property", "lap"],
    "plot-land-loan": ["plot loan", "land loan", "plot/land loan"],
    "commercial-property-loan": ["commercial property loan"],
    "balance-transfer": ["home loan balance transfer", "balance transfer"],
    "top-up-loan": ["home loan top-up", "home loan top up", "top-up loan", "top up loan"],
  };
  const wanted = aliases[selectedSlug] ?? [];
  const selectedTypeId = types?.find((type) => wanted.includes(type.name.trim().toLowerCase()))?.id;
  if (!ready) return <><LoanForm ready={false} types={types ?? []} defaultTypeId={selectedTypeId} /><p className="mt-3 rounded-xl bg-white p-4 text-sm text-amber-900">Requirement saving and request management will become available after the secure loan database setup is enabled. Your details are not being saved yet.</p></>;
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return <><LoanForm ready types={types ?? []} defaultTypeId={selectedTypeId} /><p className="mt-4 text-sm">Sign in to view your requests. <Link className="font-semibold underline" href="/account#login">Sign in</Link></p></>;
  const { data, error } = await supabase.from("loan_requirements").select("id,customer_name,phone,loan_type_id,amount,status,created_at").eq("customer_id", user.id).order("created_at", { ascending: false });
  if (error) { console.error("[loans] Requirements lookup failed", { code: error.code }); return <><LoanForm ready types={types ?? []} defaultTypeId={selectedTypeId} /><p role="alert" className="mt-4 text-sm text-red-700">Loan requirements could not be loaded.</p></>; }
  const summaries = (data ?? []).map((row) => ({ id: row.id, customer_name: row.customer_name, phone: row.phone, loan_type_id: row.loan_type_id, amount: row.amount, status: row.status, created_at: row.created_at, type_name: types?.find((type) => type.id === row.loan_type_id)?.name ?? "Loan type unavailable" }));
  return <><LoanForm ready types={types ?? []} defaultTypeId={selectedTypeId} /><LoanDashboard loans={summaries} types={types ?? []} /></>;
}
