"use client";

import { useEffect, useMemo, useState } from "react";

type Parameter = string | { title?: string; name?: string; [key: string]: unknown };
type PackageTest = {
  slug: string;
  title: string;
  description?: string | null;
  inclusions: Parameter[];
  inclusionsNote: string | null;
  sample_type?: string | null;
  preparation?: string | null;
  report_tat?: string | null;
  mapping_status?: string;
};
type Item = {
  slug: string;
  title: string;
  item_type: "package" | "test" | string;
  category: string | null;
  description: string | null;
  inclusions: Parameter[];
  inclusionsNote: string | null;
  package_tests: PackageTest[];
  mrp_price: number | null;
  customer_price: number | null;
  sample_type: string | null;
  preparation: string | null;
  report_tat: string | null;
};

const collectionSlots = [
  "7:00 AM – 9:00 AM",
  "9:00 AM – 11:00 AM",
  "11:00 AM – 1:00 PM",
  "1:00 PM – 3:00 PM",
  "3:00 PM – 5:00 PM",
];

function cleanCatalogueText(value?: string | null) {
  return (value || "")
    .replace(/Pune listing(?: confirmed)?[ :,.–-]*/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function parameterLabel(value: Parameter) {
  if (typeof value === "string") return cleanCatalogueText(value);
  return cleanCatalogueText(value.title || value.name || "");
}

function formatPrice(value: number | null) {
  return value === null ? "Price being updated" : "₹" + Number(value).toLocaleString("en-IN");
}

function ParameterList({ values, note }: { values: Parameter[]; note?: string | null }) {
  if (!values?.length) {
    return <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900">Detailed parameters are awaiting confirmation from the performing laboratory.</p>;
  }
  return (
    <div>
      <p className="mb-2 text-xs font-extrabold text-[#172326]">Included parameters ({values.length})</p>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {values.map((value, index) => (
          <li key={index} className="flex items-start gap-2 rounded-lg bg-[#f5f7fa] px-3 py-2 text-xs leading-5 text-slate-700">
            <span className="font-bold text-emerald-700">✓</span>
            <span>{parameterLabel(value)}</span>
          </li>
        ))}
      </ul>
      {note && <p className="mt-2 text-[11px] leading-5 text-amber-800">{cleanCatalogueText(note)}</p>}
    </div>
  );
}

function PackageInclusionList({ values }: { values: Parameter[] }) {
  return (
    <div className="space-y-2">
      {values.map((value, index) => {
        const label = parameterLabel(value);
        const separator = label.indexOf(":");
        const heading = separator > 0 ? label.slice(0, separator).trim() : label;
        const detail = separator > 0 ? label.slice(separator + 1).trim() : "";
        return (
          <div key={index} className="rounded-xl border border-slate-100 bg-white px-3 py-3">
            <p className="text-xs font-extrabold text-[#172326]">{heading}</p>
            {detail && <p className="mt-1 text-xs leading-5 text-slate-600">{detail}</p>}
          </div>
        );
      })}
    </div>
  );
}

function TestDetails({ test }: { test: PackageTest }) {
  return (
    <details className="group rounded-xl border border-slate-200 bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block text-sm font-bold text-[#172326]">{test.title}</span>
          <span className="mt-0.5 block text-[11px] text-slate-500">{test.inclusions?.length || 0} listed parameters</span>
        </span>
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-100 text-lg text-slate-600 transition group-open:rotate-180">⌄</span>
      </summary>
      <div className="space-y-3 border-t border-slate-100 px-3 pb-3 pt-3">
        {test.description && <p className="text-xs leading-5 text-slate-600">{cleanCatalogueText(test.description)}</p>}
        <div className="grid grid-cols-3 gap-2">
          <div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Sample</p><p className="mt-1 text-[11px] leading-4 text-slate-700">{test.sample_type || "To be confirmed"}</p></div>
          <div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Preparation</p><p className="mt-1 text-[11px] leading-4 text-slate-700">{test.preparation || "To be confirmed"}</p></div>
          <div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Report time</p><p className="mt-1 text-[11px] leading-4 text-slate-700">{test.report_tat || "To be confirmed"}</p></div>
        </div>
        <ParameterList values={test.inclusions || []} note={test.inclusionsNote} />
      </div>
    </details>
  );
}

export default function PartnerBookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState("");
  const [partner, setPartner] = useState<{ display_name?: string } | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState(collectionSlots[0]);
  const [customer, setCustomer] = useState({ name: "", phone: "", email: "", pincode: "", address: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<"all" | "package" | "test">("all");
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [detailSlug, setDetailSlug] = useState<string | null>(null);

  useEffect(() => {
    params.then((value) => setSlug(value.slug));
  }, [params]);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetch("/api/collection-partner/catalog?partner=" + encodeURIComponent(slug), { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load the catalogue.");
        setPartner(data.partner);
        setItems(data.items || []);
        const requested = new URLSearchParams(window.location.search).get("item");
        if (requested && (data.items || []).some((item: Item) => item.slug === requested)) setSelected([requested]);
      })
      .catch((cause) => setError(cause.message || "Unable to load the catalogue."))
      .finally(() => setLoading(false));
  }, [slug]);

  const visibleItems = useMemo(() => items.filter((item) =>
    (kind === "all" || item.item_type === kind) &&
    (activeCategory === "All" || item.category === activeCategory) &&
    (item.title + " " + (item.category || "") + " " + cleanCatalogueText(item.description)).toLowerCase().includes(search.toLowerCase())
  ), [items, kind, activeCategory, search]);

  const chosenItems = useMemo(() => items.filter((item) => selected.includes(item.slug)), [items, selected]);
  const total = chosenItems.reduce((sum, item) => sum + Number(item.customer_price || 0), 0);
  const packageCount = items.filter((item) => item.item_type === "package").length;
  const testCount = items.filter((item) => item.item_type === "test").length;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected.length) {
      setError("Please select at least one package or test.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/collection-partner/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partner: slug, items: selected.map((itemSlug) => ({ slug: itemSlug, quantity: 1 })), customer, date, slot }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Booking request could not be submitted.");
      setSuccess(data.reference);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Booking failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (success) {
    return (
      <main className="min-h-screen bg-[#f7fafb] px-4 py-10 text-[#172326]">
        <section className="mx-auto max-w-xl rounded-3xl bg-white p-7 text-center shadow-[0_8px_32px_rgba(16,36,58,.08)]">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-50 text-3xl font-bold text-emerald-700">✓</span>
          <p className="mt-5 text-xs font-extrabold uppercase tracking-[.18em] text-emerald-700">Booking request received</p>
          <h1 className="mt-2 text-2xl font-extrabold">Thank you for your booking</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">Your collection partner will contact you to confirm the collection visit.</p>
          <p className="mt-5 rounded-xl bg-[#f7fafb] p-4 text-sm font-extrabold">Booking reference: {success}</p>
          <p className="mt-4 text-xs leading-5 text-slate-500">Your preferred date and time will be confirmed by the collection partner.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7fafb] pb-10 text-[#172326]">
      <header className="bg-[#075c78] px-4 pb-7 pt-5 text-white shadow-md sm:pb-9">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center justify-between gap-3 border-b border-white/15 pb-4">
            <a href="/" className="text-lg font-extrabold tracking-wide">NAREN <span className="text-[#baf4ee]">REALTY</span></a>
            <span className="rounded-full border border-white/20 px-3 py-1.5 text-[10px] font-bold tracking-wide text-slate-200">HEALTH CHECKUP</span>
          </div>
          <div className="pt-6 sm:pt-8">
            <p className="text-[11px] font-bold uppercase tracking-[.2em] text-[#baf4ee]">Simple · Convenient · At home</p>
            <h1 className="mt-2 max-w-2xl text-2xl font-extrabold leading-tight sm:text-4xl">Book your health checkup with confidence.</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">Choose a package or individual test, review its included parameters and request a convenient collection time.</p>
            {partner?.display_name && <p className="mt-4 inline-flex rounded-lg bg-white/10 px-3 py-2 text-xs text-slate-200">Booking assisted by <strong className="ml-1 text-white">{partner.display_name}</strong></p>}
          </div>
          <div className="mt-6 grid grid-cols-3 gap-2 sm:max-w-lg sm:gap-3">
            <div className="rounded-xl bg-white/10 p-3"><p className="text-lg font-extrabold">{packageCount}</p><p className="text-[10px] text-slate-300">Packages</p></div>
            <div className="rounded-xl bg-white/10 p-3"><p className="text-lg font-extrabold">{testCount}</p><p className="text-[10px] text-slate-300">Individual tests</p></div>
            <div className="rounded-xl bg-white/10 p-3"><p className="text-lg font-extrabold">Home</p><p className="text-[10px] text-slate-300">Sample collection</p></div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-4 px-3 py-5 sm:px-5 sm:py-7">
        {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

        <form onSubmit={submit} className="space-y-4">
          <section className="rounded-2xl bg-white p-4 shadow-[0_3px_18px_rgba(15,35,65,.05)] ring-1 ring-slate-100 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#078b8d]">Step 1 · Choose your tests</p><h2 className="mt-1 text-lg font-extrabold sm:text-xl">Packages & individual tests</h2><p className="mt-1 text-xs text-slate-500">Review the details and select what you need.</p></div>
              <span className="rounded-full bg-[#f7fafb] px-3 py-1.5 text-xs font-bold text-slate-600">{loading ? "Loading…" : items.length + " options"}</span>
            </div>
            <label className="mt-4 flex h-12 items-center gap-3 rounded-xl border border-slate-200 px-3 focus-within:border-[#08aeb1] focus-within:ring-2 focus-within:ring-[#08b8bb]/15">
              <span className="text-lg text-slate-400">⌕</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search package or test name…" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400" />
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              {(["all", "package", "test"] as const).map((value) => (
                <button key={value} type="button" onClick={() => setKind(value)} className={"rounded-full px-4 py-2 text-xs font-bold transition " + (kind === value ? "bg-[#075c78] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>
                  {value === "all" ? "All" : value === "package" ? "Packages" : "Single tests"}
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-3">
              {loading && <div className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">Loading packages and tests…</div>}
              {!loading && visibleItems.map((item) => {
                const isSelected = selected.includes(item.slug);
                const isPackage = item.item_type === "package";
                const saving = item.mrp_price !== null && item.customer_price !== null && item.mrp_price > item.customer_price;
                const categories = ["All", ...Array.from(new Set(items.map((item) => item.category).filter((value): value is string => Boolean(value))))];
  const selectedDetail = items.find((item) => item.slug === detailSlug) || null;
  const featuredItems = items.filter((item) => item.item_type === (kind === "test" ? "test" : "package")).slice(0, 3);

  return (
    <main id="top" className="min-h-screen bg-[#f7fafb] pb-24 text-[#172326]">
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[76px] max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href="#top" className="flex items-center gap-2.5" aria-label="MFIT Healthcare home">
            <span className="grid size-11 place-items-center rounded-md bg-[#08b8bb] text-3xl font-black text-white">M</span>
            <span className="leading-none"><span className="block text-[25px] font-extrabold tracking-[-0.07em] text-[#15191b]">FIT</span><span className="mt-1 block text-xs font-semibold text-[#222729]">Healthcare</span></span>
          </a>
          <a href="#booking" className="rounded-full bg-[#e9f8f7] px-4 py-2.5 text-xs font-bold text-[#087f82]">My booking</a>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pt-5 sm:px-6 sm:pt-8">
        <p className="mb-3 text-sm font-medium text-slate-500">Healthcare services <span className="px-1 text-slate-300">/</span> <strong className="text-[#087f82]">MFIT Healthcare</strong></p>
        <label className="flex h-14 items-center gap-3 rounded-full border border-[#aab6c2] bg-white px-5 shadow-sm focus-within:border-[#08aeb1] focus-within:ring-2 focus-within:ring-[#08b8bb]/15">
          <span className="text-xl text-slate-500">⌕</span>
          <input value={search} onChange={(event) => { setSearch(event.target.value); setDetailSlug(null); }} placeholder="Search CBC, Thyroid, Vitamin D, health packages..." className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500 sm:text-base" />
        </label>
        <div className="mt-5 grid grid-cols-4 gap-2.5 sm:gap-4">
          {[
            { title: "Health", subtitle: "Packages", symbol: "✚", action: () => { setKind("package"); setActiveCategory("All"); }, tone: "bg-[#eaf8f7] text-[#078b8d]" },
            { title: "Individual", subtitle: "Lab Tests", symbol: "⚗", action: () => { setKind("test"); setActiveCategory("All"); }, tone: "bg-[#edf5ff] text-[#2476bd]" },
            { title: "All", subtitle: "Catalogue", symbol: "▣", action: () => { setKind("all"); setActiveCategory("All"); }, tone: "bg-[#eaf8ef] text-[#23965a]" },
            { title: "Review", subtitle: "My Booking", symbol: "▤", action: () => document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" }), tone: "bg-[#fff3e9] text-[#b66a2a]" },
          ].map((action) => <button key={action.subtitle} type="button" onClick={action.action} className={`flex min-h-[112px] flex-col items-center justify-center rounded-2xl px-1.5 py-3 text-center shadow-sm transition hover:-translate-y-0.5 sm:min-h-[140px] sm:rounded-3xl ${action.tone}`}><span className="mb-2 text-3xl sm:text-[38px]">{action.symbol}</span><span className="text-[11px] opacity-80 sm:text-sm">{action.title}</span><strong className="mt-1 text-xs sm:text-base">{action.subtitle}</strong></button>)}
        </div>
      </section>

      <section className="mx-auto mt-7 max-w-6xl px-4 sm:px-6">
        <div className="relative min-h-[190px] overflow-hidden rounded-[26px] bg-gradient-to-r from-[#075c78] via-[#087f98] to-[#50c1d0] shadow-lg sm:min-h-[230px]">
          <div className="max-w-[78%] px-5 py-6 text-white sm:max-w-[66%] sm:px-8 sm:py-9">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#baf4ee] sm:text-xs">Your health, in focus</p>
            <h1 className="mt-2 text-[25px] font-extrabold leading-tight sm:text-4xl">Make your health a priority.</h1>
            <p className="mt-2 text-xs leading-5 text-white/90 sm:text-base">Explore health checkup packages and individual lab tests with convenient collection booking.</p>
            <button type="button" onClick={() => { setKind("package"); setDetailSlug(null); document.getElementById("catalogue")?.scrollIntoView({ behavior: "smooth" }); }} className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-white px-4 text-xs font-extrabold text-[#075c78]">Explore packages →</button>
          </div>
        </div>
      </section>

      {error && <div className="mx-auto mt-5 max-w-6xl px-4 sm:px-6"><p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p></div>}

      {selectedDetail ? (
        <section className="mx-auto mt-8 max-w-4xl px-4 sm:px-6">
          <button type="button" onClick={() => setDetailSlug(null)} className="mb-4 text-sm font-bold text-[#078b8d]">← Back to health catalogue</button>
          <article className="overflow-hidden rounded-3xl border border-[#dceeed] bg-white shadow-lg">
            <div className="bg-gradient-to-r from-[#e8f8f5] via-[#f1fbfa] to-[#edf3ff] px-5 py-6 sm:px-7">
              <span className="rounded-full bg-white px-3 py-1 text-[10px] font-extrabold uppercase text-[#087f82]">{selectedDetail.item_type === "package" ? "MFIT PACKAGE" : "MFIT LAB TEST"}</span>
              <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">{selectedDetail.title}</h2>
              {selectedDetail.category && <p className="mt-2 text-sm font-semibold text-[#5c7475]">{selectedDetail.category}</p>}
              {cleanCatalogueText(selectedDetail.description) && <p className="mt-3 text-sm leading-6 text-slate-600">{cleanCatalogueText(selectedDetail.description)}</p>}
              <strong className="mt-4 block text-xl">{formatPrice(selectedDetail.customer_price)}</strong>
            </div>
            <div className="space-y-5 p-5 sm:p-7">
              <div className="grid grid-cols-3 gap-3 rounded-2xl bg-[#f7fafb] p-4">
                <div><p className="text-[10px] font-bold uppercase text-slate-400">Sample</p><p className="mt-1 text-xs">{selectedDetail.sample_type || "To be confirmed"}</p></div>
                <div><p className="text-[10px] font-bold uppercase text-slate-400">Preparation</p><p className="mt-1 text-xs">{selectedDetail.preparation || "To be confirmed"}</p></div>
                <div><p className="text-[10px] font-bold uppercase text-slate-400">Report time</p><p className="mt-1 text-xs">{selectedDetail.report_tat || "To be confirmed"}</p></div>
              </div>
              {selectedDetail.item_type === "test" ? <ParameterList values={selectedDetail.inclusions || []} note={selectedDetail.inclusionsNote} /> : <div><h3 className="mb-3 text-base font-extrabold">Included tests & parameters</h3>{selectedDetail.package_tests?.length ? <div className="space-y-3">{selectedDetail.package_tests.map((test) => <TestDetails key={test.slug} test={test} />)}</div> : selectedDetail.inclusions?.length ? <PackageInclusionList values={selectedDetail.inclusions} /> : <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">Included test and parameter details are awaiting confirmation from the performing laboratory.</p>}{selectedDetail.inclusionsNote && <p className="mt-3 text-[11px] text-amber-800">{cleanCatalogueText(selectedDetail.inclusionsNote)}</p>}</div>}
              <button type="button" disabled={selectedDetail.customer_price === null} onClick={() => { setSelected((current) => current.includes(selectedDetail.slug) ? current : [...current, selectedDetail.slug]); setDetailSlug(null); document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" }); }} className="flex min-h-12 w-full items-center justify-center rounded-xl bg-[#078b8d] px-5 text-sm font-extrabold text-white disabled:opacity-50">{selected.includes(selectedDetail.slug) ? "Already added to booking" : "ADD TO BOOKING"}</button>
            </div>
          </article>
        </section>
      ) : (
        <>
          <section className="mx-auto mt-8 max-w-6xl px-4 sm:px-6">
            <div className="mb-4 flex items-end justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#078b8d]">Explore by need</p><h2 className="mt-1 text-xl font-extrabold sm:text-2xl">Health categories</h2></div><span className="text-xs text-slate-500">{loading ? "Loading…" : categories.length - 1 + " categories"}</span></div>
            <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-4 sm:px-0">
              {categories.map((category, index) => <button key={category} type="button" onClick={() => { setActiveCategory(category); setKind("all"); }} className={`w-[43%] shrink-0 snap-start rounded-2xl border p-4 text-left sm:w-auto sm:min-h-[120px] ${activeCategory === category ? "border-[#08b8bb] bg-[#eaf8f7]" : "border-slate-100 bg-white shadow-sm"}`}><span className="mb-3 grid size-10 place-items-center rounded-xl bg-[#eaf8f7] text-xl text-[#078b8d]">{index === 0 ? "✚" : "◈"}</span><strong className="block text-sm">{category === "All" ? "All categories" : category}</strong><span className="mt-1 block text-[11px] text-slate-500">Explore available options</span></button>)}
            </div>
          </section>

          <section className="mx-auto mt-8 max-w-6xl px-4 sm:px-6">
            <div className="mb-4"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#078b8d]">Picked for your wellbeing</p><h2 className="mt-1 text-xl font-extrabold sm:text-2xl">Recommended for you</h2></div>
            <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0">
              {featuredItems.map((item, index) => <article key={item.slug} className="w-[78%] shrink-0 snap-start overflow-hidden rounded-2xl border border-[#dceeed] bg-white shadow-sm sm:w-auto"><div className="flex h-[125px] items-end bg-gradient-to-br from-[#e5f8f5] to-[#e7f0ff] p-4"><span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-bold text-[#087f82]">MFIT HEALTH CHECKUP</span><span className="ml-auto text-4xl font-black text-[#07999b]">{index === 0 ? "✚" : "◈"}</span></div><div className="p-4"><h3 className="min-h-10 text-base font-extrabold">{item.title}</h3><p className="mt-1 text-xs text-slate-500">{cleanCatalogueText(item.description) || "Explore details and included parameters."}</p><p className="mt-3 text-sm font-bold">{formatPrice(item.customer_price)}</p><button type="button" onClick={() => setDetailSlug(item.slug)} className="mt-3 min-h-11 w-full rounded-xl bg-[#078b8d] text-sm font-extrabold text-white">VIEW DETAILS</button></div></article>)}
              {!loading && featuredItems.length === 0 && <p className="rounded-xl bg-white p-4 text-sm text-slate-500">Catalogue options will appear here.</p>}
            </div>
          </section>

          <section id="catalogue" className="mx-auto mt-9 max-w-6xl px-4 sm:px-6">
            <div className="mb-5"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#078b8d]">Popular choices</p><h2 className="mt-1 text-xl font-extrabold sm:text-2xl">Health packages & individual tests</h2></div>
            <div className="mb-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => { setKind("package"); setActiveCategory("All"); }} aria-pressed={kind === "package"} className={`rounded-full px-6 py-3 text-sm font-bold ${kind === "package" ? "bg-[#087f82] text-white" : "border border-slate-200 bg-white"}`}>Packages ({packageCount})</button>
              <button type="button" onClick={() => { setKind("test"); setActiveCategory("All"); }} aria-pressed={kind === "test"} className={`rounded-full px-6 py-3 text-sm font-bold ${kind === "test" ? "bg-[#087f82] text-white" : "border border-slate-200 bg-white"}`}>Individual tests ({testCount})</button>
              <button type="button" onClick={() => { setKind("all"); setActiveCategory("All"); }} aria-pressed={kind === "all"} className={`rounded-full px-4 py-3 text-sm font-bold ${kind === "all" ? "bg-[#087f82] text-white" : "border border-slate-200 bg-white"}`}>All</button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {loading && <p className="rounded-xl bg-white p-5 text-sm text-slate-500">Loading packages and tests…</p>}
              {!loading && visibleItems.map((item) => <article key={item.slug} className="overflow-hidden rounded-2xl border border-[#dceeed] bg-white shadow-sm"><div className="flex min-h-[108px] items-center justify-between bg-gradient-to-r from-[#e8f8f5] to-[#edf3ff] px-5 py-4"><div><span className="rounded-full bg-white px-3 py-1 text-[10px] font-extrabold text-[#087f82]">{item.item_type === "test" ? "MFIT LAB TEST" : "MFIT PACKAGE"}</span><p className="mt-3 text-xs font-semibold text-[#5c7475]">{item.category || "Health"}</p></div><span className="text-4xl font-black text-[#07999b]">{item.item_type === "test" ? "◈" : "✚"}</span></div><div className="p-4"><h3 className="min-h-[48px] text-base font-extrabold">{item.title}</h3><p className="mt-2 min-h-10 text-xs leading-5 text-slate-500">{cleanCatalogueText(item.description) || (item.item_type === "test" ? "Individual diagnostic test" : "Preventive health screening package")}</p><div className="mt-3 flex items-center gap-2">{item.mrp_price !== null && item.customer_price !== null && item.mrp_price > item.customer_price && <span className="text-xs text-slate-400 line-through">{formatPrice(item.mrp_price)}</span>}<strong className="text-sm">{formatPrice(item.customer_price)}</strong></div><button type="button" onClick={() => setDetailSlug(item.slug)} className="mt-4 min-h-11 w-full rounded-xl bg-[#078b8d] text-sm font-extrabold text-white">VIEW {item.item_type === "test" ? "TEST" : "PACKAGE"} & BOOK</button></div></article>)}
              {!loading && !visibleItems.length && <p className="rounded-xl bg-white p-5 text-sm text-slate-500">No matching packages or tests found.</p>}
            </div>
          </section>
        </>
      )}

      {selected.length > 0 && <section id="booking" className="mx-auto mt-10 max-w-4xl px-4 sm:px-6"><form onSubmit={submit} className="space-y-4">
        <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-6"><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#078b8d]">Booking · Step 1</p><h2 className="mt-1 text-lg font-extrabold">Your selected tests & packages</h2><div className="mt-4 space-y-3">{chosenItems.map((item) => <div key={item.slug} className="flex items-center justify-between gap-3 rounded-xl bg-[#f7fafb] p-3"><div><p className="text-sm font-bold">{item.title}</p><p className="mt-1 text-xs text-slate-500">{formatPrice(item.customer_price)}</p></div><button type="button" onClick={() => setSelected((current) => current.filter((value) => value !== item.slug))} className="text-xs font-bold text-rose-600">Remove</button></div>)}</div><div className="mt-4 flex justify-between border-t pt-4"><span className="text-sm font-bold">Total payable to partner</span><strong className="text-xl">{formatPrice(total)}</strong></div></section>
        <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-6"><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#078b8d]">Booking · Step 2</p><h2 className="mt-1 text-lg font-extrabold">Customer details</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{(["name", "phone", "email", "pincode"] as const).map((key) => <label key={key} className="text-xs font-semibold text-slate-600">{key === "name" ? "Full name" : key === "phone" ? "Mobile number" : key === "pincode" ? "Pincode" : "Email (optional)"}<input required={key !== "email"} type={key === "email" ? "email" : "text"} inputMode={key === "phone" || key === "pincode" ? "numeric" : undefined} placeholder={key === "phone" ? "10-digit mobile number" : key === "pincode" ? "6-digit pincode" : key === "email" ? "Email address" : "Enter your full name"} value={customer[key]} onChange={(event) => setCustomer((current) => ({ ...current, [key]: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#08aeb1]" /></label>)}<label className="text-xs font-semibold text-slate-600 sm:col-span-2">Full collection address<textarea required value={customer.address} onChange={(event) => setCustomer((current) => ({ ...current, address: event.target.value }))} rows={3} placeholder="Flat / house, street, area and city" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#08aeb1]" /></label></div></section>
        <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-6"><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#078b8d]">Booking · Step 3</p><h2 className="mt-1 text-lg font-extrabold">Preferred date & time</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-600">Preferred collection date<input required type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm" /></label><label className="text-xs font-semibold text-slate-600">Preferred time window<select value={slot} onChange={(event) => setSlot(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm">{collectionSlots.map((value) => <option key={value}>{value}</option>)}</select></label></div><p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">Your selected date and time are preferences. The collection partner will confirm the visit based on service availability.</p><p className="mt-3 text-[11px] text-slate-500">Payment is collected by your collection partner.</p><button type="submit" disabled={busy || !selected.length || loading} className="mt-5 min-h-12 w-full rounded-xl bg-[#078b8d] text-sm font-extrabold text-white disabled:opacity-50">{busy ? "Submitting…" : "Submit booking request"}</button></section>
      </form></section>}

      <footer className="mt-10 bg-[#17191d] px-5 py-8 text-white"><div className="mx-auto max-w-6xl"><p className="text-lg font-medium">Healthcare made easier with MFIT</p><p className="mt-3 text-xs leading-5 text-white/60">© 2026 MFIT Healthcare. Diagnostic services are subject to availability and confirmation by the collection partner and performing laboratory.</p></div></footer>
      <nav aria-label="Health navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-5px_22px_rgba(15,40,55,0.08)]"><div className="mx-auto grid h-[76px] max-w-3xl grid-cols-4">
        <button type="button" onClick={() => { setDetailSlug(null); setKind("all"); setActiveCategory("All"); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="flex flex-col items-center justify-center gap-1.5 font-bold text-[#078b8d]"><span className="text-2xl">⌂</span><span className="text-[13px]">Home</span></button>
        <button type="button" onClick={() => { setDetailSlug(null); setKind("test"); document.getElementById("catalogue")?.scrollIntoView({ behavior: "smooth" }); }} className="flex flex-col items-center justify-center gap-1.5 text-slate-600"><span className="text-2xl">⚗</span><span className="text-[13px]">Lab Tests</span></button>
        <button type="button" onClick={() => { setDetailSlug(null); setKind("package"); document.getElementById("catalogue")?.scrollIntoView({ behavior: "smooth" }); }} className="flex flex-col items-center justify-center gap-1.5 text-slate-600"><span className="text-2xl">✚</span><span className="text-[13px]">Packages</span></button>
        <button type="button" onClick={() => document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" })} className="flex flex-col items-center justify-center gap-1.5 text-slate-600"><span className="text-2xl">▤</span><span className="text-[13px]">My Booking</span></button>
      </div></nav>
    </main>
  );
}
