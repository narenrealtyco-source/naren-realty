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
  return (value || "").replace(/Pune listing:\s*[^.]*\.?\s*/gi, "").trim();
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
      <p className="mb-2 text-xs font-extrabold text-[#10243A]">Included parameters ({values.length})</p>
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

function TestDetails({ test }: { test: PackageTest }) {
  return (
    <details className="group rounded-xl border border-slate-200 bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block text-sm font-bold text-[#10243A]">{test.title}</span>
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
    (item.title + " " + (item.category || "") + " " + cleanCatalogueText(item.description)).toLowerCase().includes(search.toLowerCase())
  ), [items, kind, search]);

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
      <main className="min-h-screen bg-[#f4f7fc] px-4 py-10 text-[#10243A]">
        <section className="mx-auto max-w-xl rounded-3xl bg-white p-7 text-center shadow-[0_8px_32px_rgba(16,36,58,.08)]">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-50 text-3xl font-bold text-emerald-700">✓</span>
          <p className="mt-5 text-xs font-extrabold uppercase tracking-[.18em] text-emerald-700">Booking request received</p>
          <h1 className="mt-2 text-2xl font-extrabold">Thank you for your booking</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">Your collection partner will contact you to confirm the collection visit.</p>
          <p className="mt-5 rounded-xl bg-[#f4f7fc] p-4 text-sm font-extrabold">Booking reference: {success}</p>
          <p className="mt-4 text-xs leading-5 text-slate-500">Your preferred date and time will be confirmed by the collection partner.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f7fc] pb-10 text-[#10243A]">
      <header className="bg-[#10243A] px-4 pb-7 pt-5 text-white shadow-md sm:pb-9">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center justify-between gap-3 border-b border-white/15 pb-4">
            <a href="/" className="text-lg font-extrabold tracking-wide">NAREN <span className="text-amber-400">REALTY</span></a>
            <span className="rounded-full border border-white/20 px-3 py-1.5 text-[10px] font-bold tracking-wide text-slate-200">HEALTH CHECKUP</span>
          </div>
          <div className="pt-6 sm:pt-8">
            <p className="text-[11px] font-bold uppercase tracking-[.2em] text-amber-400">Simple · Convenient · At home</p>
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
              <div><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-amber-600">Step 1 · Choose your tests</p><h2 className="mt-1 text-lg font-extrabold sm:text-xl">Packages & individual tests</h2><p className="mt-1 text-xs text-slate-500">Review the details and select what you need.</p></div>
              <span className="rounded-full bg-[#f4f7fc] px-3 py-1.5 text-xs font-bold text-slate-600">{loading ? "Loading…" : items.length + " options"}</span>
            </div>
            <label className="mt-4 flex h-12 items-center gap-3 rounded-xl border border-slate-200 px-3 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-100">
              <span className="text-lg text-slate-400">⌕</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search package or test name…" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400" />
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              {(["all", "package", "test"] as const).map((value) => (
                <button key={value} type="button" onClick={() => setKind(value)} className={"rounded-full px-4 py-2 text-xs font-bold transition " + (kind === value ? "bg-[#10243A] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>
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
                return (
                  <article key={item.slug} className={"rounded-2xl border p-3.5 transition sm:p-4 " + (isSelected ? "border-amber-400 bg-amber-50/40 shadow-sm" : "border-slate-200 bg-white")}>
                    <div className="flex items-start gap-3">
                      <input aria-label={"Select " + item.title} type="checkbox" checked={isSelected} disabled={item.customer_price === null} onChange={(event) => setSelected((current) => event.target.checked ? [...current, item.slug] : current.filter((value) => value !== item.slug))} className="mt-1 size-5 shrink-0 accent-[#10243A]" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-[#edf2f8] px-2.5 py-1 text-[10px] font-bold text-[#10243A]">{isPackage ? "PACKAGE" : "SINGLE TEST"}</span>
                          {item.category && <span className="text-[10px] font-semibold text-slate-500">{item.category}</span>}
                        </div>
                        <h3 className="mt-2 text-sm font-extrabold leading-5 sm:text-base">{item.title}</h3>
                        {cleanCatalogueText(item.description) && <p className="mt-1 text-xs leading-5 text-slate-600">{cleanCatalogueText(item.description)}</p>}
                        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                          {item.mrp_price !== null && saving && <span className="text-xs text-slate-400 line-through">₹{Number(item.mrp_price).toLocaleString("en-IN")}</span>}
                          <strong className="text-sm text-[#10243A]">{formatPrice(item.customer_price)}</strong>
                          {saving && <span className="text-[11px] font-bold text-emerald-700">Save ₹{(Number(item.mrp_price) - Number(item.customer_price)).toLocaleString("en-IN")}</span>}
                        </div>
                      </div>
                    </div>

                    <details className="mt-3 rounded-xl border border-slate-100 bg-[#f8fafc]">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 text-xs font-extrabold text-[#10243A] [&::-webkit-details-marker]:hidden">
                        <span>{isPackage ? "View included tests & parameters" : "View test parameters"}</span>
                        <span className="text-base text-amber-600">⌄</span>
                      </summary>
                      <div className="space-y-3 border-t border-slate-200 px-3 pb-3 pt-3">
                        <div className="grid grid-cols-3 gap-2">
                          <div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Sample</p><p className="mt-1 text-[11px] leading-4 text-slate-700">{item.sample_type || "To be confirmed"}</p></div>
                          <div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Preparation</p><p className="mt-1 text-[11px] leading-4 text-slate-700">{item.preparation || "To be confirmed"}</p></div>
                          <div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Report time</p><p className="mt-1 text-[11px] leading-4 text-slate-700">{item.report_tat || "To be confirmed"}</p></div>
                        </div>
                        {!isPackage && <ParameterList values={item.inclusions || []} note={item.inclusionsNote} />}
                        {isPackage && <div>
                          <p className="mb-2 text-xs font-extrabold text-[#10243A]">Tests included ({item.package_tests?.length || 0})</p>
                          {item.package_tests?.length ? <div className="space-y-2">{item.package_tests.map((test) => <TestDetails key={test.slug} test={test} />)}</div> : <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">Included test mapping is not available yet. Please confirm the final panel with the collection partner.</p>}
                          {item.inclusions?.length > 0 && <div className="mt-3"><p className="mb-2 text-xs font-extrabold text-[#10243A]">Additional package inclusions</p><ParameterList values={item.inclusions} note={item.inclusionsNote} /></div>}
                        </div>}
                      </div>
                    </details>
                  </article>
                );
              })}
              {!loading && !visibleItems.length && <p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">No matching packages or tests found.</p>}
            </div>
            <p className="mt-4 text-[11px] leading-5 text-slate-500">Select one or more options. The displayed customer price is payable to your collection partner.</p>
          </section>

          <section className="rounded-2xl bg-white p-4 shadow-[0_3px_18px_rgba(15,35,65,.05)] ring-1 ring-slate-100 sm:p-6">
            <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-amber-600">Step 2 · Your details</p>
            <h2 className="mt-1 text-lg font-extrabold">Customer details</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {(["name", "phone", "email", "pincode"] as const).map((key) => (
                <label key={key} className="text-xs font-semibold text-slate-600">
                  {key === "name" ? "Full name" : key === "phone" ? "Mobile number" : key === "pincode" ? "Pincode" : "Email (optional)"}
                  <input required={key !== "email"} type={key === "email" ? "email" : "text"} inputMode={key === "phone" || key === "pincode" ? "numeric" : undefined} placeholder={key === "phone" ? "10-digit mobile number" : key === "pincode" ? "6-digit pincode" : key === "email" ? "Email address" : "Enter your full name"} value={customer[key]} onChange={(event) => setCustomer((current) => ({ ...current, [key]: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100" />
                </label>
              ))}
              <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Full collection address
                <textarea required value={customer.address} onChange={(event) => setCustomer((current) => ({ ...current, address: event.target.value }))} rows={3} placeholder="Flat / house, street, area and city" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100" />
              </label>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-4 shadow-[0_3px_18px_rgba(15,35,65,.05)] ring-1 ring-slate-100 sm:p-6">
            <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-amber-600">Step 3 · Collection preference</p>
            <h2 className="mt-1 text-lg font-extrabold">Preferred date & time</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-600">Preferred collection date
                <input required type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100" />
              </label>
              <label className="text-xs font-semibold text-slate-600">Preferred time window
                <select value={slot} onChange={(event) => setSlot(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100">
                  {collectionSlots.map((value) => <option key={value}>{value}</option>)}
                </select>
              </label>
            </div>
            <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">Your selected date and time are preferences. The collection partner will confirm the visit based on service availability.</p>
          </section>

          <section className="rounded-2xl bg-white p-4 shadow-[0_3px_18px_rgba(15,35,65,.05)] ring-1 ring-slate-100 sm:p-6">
            <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-amber-600">Step 4 · Review</p>
            <h2 className="mt-1 text-lg font-extrabold">Booking summary</h2>
            {chosenItems.length ? <div className="mt-3 space-y-2">{chosenItems.map((item) => <div key={item.slug} className="flex items-start justify-between gap-3 text-sm"><span className="min-w-0 text-slate-600">{item.title}</span><strong className="shrink-0">{formatPrice(item.customer_price)}</strong></div>)}</div> : <p className="mt-3 text-xs text-slate-500">Your selected packages and tests will appear here.</p>}
            <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4"><span className="text-sm font-bold">Total payable to partner</span><strong className="text-xl">{formatPrice(selected.length ? total : 0)}</strong></div>
            <p className="mt-2 text-[11px] leading-5 text-slate-500">Payment is collected by your collection partner. Your booking request will be shared with the partner for confirmation.</p>
            <button type="submit" disabled={busy || !selected.length || loading} className="mt-5 flex min-h-12 w-full items-center justify-center rounded-xl bg-[#10243A] px-5 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#193b5e] disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Submitting…" : "Submit booking request"}</button>
          </section>
        </form>

        <footer className="pb-4 pt-2 text-center text-[11px] leading-5 text-slate-400">Diagnostic services are fulfilled by the processing laboratory disclosed during booking or collection.</footer>
      </div>
    </main>
  );
}
