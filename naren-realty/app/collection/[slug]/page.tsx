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
  const partnerName = partner?.display_name?.trim() || "Collection Partner";
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
  const [bookingOpen, setBookingOpen] = useState(false);

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
        // Partner landing links always open the full category catalogue.
        // Item details are opened only when a visitor selects a catalogue card.
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

  const packageItems = items.filter((item) => item.item_type === "package");
  const testItems = items.filter((item) => item.item_type === "test");
  const categoryNames = Array.from(new Set(packageItems.map((item) => item.category).filter((value): value is string => Boolean(value))));
  const audienceMatch = (item: Item, audience: "women" | "men" | "children") => {
    const value = (item.title + " " + (item.category || "") + " " + (item.description || "")).toLowerCase();
    const explicitlyWomen = /\bwomen\b|\bwoman\b|female|gynaec|pregnan|maternal|pcos|pcod|breast|menstrual|fertility/.test(value);
    const explicitlyMen = /\bmen\b|\bman\b|male|prostate|testosterone|mens/.test(value);
    const explicitlyChildren = /child|children|paediatric|pediatric|baby|infant|adolescent|teen/.test(value);
    if (audience === "women") return explicitlyWomen && !explicitlyMen;
    if (audience === "men") return explicitlyMen && !explicitlyWomen;
    return explicitlyChildren && !explicitlyWomen && !explicitlyMen;
  };
  const womenPackages = packageItems.filter((item) => audienceMatch(item, "women"));
  const menPackages = packageItems.filter((item) => audienceMatch(item, "men"));
  const childrenPackages = packageItems.filter((item) => audienceMatch(item, "children"));
  const generalCategories = categoryNames.filter((category) => !/women|men|child|paediatric|pediatric/i.test(category));
  const selectedDetail = items.find((item) => item.slug === detailSlug) || null;
  const renderItemCard = (item: Item) => {
    const discount = item.mrp_price !== null && item.customer_price !== null && item.mrp_price > item.customer_price
      ? Math.round((1 - item.customer_price / item.mrp_price) * 100) : 0;
    const includedCount = item.item_type === "package"
      ? (item.package_tests?.length || item.inclusions?.length || 0) : item.inclusions?.length || 0;
    return (
      <article key={item.slug} className="group overflow-hidden rounded-[22px] border border-[#e2e9ed] bg-white shadow-[0_5px_22px_rgba(15,40,55,0.055)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_14px_34px_rgba(15,40,55,0.11)]">
        <div className="relative flex min-h-[126px] items-center justify-between overflow-hidden bg-[radial-gradient(circle_at_82%_24%,rgba(255,255,255,.9),transparent_25%),linear-gradient(115deg,#e4f6f3,#edf7fb_58%,#f2f0ff)] px-5 py-4">
          <div className="relative z-10"><span className="inline-flex rounded-full border border-white/80 bg-white/90 px-3 py-1 text-[9px] font-extrabold uppercase tracking-[.13em] text-[#087f82]">{item.item_type === "test" ? "Individual lab test" : "Health package"}</span><p className="mt-3 max-w-[190px] text-xs font-semibold text-[#547174]">{item.category || "Diagnostic care"}</p>{includedCount > 0 && <p className="mt-1 text-[11px] font-semibold text-[#547174]">{includedCount} {item.item_type === "test" ? "parameters listed" : "included tests / details"}</p>}</div>
          <span aria-hidden="true" className="relative mr-1 grid size-[72px] shrink-0 place-items-center rounded-[24px] border border-white/90 bg-white/75 text-[34px] font-black text-[#078b8d] shadow-[0_8px_20px_rgba(7,127,130,.10)]">{item.item_type === "test" ? "⌬" : "✚"}</span>
          {discount > 0 && <span className="absolute right-3 top-3 rounded-full bg-[#087f82] px-2.5 py-1 text-[10px] font-extrabold text-white">{discount}% OFF</span>}
        </div>
        <div className="p-4 sm:p-5">
          <h3 className="min-h-[48px] text-[15px] font-extrabold leading-snug text-[#202629]">{item.title}</h3>
          <p className="mt-2 min-h-[40px] text-xs leading-5 text-slate-500">{cleanCatalogueText(item.description) || (item.item_type === "test" ? "Individual diagnostic test" : "Preventive health screening package")}</p>
          <div className="mt-4 flex min-h-10 items-end justify-between gap-2 border-t border-slate-100 pt-3">
            <div><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Partner price</p><div className="mt-1 flex flex-wrap items-baseline gap-2">{item.mrp_price !== null && item.customer_price !== null && item.mrp_price > item.customer_price && <span className="text-xs text-slate-400 line-through">{formatPrice(item.mrp_price)}</span>}<strong className="text-lg font-extrabold text-[#172326]">{formatPrice(item.customer_price)}</strong></div></div>
            {discount > 0 && <span className="text-[10px] font-bold text-[#087f82]">You save {formatPrice((item.mrp_price || 0) - (item.customer_price || 0))}</span>}
          </div>
          <button type="button" onClick={() => setDetailSlug(item.slug)} className="mt-4 flex min-h-11 w-full items-center justify-center rounded-xl bg-[#087f82] px-4 text-sm font-extrabold text-white transition hover:bg-[#066c70]">{item.item_type === "test" ? "VIEW TEST DETAILS" : "VIEW PACKAGE DETAILS"} <span className="ml-2">→</span></button>
        </div>
      </article>
    );
  };
  const searched = (item: Item) => (item.title + " " + (item.category || "") + " " + cleanCatalogueText(item.description)).toLowerCase().includes(search.toLowerCase());
  const visiblePackages = packageItems.filter((item) => (activeCategory === "All" || item.category === activeCategory) && searched(item));
  const visibleTests = testItems.filter(searched);

  return (
    <main id="top" className="min-h-screen bg-[#f7fafb] pb-24 text-[#172326]">
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[76px] max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href="#top" className="flex min-w-0 items-center gap-2.5" aria-label={`${partnerName} booking home`}>
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#e9f8f7] text-xl font-black text-[#087f82]">⌂</span>
            <span className="min-w-0"><span className="block max-w-[190px] truncate text-lg font-extrabold text-[#172326] sm:max-w-none sm:text-xl">{partnerName}</span><span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Booking Partner</span></span>
          </a>
          <button type="button" onClick={() => selected.length ? setBookingOpen(true) : setError("Please add a test or package first.")} className="rounded-full bg-[#e9f8f7] px-4 py-2.5 text-xs font-bold text-[#087f82]">My booking{selected.length ? ` (${selected.length})` : ""}</button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pt-5 sm:px-6 sm:pt-8">
        <p className="mb-3 text-sm font-medium text-slate-500">Healthcare services <span className="px-1 text-slate-300">/</span> <strong className="text-[#087f82]">{partnerName}</strong></p>
        <label className="flex h-14 items-center gap-3 rounded-full border border-[#aab6c2] bg-white px-5 shadow-sm focus-within:border-[#08aeb1] focus-within:ring-2 focus-within:ring-[#08b8bb]/15">
          <span className="text-xl text-slate-500">⌕</span>
          <input value={search} onChange={(event) => { setSearch(event.target.value); setDetailSlug(null); }} placeholder="Search CBC, Thyroid, Vitamin D, health packages..." className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500 sm:text-base" />
        </label>
        <div className="mt-5 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[
            { title: "All Tests", subtitle: "Browse all", symbol: "⌕", action: () => { setKind("all"); setActiveCategory("All"); }, tone: "bg-[#eef7ff] text-[#2675ad]" },
            { title: "Packages", subtitle: packageCount + " available", symbol: "✚", action: () => { setKind("package"); setActiveCategory("All"); document.getElementById("catalogue")?.scrollIntoView({ behavior: "smooth" }); }, tone: "bg-[#eaf8f7] text-[#078b8d]" },
            ...(womenPackages.length ? [{ title: "For Women", subtitle: womenPackages.length + " packages", symbol: "♡", action: () => document.getElementById("women-health")?.scrollIntoView({ behavior: "smooth" }), tone: "bg-[#fff0f5] text-[#b84d78]" }] : []),
            ...(menPackages.length ? [{ title: "For Men", subtitle: menPackages.length + " packages", symbol: "◈", action: () => document.getElementById("men-health")?.scrollIntoView({ behavior: "smooth" }), tone: "bg-[#edf3ff] text-[#416bb2]" }] : []),
            ...(childrenPackages.length ? [{ title: "For Children", subtitle: childrenPackages.length + " packages", symbol: "✿", action: () => document.getElementById("children-health")?.scrollIntoView({ behavior: "smooth" }), tone: "bg-[#eff9ec] text-[#4c8b45]" }] : []),
            { title: "Single Tests", subtitle: testCount + " tests", symbol: "⚗", action: () => document.getElementById("individual-tests")?.scrollIntoView({ behavior: "smooth" }), tone: "bg-[#f2efff] text-[#7255ad]" },
            { title: "My Booking", subtitle: selected.length ? selected.length + " selected" : "Review order", symbol: "▤", action: () => selected.length ? setBookingOpen(true) : setError("Please add a test or package first."), tone: "bg-[#fff3e9] text-[#b66a2a]" },
          ].map((action) => <button key={action.title} type="button" onClick={action.action} className={`flex min-w-[118px] shrink-0 flex-col items-center justify-center rounded-2xl border border-slate-100 px-3 py-4 text-center shadow-sm transition hover:-translate-y-0.5 sm:min-w-[140px] sm:rounded-3xl ${action.tone}`}><span className="mb-2 grid size-12 place-items-center rounded-2xl bg-white/80 text-2xl sm:size-14 sm:text-3xl">{action.symbol}</span><strong className="text-xs sm:text-sm">{action.title}</strong><span className="mt-1 text-[10px] opacity-75 sm:text-xs">{action.subtitle}</span></button>)}
        </div>
      </section>

      <section className="mx-auto mt-7 max-w-6xl px-4 sm:px-6">
        <div className="relative min-h-[220px] overflow-hidden rounded-[28px] bg-[linear-gradient(112deg,#064d66_0%,#087e91_54%,#52c4c7_100%)] shadow-[0_16px_38px_rgba(4,84,104,.18)] sm:min-h-[270px]">
          <div aria-hidden="true" className="absolute -right-12 -top-24 size-[330px] rounded-full border-[1px] border-white/15 sm:right-20 sm:size-[390px]" />
          <div aria-hidden="true" className="absolute -right-3 top-8 size-[190px] rounded-full border-[28px] border-white/10 sm:right-36 sm:top-10 sm:size-[220px]" />
          <div aria-hidden="true" className="absolute right-7 top-12 hidden h-[150px] w-[150px] rotate-12 items-center justify-center rounded-[34px] border border-white/30 bg-white/10 text-7xl text-white/90 shadow-2xl backdrop-blur-sm sm:flex">✚</div>
          <div className="relative z-10 max-w-[82%] px-5 py-7 text-white sm:max-w-[65%] sm:px-9 sm:py-10">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#c4fff2] sm:text-xs">Your health, in focus</p>
            <h1 className="mt-2 text-[26px] font-extrabold leading-[1.12] sm:text-[40px]">A healthier you starts with a checkup.</h1>
            <p className="mt-3 max-w-xl text-xs leading-5 text-white/90 sm:text-sm sm:leading-6">Browse preventive health packages and individual lab tests. Choose your tests and request a convenient home sample collection.</p>
            <div className="mt-4 flex flex-wrap items-center gap-3"><button type="button" onClick={() => { setKind("package"); setDetailSlug(null); document.getElementById("catalogue")?.scrollIntoView({ behavior: "smooth" }); }} className="inline-flex min-h-10 items-center rounded-xl bg-white px-4 text-xs font-extrabold text-[#075c78] shadow-sm">Explore packages <span className="ml-2">→</span></button><span className="text-[10px] font-semibold text-white/80">{packageCount} packages · {testCount} individual tests</span></div>
          </div>
        </div>
      </section>

      {error && <div className="mx-auto mt-5 max-w-6xl px-4 sm:px-6"><p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p></div>}

      {selectedDetail ? (
        <section className="mx-auto mt-8 max-w-4xl px-4 sm:px-6">
          <button type="button" onClick={() => setDetailSlug(null)} className="mb-4 text-sm font-bold text-[#078b8d]">← Back to health catalogue</button>
          <article className="overflow-hidden rounded-3xl border border-[#dceeed] bg-white shadow-lg">
            <div className="bg-gradient-to-r from-[#e8f8f5] via-[#f1fbfa] to-[#edf3ff] px-5 py-6 sm:px-7">
              <span className="rounded-full bg-white px-3 py-1 text-[10px] font-extrabold uppercase text-[#087f82]">{selectedDetail.item_type === "package" ? "HEALTH PACKAGE" : "INDIVIDUAL LAB TEST"}</span>
              <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">{selectedDetail.title}</h2>
              {selectedDetail.category && <p className="mt-2 text-sm font-semibold text-[#5c7475]">{selectedDetail.category}</p>}
              {cleanCatalogueText(selectedDetail.description) && <p className="mt-3 text-sm leading-6 text-slate-600">{cleanCatalogueText(selectedDetail.description)}</p>}
              <strong className="mt-4 block text-xl">{formatPrice(selectedDetail.customer_price)}</strong>
            </div>
            <div className="space-y-5 p-5 sm:p-7">
              <div className="grid grid-cols-3 gap-3 rounded-2xl bg-[#f7fafb] p-4"><div><p className="text-[10px] font-bold uppercase text-slate-400">Sample</p><p className="mt-1 text-xs">{selectedDetail.sample_type || "To be confirmed"}</p></div><div><p className="text-[10px] font-bold uppercase text-slate-400">Preparation</p><p className="mt-1 text-xs">{selectedDetail.preparation || "To be confirmed"}</p></div><div><p className="text-[10px] font-bold uppercase text-slate-400">Report time</p><p className="mt-1 text-xs">{selectedDetail.report_tat || "To be confirmed"}</p></div></div>
              {selectedDetail.item_type === "test" ? <ParameterList values={selectedDetail.inclusions || []} note={selectedDetail.inclusionsNote} /> : <div><h3 className="mb-3 text-base font-extrabold">Included tests & parameters</h3>{selectedDetail.package_tests?.length ? <div className="space-y-3">{selectedDetail.package_tests.map((test) => <TestDetails key={test.slug} test={test} />)}</div> : selectedDetail.inclusions?.length ? <PackageInclusionList values={selectedDetail.inclusions} /> : <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">Included test and parameter details are awaiting confirmation from the performing laboratory.</p>}{selectedDetail.inclusionsNote && <p className="mt-3 text-[11px] text-amber-800">{cleanCatalogueText(selectedDetail.inclusionsNote)}</p>}</div>}
              <button type="button" disabled={selectedDetail.customer_price === null} onClick={() => { setSelected((current) => current.includes(selectedDetail.slug) ? current : [...current, selectedDetail.slug]); setDetailSlug(null); setBookingOpen(true); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="flex min-h-12 w-full items-center justify-center rounded-xl bg-[#078b8d] px-5 text-sm font-extrabold text-white disabled:opacity-50">{selected.includes(selectedDetail.slug) ? "Already added to booking" : "ADD TO BOOKING"}</button>
            </div>
          </article>
        </section>
      ) : (
        <>
          <section className="mx-auto mt-8 max-w-6xl px-4 sm:px-6">
            <div className="mb-4 flex items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#078b8d]">Explore by need</p><h2 className="mt-1 text-xl font-extrabold sm:text-2xl">Health package categories</h2></div><span className="pb-1 text-xs font-semibold text-slate-500">{loading ? "Loading…" : generalCategories.length + " categories"}</span></div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {generalCategories.map((category, index) => <button key={category} type="button" onClick={() => { setActiveCategory(category); setKind("package"); document.getElementById("catalogue")?.scrollIntoView({ behavior: "smooth" }); }} className="group overflow-hidden rounded-2xl border border-slate-100 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="relative flex aspect-[1.55/1] items-end overflow-hidden bg-[#e7f5f7] p-3"><img src={/women|female|gynae/i.test(category) ? "https://images.unsplash.com/photo-1559757175-0eb30cd8c063?auto=format&fit=crop&w=900&q=85" : /men|male/i.test(category) ? "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=85" : /child|paediatric|pediatric/i.test(category) ? "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=900&q=85" : /lifestyle|fitness|nutrition/i.test(category) ? "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=900&q=85" : "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=900&q=85"} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" /><span className="absolute inset-0 bg-gradient-to-t from-[#082b3a]/75 to-transparent" /><span className="relative rounded-full bg-white/95 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wide text-[#087f82]">Health category</span></div>
                <div className="p-3"><h3 className="text-sm font-extrabold leading-tight">{category}</h3><p className="mt-1 text-[11px] text-slate-500">{packageItems.filter((item) => item.category === category).length} packages available</p><span className="mt-2 inline-flex text-xs font-bold text-[#078b8d]">Explore packages →</span></div>
              </button>)}
              {!loading && generalCategories.length === 0 && <p className="col-span-full rounded-xl bg-white p-5 text-sm text-slate-500">Health package categories will appear here when available.</p>}
            </div>
          </section>

          {[
            { title: "Women’s Health", subtitle: "Health packages for women", items: womenPackages, image: "https://images.unsplash.com/photo-1559757175-0eb30cd8c063?auto=format&fit=crop&w=900&q=85", icon: "♡" },
            { title: "Men’s Health", subtitle: "Health packages for men", items: menPackages, image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=85", icon: "◈" },
            { title: "Children’s Health", subtitle: "Health packages for children", items: childrenPackages, image: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=900&q=85", icon: "✚" },
          ].filter((section) => section.items.length > 0).map((section) => <section id={section.title.startsWith("Women") ? "women-health" : section.title.startsWith("Men") ? "men-health" : "children-health"} key={section.title} className="mx-auto mt-9 max-w-6xl scroll-mt-28 px-4 sm:px-6">
            <div className="mb-4 flex items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#078b8d]">Curated health packages</p><h2 className="mt-1 text-xl font-extrabold sm:text-2xl">{section.title}</h2><p className="mt-1 text-xs text-slate-500">{section.subtitle}</p></div><span className="text-xs font-semibold text-slate-500">{section.items.length} packages</span></div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{section.items.map(renderItemCard)}</div>
          </section>)}

          <section id="catalogue" className="mx-auto mt-10 max-w-6xl scroll-mt-28 px-4 sm:px-6">
            <div className="mb-5"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#078b8d]">Browse catalogue</p><h2 className="mt-1 text-xl font-extrabold sm:text-2xl">Health packages</h2></div>
            <div className="mb-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => { setKind("package"); setActiveCategory("All"); }} aria-pressed={kind === "package"} className={`rounded-full px-5 py-2.5 text-sm font-bold ${kind === "package" ? "bg-[#087f82] text-white" : "border border-slate-200 bg-white"}`}>All packages ({packageItems.length})</button>
              {generalCategories.map((category) => <button key={category} type="button" onClick={() => { setKind("package"); setActiveCategory(category); }} aria-pressed={activeCategory === category && kind === "package"} className={`rounded-full px-4 py-2.5 text-sm font-semibold ${activeCategory === category && kind === "package" ? "bg-[#087f82] text-white" : "border border-slate-200 bg-white"}`}>{category}</button>)}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {loading && <p className="rounded-xl bg-white p-5 text-sm text-slate-500">Loading health packages…</p>}
              {!loading && visiblePackages.map(renderItemCard)}
              {!loading && !visiblePackages.length && <p className="rounded-xl bg-white p-5 text-sm text-slate-500">No packages match this category or search.</p>}
            </div>
          </section>

          <section id="individual-tests" className="mx-auto mt-10 max-w-6xl scroll-mt-28 px-4 sm:px-6">
            <div className="mb-5"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#078b8d]">Individual diagnostics</p><h2 className="mt-1 text-xl font-extrabold sm:text-2xl">Single Lab Tests</h2><p className="mt-1 text-xs text-slate-500">Browse and book individual tests separately from health packages.</p></div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {loading && <p className="rounded-xl bg-white p-5 text-sm text-slate-500">Loading individual tests…</p>}
              {!loading && visibleTests.map(renderItemCard)}
              {!loading && !visibleTests.length && <p className="rounded-xl bg-white p-5 text-sm text-slate-500">No individual tests match your search.</p>}
            </div>
          </section>
        </>
      )}

      {bookingOpen && selected.length > 0 && <section id="booking" className="fixed inset-0 z-50 overflow-y-auto bg-[#f7fafb] px-4 py-6 sm:px-6"><div className="mx-auto max-w-4xl"><button type="button" onClick={() => setBookingOpen(false)} className="mb-5 text-sm font-bold text-[#078b8d]">← Back to health catalogue</button><div className="mb-5"><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#078b8d]">Complete your request</p><h1 className="mt-1 text-2xl font-extrabold">Book your lab tests</h1><div className="mt-4 grid grid-cols-3 gap-2">{["Review","Your details","Schedule"].map((label,index)=><div key={label} className="rounded-xl bg-[#e9f7f5] px-2 py-3 text-center"><span className="mx-auto grid size-6 place-items-center rounded-full bg-[#078b8d] text-xs font-bold text-white">{index+1}</span><span className="mt-1 block text-[11px] font-bold text-[#126c6d]">{label}</span></div>)}</div></div><form onSubmit={submit} className="space-y-4">
        <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-6"><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#078b8d]">Booking · Step 1</p><h2 className="mt-1 text-lg font-extrabold">Your selected tests & packages</h2><div className="mt-4 space-y-3">{chosenItems.map((item) => <div key={item.slug} className="flex items-center justify-between gap-3 rounded-xl bg-[#f7fafb] p-3"><div><p className="text-sm font-bold">{item.title}</p><p className="mt-1 text-xs text-slate-500">{formatPrice(item.customer_price)}</p></div><button type="button" onClick={() => setSelected((current) => current.filter((value) => value !== item.slug))} className="text-xs font-bold text-rose-600">Remove</button></div>)}</div><div className="mt-4 flex justify-between border-t pt-4"><span className="text-sm font-bold">Total payable to partner</span><strong className="text-xl">{formatPrice(total)}</strong></div></section>
        <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-6"><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#078b8d]">Booking · Step 2</p><h2 className="mt-1 text-lg font-extrabold">Customer details</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{(["name", "phone", "email", "pincode"] as const).map((key) => <label key={key} className="text-xs font-semibold text-slate-600">{key === "name" ? "Full name" : key === "phone" ? "Mobile number" : key === "pincode" ? "Pincode" : "Email (optional)"}<input required={key !== "email"} type={key === "email" ? "email" : "text"} inputMode={key === "phone" || key === "pincode" ? "numeric" : undefined} placeholder={key === "phone" ? "10-digit mobile number" : key === "pincode" ? "6-digit pincode" : key === "email" ? "Email address" : "Enter your full name"} value={customer[key]} onChange={(event) => setCustomer((current) => ({ ...current, [key]: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#08aeb1]" /></label>)}<label className="text-xs font-semibold text-slate-600 sm:col-span-2">Full collection address<textarea required value={customer.address} onChange={(event) => setCustomer((current) => ({ ...current, address: event.target.value }))} rows={3} placeholder="Flat / house, street, area and city" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#08aeb1]" /></label></div></section>
        <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-6"><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#078b8d]">Booking · Step 3</p><h2 className="mt-1 text-lg font-extrabold">Preferred date & time</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-600">Preferred collection date<input required type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm" /></label><label className="text-xs font-semibold text-slate-600">Preferred time window<select value={slot} onChange={(event) => setSlot(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm">{collectionSlots.map((value) => <option key={value}>{value}</option>)}</select></label></div><p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">Your selected date and time are preferences. The collection partner will confirm the visit based on service availability.</p><p className="mt-3 text-[11px] text-slate-500">Payment is collected by your collection partner.</p><button type="submit" disabled={busy || !selected.length || loading} className="mt-5 min-h-12 w-full rounded-xl bg-[#078b8d] text-sm font-extrabold text-white disabled:opacity-50">{busy ? "Submitting…" : "Submit booking request"}</button></section>
      </form></div></section>}

      <footer className="mt-10 bg-[#17191d] px-5 py-8 text-white"><div className="mx-auto max-w-6xl"><p className="text-lg font-medium">Booking made easier with {partnerName}</p><p className="mt-3 text-xs leading-5 text-white/60">© 2026 {partnerName}. Diagnostic services are subject to availability and confirmation by the collection partner and performing laboratory.</p></div></footer>
      <nav aria-label="Health navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-5px_22px_rgba(15,40,55,0.08)]"><div className="mx-auto grid h-[76px] max-w-3xl grid-cols-4">
        <button type="button" onClick={() => { setDetailSlug(null); setKind("all"); setActiveCategory("All"); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="flex flex-col items-center justify-center gap-1.5 font-bold text-[#078b8d]"><span className="text-2xl">⌂</span><span className="text-[13px]">Home</span></button>
        <button type="button" onClick={() => { setDetailSlug(null); setKind("test"); document.getElementById("individual-tests")?.scrollIntoView({ behavior: "smooth" }); }} className="flex flex-col items-center justify-center gap-1.5 text-slate-600"><span className="text-2xl">⚗</span><span className="text-[13px]">Lab Tests</span></button>
        <button type="button" onClick={() => { setDetailSlug(null); setKind("package"); document.getElementById("catalogue")?.scrollIntoView({ behavior: "smooth" }); }} className="flex flex-col items-center justify-center gap-1.5 text-slate-600"><span className="text-2xl">✚</span><span className="text-[13px]">Packages</span></button>
        <button type="button" onClick={() => { if (selected.length) { setBookingOpen(true); window.scrollTo({ top: 0, behavior: "smooth" }); } else { setError("Please add a test or package first."); } }} className="flex flex-col items-center justify-center gap-1.5 text-slate-600"><span className="text-2xl">▤</span><span className="text-[13px]">My Booking{selected.length ? ` (${selected.length})` : ""}</span></button>
      </div></nav>
    </main>
  );
}
