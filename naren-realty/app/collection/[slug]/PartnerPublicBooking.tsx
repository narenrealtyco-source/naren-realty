"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/customers";

type Item = {
  slug: string;
  title: string;
  item_type: "package" | "test";
  category: string | null;
  description: string | null;
  inclusions: any[];
  sample_type: string | null;
  preparation: string | null;
  report_tat: string | null;
  customer_price: number | null;
  mrp_price?: number | null;
  available: boolean;
  package_tests: Array<{ slug: string; title: string; mapping_status: string }>;
};
type Partner = { display_name: string; public_slug: string; service_areas: string[] };
const slots = ["6:00 AM – 7:00 AM","7:00 AM – 8:00 AM","8:00 AM – 9:00 AM","9:00 AM – 10:00 AM","10:00 AM – 11:00 AM","11:00 AM – 12:00 PM","12:00 PM – 1:00 PM","1:00 PM – 2:00 PM","2:00 PM – 3:00 PM","3:00 PM – 4:00 PM","4:00 PM – 5:00 PM","5:00 PM – 6:00 PM"];
const money = (value: number) => "₹" + value.toLocaleString("en-IN");
function Brand() {
  return <Link href="/health-checkup" aria-label="MFIT Healthcare" className="flex shrink-0 items-center gap-2">
    <span className="grid size-9 place-items-center rounded-md bg-[#08b8bb] text-[27px] font-black leading-none text-white">M</span>
    <span className="leading-none"><b className="block text-[23px] font-extrabold tracking-[-.07em] text-[#15191b]">FIT</b><span className="mt-1 block text-[10px] font-semibold text-[#222729]">Healthcare</span></span>
  </Link>;
}
function today() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

export default function PartnerPublicBooking({ partnerSlug }: { partnerSlug: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [kind, setKind] = useState<"all" | "package" | "test">("all");
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [stage, setStage] = useState<"catalog" | "details">("catalog");
  const [customer, setCustomer] = useState({ name: "", phone: "", email: "", pincode: "", address: "" });
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState(slots[1]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ reference: string; amount: number; message: string } | null>(null);

  useEffect(() => {
    fetch("/api/collection-partner/catalog?partner=" + encodeURIComponent(partnerSlug), { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Booking page unavailable");
        setPartner(d.partner);
        setItems(d.items || []);
        const initial = new URLSearchParams(window.location.search).get("item");
        if (initial && (d.items || []).some((x: Item) => x.slug === initial && x.available)) setSelected([initial]);
      })
      .catch((e) => setLoadError(e.message || "Unable to load booking page."))
      .finally(() => setLoading(false));
  }, [partnerSlug]);

  const categories = useMemo(() => ["All", ...Array.from(new Set(items.map((x) => x.category).filter(Boolean) as string[])).sort()], [items]);
  const visible = useMemo(() => items.filter((x) =>
    (kind === "all" || x.item_type === kind) &&
    (category === "All" || x.category === category) &&
    (x.title + " " + (x.category || "") + " " + (x.description || "") + " " + (x.inclusions || []).join(" ")).toLowerCase().includes(query.toLowerCase())
  ), [items, kind, category, query]);
  const chosen = selected.map((s) => items.find((x) => x.slug === s)).filter(Boolean) as Item[];
  const total = chosen.reduce((s, x) => s + Number(x.customer_price || 0), 0);
  const availableCount = items.filter((x) => x.available).length;

  function toggle(slug: string) {
    const item = items.find((x) => x.slug === slug);
    if (!item?.available) return;
    setSelected((current) => current.includes(slug) ? current.filter((x) => x !== slug) : current.length >= 10 ? current : [...current, slug]);
  }
  function continueToDetails() {
    if (!selected.length) return;
    setStage("details");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!selected.length) { setError("Please select at least one package or test."); setStage("catalog"); return; }
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) headers.Authorization = "Bearer " + session.access_token;
      const r = await fetch("/api/collection-partner/book", {
        method: "POST", headers,
        body: JSON.stringify({ partner: partnerSlug, items: selected.map((slug) => ({ slug, quantity: 1 })), customer, date, slot })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Booking request could not be submitted.");
      setSuccess({ reference: d.reference, amount: Number(d.amount || 0), message: d.message || "Your request has been received." });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) {
      setError(e.message || "Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) return <main className="min-h-screen bg-[#f5f7f8] px-4 py-10 text-[#172326]">
    <section className="mx-auto max-w-xl rounded-3xl border border-slate-100 bg-white p-7 text-center shadow-sm">
      <span className="mx-auto grid size-16 place-items-center rounded-full bg-[#e9f8f6] text-3xl font-black text-[#078b8d]">✓</span>
      <p className="mt-4 text-xs font-bold uppercase tracking-widest text-[#078b8d]">MFIT Healthcare</p>
      <h1 className="mt-2 text-2xl font-extrabold">Booking request received</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">{success.message}</p>
      <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm font-extrabold">Booking reference: {success.reference}</p>
      <p className="mt-3 text-sm text-slate-600">Selected items total: <b>{money(success.amount)}</b></p>
      <p className="mt-4 rounded-xl bg-amber-50 p-4 text-left text-xs leading-5 text-amber-900">Your collection partner will contact you to confirm the visit, payment collection and availability. Your preferred slot is a request, not a confirmed appointment.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link href="/health-checkup/my-orders" className="inline-flex rounded-xl bg-[#078b8d] px-6 py-3 text-sm font-bold text-white">Track my booking</Link>
        <Link href="/health-checkup" className="inline-flex rounded-xl border border-[#078b8d] px-6 py-3 text-sm font-bold text-[#078b8d]">MFIT home</Link>
      </div>
    </section>
  </main>;

  return <main id="top" className="min-h-screen bg-[#f6f8f9] pb-28 text-[#172326]">
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[62px] max-w-[1320px] items-center justify-between gap-3 px-4 lg:px-7">
        <Brand />
        <div className="hidden min-w-0 flex-1 items-center gap-2 px-8 md:flex">
          <span className="text-xs font-semibold text-slate-400">⌕</span>
          <input value={query} onChange={(e) => { setQuery(e.target.value); setStage("catalog"); }} placeholder="Search tests, packages or health concerns" className="h-10 w-full rounded-lg border border-slate-200 bg-[#f8fafb] px-3 text-sm outline-none transition focus:border-[#08aeb1] focus:bg-white" />
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Link href="/health-checkup/my-orders" className="hidden text-xs font-semibold text-slate-600 hover:text-[#078b8d] sm:block">My bookings</Link>
          <button type="button" onClick={() => setStage("details")} className="relative rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:border-[#08aeb1]">
            Cart <span className="ml-1 rounded-full bg-[#e7f8f6] px-1.5 py-0.5 text-[#087f82]">{selected.length}</span>
          </button>
        </div>
      </div>
      <div className="border-t border-slate-100 bg-white px-4 py-2 md:hidden">
        <label className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-[#f8fafb] px-3">
          <span className="text-lg text-slate-400">⌕</span>
          <input value={query} onChange={(e) => { setQuery(e.target.value); setStage("catalog"); }} placeholder="Search tests and packages" className="w-full bg-transparent text-sm outline-none" />
        </label>
      </div>
      <nav className="hidden border-t border-slate-100 bg-[#fcfefe] lg:block">
        <div className="mx-auto flex max-w-[1320px] items-center gap-8 overflow-x-auto px-7 py-3 text-xs font-semibold text-slate-600">
          <a href="#catalog" className="whitespace-nowrap hover:text-[#078b8d]">All services</a>
          <button onClick={() => { setKind("package"); setCategory("All"); setStage("catalog"); }} className="whitespace-nowrap hover:text-[#078b8d]">Health packages</button>
          <button onClick={() => { setKind("test"); setCategory("All"); setStage("catalog"); }} className="whitespace-nowrap hover:text-[#078b8d]">Individual lab tests</button>
          <a href="#how-it-works" className="whitespace-nowrap hover:text-[#078b8d]">How it works</a>
          <a href="#partner-help" className="whitespace-nowrap hover:text-[#078b8d]">Partner support</a>
        </div>
      </nav>
    </header>

    <section className="mx-auto max-w-[1320px] px-4 pt-4 lg:px-7">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <p className="text-slate-500">MFIT Healthcare <span className="px-1 text-slate-300">/</span><b className="text-[#087f82]">Partner booking</b></p>
        <span className="rounded-full bg-[#e8f8f6] px-3 py-1.5 text-[10px] font-extrabold tracking-wide text-[#087f82]">BOOKING LINK VERIFIED BY MFIT</span>
      </div>
      <div className="mt-3 grid gap-4 rounded-2xl border border-[#e1eeee] bg-white p-4 shadow-[0_3px_16px_rgba(18,55,60,.035)] sm:p-6 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#078b8d]">Your health, in focus</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">Lab tests & health checkups</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Find the right test or package, review what is included and request a convenient home collection.</p>
        </div>
        <div className="min-w-[230px] rounded-xl border border-[#dcefed] bg-[#f4fbfa] p-3.5">
          <p className="text-[9px] font-extrabold uppercase tracking-[.16em] text-[#078b8d]">Your collection partner</p>
          <p className="mt-1 text-base font-extrabold">{partner?.display_name || "MFIT Collection Partner"}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{partner?.service_areas?.length ? partner.service_areas.join(" · ") : "Home collection coordination"}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
        {[["✓","MFIT-approved listings"],["⌂","Home sample collection"],["▤","Online report access"]].map(([icon,label]) => <div key={label} className="flex items-center justify-center gap-2 rounded-xl bg-white px-2 py-3 text-center text-[10px] font-bold text-slate-600 shadow-[0_2px_10px_rgba(15,40,55,.035)] sm:text-xs"><span className="text-base text-[#078b8d]">{icon}</span>{label}</div>)}
      </div>
    </section>

    {stage === "catalog" ? <>
      <section id="catalog" className="mx-auto mt-6 max-w-[1320px] px-4 lg:px-7">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#078b8d]">Explore catalogue</p><h2 className="mt-1 text-xl font-extrabold">Find a test or health package</h2></div>
          <span className="text-[11px] font-semibold text-slate-500">{loading ? "Loading…" : availableCount + " bookable options"}</span>
        </div>
        <div className="grid gap-5 lg:grid-cols-[230px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-[150px] rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-extrabold">Browse categories</h3>
              <div className="mt-3 space-y-1">
                {categories.map((c) => <button key={c} onClick={() => setCategory(c)} className={"flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs " + (category === c ? "bg-[#e9f8f6] font-extrabold text-[#087f82]" : "font-medium text-slate-600 hover:bg-slate-50")}>
                  <span>{c}</span><span className="text-[10px] text-slate-400">{c === "All" ? items.length : items.filter((x) => x.category === c).length}</span>
                </button>)}
              </div>
              <div className="mt-5 border-t border-slate-100 pt-4">
                <h3 className="text-xs font-extrabold">Service information</h3>
                <p className="mt-2 text-[11px] leading-5 text-slate-500">Only active items with MFIT provider verification and a valid partner price can be added to a booking.</p>
              </div>
            </div>
          </aside>
          <div className="min-w-0">
            <div className="flex gap-2 overflow-x-auto pb-2 lg:hidden">
              {categories.map((c) => <button key={c} onClick={() => setCategory(c)} className={"shrink-0 rounded-full border px-3.5 py-2 text-[11px] font-bold " + (category === c ? "border-[#078b8d] bg-[#e9f8f6] text-[#087f82]" : "border-slate-200 bg-white text-slate-600")}>{c}</button>)}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
                {(["all","package","test"] as const).map((k) => <button key={k} onClick={() => setKind(k)} className={"rounded-md px-3 py-2 text-[11px] font-bold " + (kind === k ? "bg-white text-[#087f82] shadow-sm" : "text-slate-500")}>{k === "all" ? "All" : k === "package" ? "Packages" : "Lab tests"}</button>)}
              </div>
              <span className="text-[11px] text-slate-500">{visible.length} results</span>
            </div>
            {loadError && <p className="mt-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{loadError}</p>}
            {loading && <div className="mt-3 space-y-3">{[1,2,3].map((n) => <div key={n} className="h-36 animate-pulse rounded-xl bg-white" />)}</div>}
            {!loading && !loadError && <div className="mt-3 space-y-3">
              {visible.map((item) => <article key={item.slug} className={"rounded-xl border bg-white p-4 shadow-[0_2px_12px_rgba(15,40,55,.035)] transition " + (selected.includes(item.slug) ? "border-[#08aeb1] ring-1 ring-[#08aeb1]/20" : "border-slate-200")}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#eef8f7] px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wide text-[#087f82]">{item.item_type === "package" ? "Health package" : "Individual test"}</span>
                      {item.category && <span className="text-[10px] font-medium text-slate-400">{item.category}</span>}
                      {item.sample_type && <span className="text-[10px] text-slate-400">· {item.sample_type}</span>}
                    </div>
                    <h3 className="mt-2 text-[15px] font-extrabold leading-snug text-[#20292b]">{item.title}</h3>
                    {item.description && <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{item.description}</p>}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500">
                      {item.item_type === "package" && <span>{item.package_tests?.length || item.inclusions?.length || 0} listed tests / components</span>}
                      {item.report_tat && <span>Report in {item.report_tat}</span>}
                      {item.preparation && <span>Preparation details available</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 pt-3 sm:min-w-[190px] sm:flex-col sm:items-end sm:border-0 sm:pt-0">
                    <div className="sm:text-right">
                      <p className="text-[9px] text-slate-400">Partner customer price</p>
                      <p className="text-lg font-extrabold text-[#172326]">{item.customer_price === null ? "Price unavailable" : money(Number(item.customer_price))}</p>
                      {item.mrp_price !== null && item.mrp_price !== undefined && item.mrp_price > Number(item.customer_price || 0) && <p className="text-[10px] text-slate-400 line-through">{money(Number(item.mrp_price))}</p>}
                    </div>
                    <button type="button" disabled={!item.available} onClick={() => toggle(item.slug)} className={"min-w-[118px] rounded-lg px-4 py-2.5 text-[11px] font-extrabold " + (selected.includes(item.slug) ? "bg-[#075c78] text-white" : "bg-[#08aeb1] text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400")}>{!item.available ? "Not bookable" : selected.includes(item.slug) ? "Added ✓" : "ADD"}</button>
                  </div>
                </div>
                <button type="button" onClick={() => setExpanded(expanded === item.slug ? null : item.slug)} aria-expanded={expanded === item.slug} className="mt-3 flex w-full items-center justify-between border-t border-slate-100 pt-3 text-left text-[11px] font-bold text-[#087f82]">
                  View test details & preparation <span>{expanded === item.slug ? "−" : "+"}</span>
                </button>
                {expanded === item.slug && <div className="mt-2 rounded-lg bg-[#f8fbfb] p-3 text-[11px] leading-5 text-slate-600">
                  {item.description && <p>{item.description}</p>}
                  <p className="mt-1"><b>Sample type:</b> {item.sample_type || "To be confirmed by laboratory"}</p>
                  <p className="mt-1"><b>Preparation:</b> {item.preparation || "To be confirmed by laboratory"}</p>
                  <p className="mt-1"><b>Expected report time:</b> {item.report_tat || "To be confirmed by laboratory"}</p>
                  {item.package_tests?.length > 0 && <><p className="mt-2 font-bold">Included tests</p><ul className="mt-1 grid gap-1 sm:grid-cols-2">{item.package_tests.map((t) => <li key={t.slug}>• {t.title}</li>)}</ul></>}
                  {item.inclusions?.length > 0 && <p className="mt-2"><b>Components listed:</b> {item.inclusions.map((v: any) => typeof v === "string" ? v : (v.title || v.name || "")).filter(Boolean).join(", ")}</p>}
                </div>}
              </article>)}
              {visible.length === 0 && <div className="rounded-xl border border-slate-200 bg-white p-8 text-center"><p className="text-sm font-bold">No matching tests or packages</p><p className="mt-1 text-xs text-slate-500">Try another search or category.</p><button onClick={() => { setQuery(""); setCategory("All"); setKind("all"); }} className="mt-3 text-xs font-bold text-[#087f82]">Clear filters</button></div>}
            </div>}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto mt-8 max-w-[1320px] px-4 lg:px-7">
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="text-base font-extrabold">How home collection works</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            {[["01","Choose tests","Search and add packages or individual tests."],["02","Share details","Enter patient and home collection details."],["03","Partner confirms","Your partner confirms serviceability and the visit."],["04","Get reports","Access approved reports securely through MFIT."]].map(([n,title,desc]) => <div key={n} className="flex gap-3 sm:block"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#e8f8f6] text-[11px] font-extrabold text-[#087f82]">{n}</span><div><h3 className="text-xs font-extrabold">{title}</h3><p className="mt-1 text-[11px] leading-5 text-slate-500">{desc}</p></div></div>)}
          </div>
        </div>
      </section>
    </> : <section className="mx-auto mt-6 max-w-4xl px-4 lg:px-7">
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#078b8d]">Booking details</p><h2 className="mt-1 text-xl font-extrabold">Complete your request</h2></div>
          <button type="button" onClick={() => setStage("catalog")} className="text-xs font-bold text-[#087f82]">← Back to tests</button>
        </div>
        <div className="mt-4 flex gap-2 text-[10px] font-bold"><span className="rounded-full bg-[#e8f8f6] px-3 py-1.5 text-[#087f82]">1. Selection ✓</span><span className="rounded-full bg-[#e8f8f6] px-3 py-1.5 text-[#087f82]">2. Your details</span><span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-500">3. Partner confirmation</span></div>
        <div className="mt-5 space-y-2">
          {chosen.map((x) => <div key={x.slug} className="flex items-center justify-between gap-3 rounded-lg bg-[#f7fbfa] p-3"><div className="min-w-0"><p className="truncate text-xs font-bold">{x.title}</p><p className="mt-1 text-[10px] text-slate-500">{x.item_type === "package" ? "Health package" : "Lab test"}</p></div><div className="flex items-center gap-3"><b className="text-xs">{money(Number(x.customer_price || 0))}</b><button type="button" onClick={() => toggle(x.slug)} className="text-[10px] font-bold text-rose-600">Remove</button></div></div>)}
          <div className="flex justify-between border-t border-slate-100 pt-3 text-sm"><b>Estimated total</b><b>{money(total)}</b></div>
        </div>
        <form onSubmit={submit} className="mt-5">
          <h3 className="text-sm font-extrabold">Patient & contact details</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-[11px] font-semibold text-slate-600">Patient full name<input required minLength={2} value={customer.name} onChange={(e) => setCustomer((v) => ({ ...v, name: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#08aeb1]" placeholder="Enter full name" /></label>
            <label className="text-[11px] font-semibold text-slate-600">Mobile number<input required inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength={10} value={customer.phone} onChange={(e) => setCustomer((v) => ({ ...v, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#08aeb1]" placeholder="10-digit mobile number" /></label>
            <label className="text-[11px] font-semibold text-slate-600">Email address (optional)<input type="email" value={customer.email} onChange={(e) => setCustomer((v) => ({ ...v, email: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#08aeb1]" placeholder="name@example.com" /></label>
            <label className="text-[11px] font-semibold text-slate-600">PIN code<input required inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} value={customer.pincode} onChange={(e) => setCustomer((v) => ({ ...v, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#08aeb1]" placeholder="6-digit PIN code" /></label>
            <label className="text-[11px] font-semibold text-slate-600 sm:col-span-2">Full collection address<textarea required minLength={8} rows={3} value={customer.address} onChange={(e) => setCustomer((v) => ({ ...v, address: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#08aeb1]" placeholder="House / flat, street, area, city" /></label>
            <label className="text-[11px] font-semibold text-slate-600">Preferred collection date<input required type="date" min={today()} value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#08aeb1]" /></label>
            <label className="text-[11px] font-semibold text-slate-600">Preferred time slot<select value={slot} onChange={(e) => setSlot(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#08aeb1]">{slots.map((s) => <option key={s}>{s}</option>)}</select></label>
          </div>
          <p className="mt-4 rounded-lg bg-amber-50 p-3 text-[11px] leading-5 text-amber-900">The selected date and time are your preference, not a confirmed slot. Your collection partner will confirm serviceability, availability and payment arrangements. Reports are released only after MFIT approval and applicable partner-to-MFIT settlement.</p>
          {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-700">{error}</p>}
          <button type="submit" disabled={submitting || !selected.length} className="mt-4 flex min-h-12 w-full items-center justify-center rounded-lg bg-[#08aeb1] px-4 text-sm font-extrabold text-white disabled:opacity-50">{submitting ? "Submitting…" : "Submit booking request · " + money(total)}</button>
          <p className="mt-3 text-center text-[10px] leading-5 text-slate-400">No payment is taken on this page. Your collection partner will contact you about confirmation and payment.</p>
        </form>
      </div>
    </section>}

    <footer id="partner-help" className="mx-auto max-w-[1320px] px-4 py-8 text-center text-[10px] text-slate-400 lg:px-7">MFIT Healthcare · Booking coordinated by {partner?.display_name || "your collection partner"} · Diagnostic services are subject to partner and laboratory confirmation.</footer>
    {stage === "catalog" && selected.length > 0 && <div className="fixed inset-x-0 bottom-[62px] z-30 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-4px_18px_rgba(15,40,55,.08)] backdrop-blur">
      <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-3">
        <div><p className="text-[10px] text-slate-500">{selected.length} item{selected.length > 1 ? "s" : ""} added</p><p className="text-base font-extrabold">{money(total)}</p></div>
        <button type="button" onClick={continueToDetails} className="rounded-lg bg-[#08aeb1] px-6 py-3 text-xs font-extrabold text-white">Continue →</button>
      </div>
    </div>}
    <nav className="fixed inset-x-0 bottom-0 z-40 grid h-[62px] grid-cols-3 border-t border-slate-100 bg-white pb-[env(safe-area-inset-bottom)] text-[10px]">
      <a href="#top" className="flex flex-col items-center justify-center gap-1 font-semibold text-[#078b8d]">⌂<span>Home</span></a>
      <button type="button" onClick={() => { setStage("catalog"); document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" }); }} className="flex flex-col items-center justify-center gap-1">⚗<span>Catalogue</span></button>
      <button type="button" onClick={() => setStage("details")} className="flex flex-col items-center justify-center gap-1">▤<span>My booking ({selected.length})</span></button>
    </nav>
  </main>;
}