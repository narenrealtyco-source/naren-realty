import Link from "next/link";
import type { MarketplaceCategory, PublicVendor } from "../lib/vendor-marketplace";

const icons: Record<string, string> = {
  electrician: "M13 2 5 13h6l-1 9 9-12h-6z",
  "key-maker-locksmith": "M14 8a4 4 0 1 1-3 6l-6 6H2v-3l7-7a4 4 0 0 1 5-2zm1 2h.01",
  "modular-kitchen": "M3 9h18v11H3zM3 6h18M8 9v11m8-11v11m-6-8h1m6 0h1",
  painting: "M4 3h12v5H4zM10 8v3h8v3h-5v7h-3v-7",
  plumber: "M4 5h8v3H9v4h7v4h3v3h-6v-4H6V8H4z",
  "carpenter-furniture": "M4 20h16M6 20v-8h12v8M4 9l8-6 8 6M8 12V9h8v3",
  "home-cleaning": "M14 3 8 12m3-2 5 4-5 7H3l6-9m4-8 3-2 2 3",
  "ac-repair-service": "M3 5h18v11H3zM6 9h12M7 19l-1 2m6-2v2m5-2 1 2",
  "appliance-repair": "M5 3h14v18H5zM8 7h8m-8 4h8m-8 4h8",
  "civil-work": "M3 20h18M5 20V9l7-5 7 5v11M9 20v-6h6v6",
  waterproofing: "M12 3s-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11zm-3 12c.5 2 2 3 4 3",
  "pest-control": "M8 9h8v7a4 4 0 0 1-8 0V9zm1 0V7a3 3 0 0 1 6 0v2m-7 3H4m12 0h4m-12 3H4m12 0h4",
  "packers-movers": "M3 6h12v11H3zM15 10h4l2 3v4h-6zM7 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm11 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z",
  "interior-designer": "M4 20V4h16v16zM4 13h16M10 4v9m4 0v7",
  "home-loan-assistance": "M3 11 12 4l9 7M5 10v10h14V10m-9 3h4m-4 3h4",
  "legal-services": "M12 3v17M5 7h14M5 7l-3 7h6L5 7zm14 0-3 7h6l-3-7zM8 21h8",
  "home-renovation": "M3 11 12 4l9 7M5 10v10h14V10m-9 10v-6h4v6",
  "other-home-services": "M4 20h16M6 20v-9l6-5 6 5v9M10 20v-5h4v5M3 11l9-8 9 8",
};
const defaultIcon = "M12 3v18M3 12h18";

export default function ServicesDirectory({ categories, selected, providers, hasMore }: { categories: MarketplaceCategory[]; selected: MarketplaceCategory; providers: PublicVendor[]; hasMore: boolean }) {
  return <div className="mt-5 grid grid-cols-[minmax(7rem,35%)_minmax(0,1fr)] items-start gap-3 sm:grid-cols-[15rem_minmax(0,1fr)] sm:gap-5">
    <nav aria-label="Service categories" tabIndex={0} className="max-h-[min(70vh,40rem)] space-y-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2">
      {categories.map((category) => <Link key={category.id} href={`/home-services?category=${encodeURIComponent(category.id)}`} aria-current={category.id === selected.id ? "page" : undefined} className={`flex min-h-12 items-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold sm:text-sm ${category.id === selected.id ? "bg-[#10243A] text-white" : "text-[#10243A] hover:bg-amber-50"}`}>
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-5 shrink-0"><path d={icons[category.slug] ?? defaultIcon} /></svg><span className="break-words">{category.name}</span>
      </Link>)}
    </nav>
    <section aria-labelledby="selected-service" className="min-w-0"><h2 id="selected-service" className="text-lg font-bold text-[#10243A] sm:text-xl">{selected.name}</h2>
      {providers.length === 0 ? <p className="mt-3 rounded-xl border bg-white p-4 text-sm text-slate-600">No approved providers are available in this category right now.</p> :
        <div className="mt-3 space-y-3">{providers.map((provider) => <article key={provider.id} className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5 [overflow-wrap:anywhere]">
          <h3 className="font-bold text-[#10243A]">{provider.public_name}</h3><p className="mt-1 text-sm font-semibold">{provider.business_name}</p><p className="mt-1 text-xs font-semibold text-amber-800">{selected.name}</p>
          <p className="mt-2 flex items-center gap-1 text-sm text-slate-600"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4 shrink-0"><path d="M12 21s7-6 7-12a7 7 0 1 0-14 0c0 6 7 12 7 12Z" /><circle cx="12" cy="9" r="2" /></svg>{provider.city}, {provider.locality}</p>
          <p className="mt-3 whitespace-pre-wrap text-sm"><strong>Services: </strong>{provider.services}</p><p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{provider.description}</p>
          <Link href={`/home-services/vendors/${encodeURIComponent(provider.id)}`} className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-[#10243A] px-4 text-sm font-bold text-white">Send Enquiry</Link>
        </article>)}</div>}
      {hasMore && <p className="mt-3 text-sm text-slate-600">Showing the first 100 providers.</p>}
    </section>
  </div>;
}
