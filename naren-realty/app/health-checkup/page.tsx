"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

const quickActions = [
  { title: "Full Body", subtitle: "Packages", symbol: "✚", href: "#packages", tone: "bg-[#eaf8f7] text-[#078b8d]" },
  { title: "Book via", subtitle: "Call", symbol: "☎", href: "#contact", tone: "bg-[#edf5ff] text-[#2476bd]" },
  { title: "Book via", subtitle: "WhatsApp", symbol: "◉", href: "#contact", tone: "bg-[#eaf8ef] text-[#23965a]" },
  { title: "Upload", subtitle: "Prescription", symbol: "▤", href: "#prescription", tone: "bg-[#fff0f5] text-[#c45a87]" },
];

const categories = [
  { title: "Full Body Checkup", subtitle: "Explore preventive health packages", image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1000&q=85", tag: "Popular" },
  { title: "Lifestyle Checkup", subtitle: "Health screening for everyday wellbeing", image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1000&q=85", tag: "Explore" },
  { title: "Women's Health", subtitle: "Screening and wellness options", image: "https://images.unsplash.com/photo-1559757175-0eb30cd8c063?auto=format&fit=crop&w=1000&q=85", tag: "Explore" },
  { title: "Senior Citizen Care", subtitle: "Health checkup options for seniors", image: "https://images.unsplash.com/photo-1576765608866-5b510464521b?auto=format&fit=crop&w=1000&q=85", tag: "Explore" },
];

const audienceCategories = [
  { title: "Adult Women", image: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=700&q=85" },
  { title: "Senior Women", image: "https://images.unsplash.com/photo-1576765608866-5b510464521b?auto=format&fit=crop&w=700&q=85" },
  { title: "Fitness", image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=700&q=85" },
];

const recommendedPackages = [
  { title: "Comprehensive Full Body Checkup", detail: "Explore a broad preventive screening option", image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=85", label: "Full body" },
  { title: "Complete Blood Count (CBC)", detail: "Ask about this individual blood test", image: "https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=800&q=85", label: "Lab test" },
  { title: "Women's Health Checkup", detail: "Explore available women's health options", image: "https://images.unsplash.com/photo-1559757175-0eb30cd8c063?auto=format&fit=crop&w=800&q=85", label: "Women's health" },
];

const mostBookedPackages = [
  { title: "Comprehensive Gold Full Body Checkup", detail: "Full body preventive health screening", image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=900&q=85", tag: "Popular" },
  { title: "Comprehensive Silver Full Body Checkup", detail: "Essential health screening package", image: "https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=900&q=85", tag: "Popular" },
  { title: "Comprehensive Full Body Checkup", detail: "Explore a complete health screening option", image: "https://images.unsplash.com/photo-1559757175-0eb30cd8c063?auto=format&fit=crop&w=900&q=85", tag: "Recommended" },
];
const mostBookedTests = [
  { title: "Complete Blood Count (CBC)", detail: "Common blood screening test", image: "https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=900&q=85", tag: "Popular" },
  { title: "Thyroid Profile", detail: "Thyroid function blood test", image: "https://images.unsplash.com/photo-1582719471384-894fbb16e074?auto=format&fit=crop&w=900&q=85", tag: "Popular" },
  { title: "Vitamin D Test", detail: "Vitamin D level assessment", image: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=900&q=85", tag: "Popular" },
];

const services = [
  { title: "Blood Tests", description: "Browse individual lab tests", image: "https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=900&q=85" },
  { title: "Home Sample Collection", description: "Ask about sample collection at home", image: "https://images.unsplash.com/photo-1584982751601-97dcc096659c?auto=format&fit=crop&w=900&q=85" },
  { title: "Doctor Consultation", description: "Explore consultation options", image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=900&q=85" },
];

function Brand() {
  return (
    <Link href="/health-checkup" aria-label="MFIT Healthcare home" className="flex shrink-0 items-center gap-2.5">
      <span className="grid size-11 place-items-center rounded-md bg-[#08b8bb] text-3xl font-black leading-none text-white">M</span>
      <span className="leading-none">
        <span className="block text-[25px] font-extrabold tracking-[-0.07em] text-[#15191b]">FIT</span>
        <span className="mt-1 block text-[12px] font-semibold tracking-[0.01em] text-[#222729]">Healthcare</span>
      </span>
    </Link>
  );
}

export default function HealthPage() {
  const [query, setQuery] = useState("");
  const [fileName, setFileName] = useState("");
  const [mostBookedTab, setMostBookedTab] = useState<"packages" | "tests">("packages");
  const filtered = useMemo(() => categories.filter((item) => `${item.title} ${item.subtitle}`.toLowerCase().includes(query.toLowerCase())), [query]);

  return (
    <main id="top" className="min-h-screen bg-[#f7fafb] pb-24 text-[#172326]">
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[76px] max-w-6xl items-center justify-between px-4 sm:px-6">
          <Brand />
          <a href="#contact" className="rounded-full bg-[#e9f8f7] px-4 py-2.5 text-xs font-bold text-[#087f82] sm:text-sm">Contact us</a>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pt-5 sm:px-6 sm:pt-8">
        <p className="mb-3 text-sm font-medium text-slate-500">Healthcare services <span className="px-1 text-slate-300">/</span> <strong className="text-[#087f82]">MFIT Healthcare</strong></p>
        <label className="flex h-14 items-center gap-3 rounded-full border border-[#aab6c2] bg-white px-5 shadow-[0_4px_16px_rgba(15,40,55,0.04)] focus-within:border-[#08aeb1] focus-within:ring-2 focus-within:ring-[#08b8bb]/15">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0 text-slate-600" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search health packages and services" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500 sm:text-base" />
        </label>
        <div className="mt-5 grid grid-cols-4 gap-2.5 sm:gap-4">
          {quickActions.map((action) => (
            <a key={action.subtitle} href={action.href} className={`flex min-h-[112px] flex-col items-center justify-center rounded-2xl px-1.5 py-3 text-center shadow-[0_3px_12px_rgba(15,40,55,0.035)] transition hover:-translate-y-0.5 sm:min-h-[140px] sm:rounded-3xl ${action.tone}`}>
              <span className="mb-2 text-[30px] font-semibold leading-none sm:text-[38px]">{action.symbol}</span>
              <span className="text-[11px] leading-tight opacity-80 sm:text-sm">{action.title}</span>
              <strong className="mt-1 text-[12px] leading-tight sm:text-base">{action.subtitle}</strong>
            </a>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-7 max-w-6xl px-4 sm:px-6">
        <div className="relative isolate min-h-[190px] overflow-hidden rounded-[26px] bg-gradient-to-r from-[#075c78] via-[#087f98] to-[#50c1d0] shadow-[0_12px_28px_rgba(7,89,113,0.17)] sm:min-h-[230px]">
          <img src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1000&q=85" alt="Healthcare professional" className="absolute inset-y-0 right-0 -z-10 h-full w-[52%] object-cover object-center opacity-55 sm:w-[42%]" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#075c78] via-[#087f98]/95 to-transparent" />
          <div className="max-w-[72%] px-5 py-6 text-white sm:max-w-[66%] sm:px-8 sm:py-9">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#baf4ee] sm:text-xs">Your health, in focus</p>
            <h1 className="mt-2 text-[25px] font-extrabold leading-[1.08] tracking-tight sm:text-4xl">Make your health a priority.</h1>
            <p className="mt-2 max-w-md text-xs leading-5 text-white/90 sm:text-base">Explore checkup options and healthcare services with MFIT Healthcare.</p>
            <a href="#packages" className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-white px-4 text-xs font-extrabold text-[#075c78] shadow-sm transition hover:bg-[#e9fbf8] sm:text-sm">Explore packages <span className="ml-2">→</span></a>
          </div>
        </div>
      </section>

      <section id="packages" className="mx-auto mt-8 max-w-6xl px-4 sm:px-6">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#078b8d]">Explore by need</p><h2 className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl">Health checkup packages</h2></div>
          <span className="pb-1 text-xs font-semibold text-slate-500">{filtered.length} options</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {filtered.map((item) => (
            <a key={item.title} href="#contact" className="group overflow-hidden rounded-2xl bg-white shadow-[0_4px_18px_rgba(15,40,55,0.06)] ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-lg">
              <div className="relative aspect-[1.35/1] overflow-hidden bg-[#e7f5f7]"><img src={item.image} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /><span className="absolute left-2 top-2 rounded-full bg-white/90 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-[#087f82]">{item.tag}</span></div>
              <div className="p-3"><h3 className="text-sm font-extrabold leading-tight sm:text-base">{item.title}</h3><p className="mt-1.5 text-[11px] leading-4 text-slate-500 sm:text-xs">{item.subtitle}</p><span className="mt-3 inline-flex items-center text-xs font-bold text-[#078b8d]">Enquire now <span className="ml-1">→</span></span></div>
            </a>
          ))}
        </div>
        {filtered.length === 0 && <p className="rounded-xl bg-white p-5 text-sm text-slate-500">No matching packages found. Try another search.</p>}
      </section>

      <section className="mx-auto mt-9 max-w-6xl px-4 sm:px-6">
        <div className="mb-4"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#078b8d]">More ways to care</p><h2 className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl">Health services</h2></div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          {services.map((item) => <a key={item.title} href="#contact" className="group flex overflow-hidden rounded-2xl bg-white shadow-[0_4px_18px_rgba(15,40,55,0.05)] ring-1 ring-slate-100"><img src={item.image} alt="" loading="lazy" className="h-28 w-28 shrink-0 object-cover sm:h-32 sm:w-32" /><span className="flex min-w-0 flex-col justify-center p-3"><strong className="text-sm font-extrabold">{item.title}</strong><span className="mt-1 text-xs leading-4 text-slate-500">{item.description}</span><span className="mt-2 text-xs font-bold text-[#078b8d]">Know more →</span></span></a>)}
        </div>
      </section>

      <section className="mx-auto mt-10 max-w-6xl px-4 sm:px-6">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">Explore health categories</h2><span className="text-xs font-semibold text-slate-400">Swipe to explore</span></div>
        <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0">
          {audienceCategories.map((item) => <a key={item.title} href="#recommended" className="w-[72%] shrink-0 snap-start sm:w-auto">
            <div className="overflow-hidden rounded-2xl bg-[#fbeef0]"><img src={item.image} alt={item.title} loading="lazy" className="h-[145px] w-full object-cover sm:h-[175px]" /></div>
            <h3 className="mt-2 text-center text-base font-semibold text-[#252b2e]">{item.title}</h3>
          </a>)}
        </div>
      </section>

      <section className="mx-auto mt-7 max-w-6xl px-4 sm:px-6">
        <a href="#recommended" className="flex min-h-[76px] items-center justify-center rounded-2xl bg-[#08b8bb] px-4 py-5 text-center text-base font-extrabold text-white shadow-[0_8px_18px_rgba(8,184,187,0.2)] transition hover:bg-[#079da0] sm:text-lg">Explore Packages for Women <span className="ml-2">→</span></a>
      </section>

      <section id="recommended" className="mx-auto mt-9 max-w-6xl px-4 sm:px-6">
        <div className="mb-4"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#078b8d]">Picked for your wellbeing</p><h2 className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl">Recommended for you</h2></div>
        <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0">
          {recommendedPackages.map((item) => <article key={item.title} className="w-[78%] shrink-0 snap-start overflow-hidden rounded-2xl bg-white shadow-[0_4px_18px_rgba(15,40,55,0.07)] ring-1 ring-slate-100 sm:w-auto">
            <div className="relative"><img src={item.image} alt="" loading="lazy" className="h-[190px] w-full object-cover" /><span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-bold text-[#087f82]">{item.label}</span></div>
            <div className="p-4"><h3 className="min-h-10 text-base font-extrabold leading-snug">{item.title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{item.detail}</p><p className="mt-3 text-sm font-bold text-[#172326]">Price on enquiry</p><a href="#contact" className="mt-3 flex min-h-11 items-center justify-center rounded-xl border border-[#08b8bb] text-sm font-extrabold text-[#078b8d] transition hover:bg-[#eaf8f7]">ENQUIRE</a></div>
          </article>)}
        </div>
      </section>

      <section id="most-booked" className="mx-auto mt-10 max-w-6xl px-4 sm:px-6">
        <div className="mb-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#078b8d]">Popular choices</p>
          <h2 className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl">Most booked health checkups</h2>
        </div>
        <div className="mb-5 flex gap-2">
          <button type="button" onClick={() => setMostBookedTab("packages")} aria-pressed={mostBookedTab === "packages"} className={`rounded-full px-6 py-3 text-sm font-bold transition ${mostBookedTab === "packages" ? "bg-[#172326] text-white shadow-sm" : "border border-slate-200 bg-white text-[#172326]"}`}>Packages</button>
          <button type="button" onClick={() => setMostBookedTab("tests")} aria-pressed={mostBookedTab === "tests"} className={`rounded-full px-6 py-3 text-sm font-semibold transition ${mostBookedTab === "tests" ? "bg-[#172326] text-white shadow-sm" : "border border-slate-200 bg-white text-[#172326]"}`}>Tests</button>
        </div>
        <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-5 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0">
          {(mostBookedTab === "packages" ? mostBookedPackages : mostBookedTests).map((item) => (
            <article key={item.title} className="w-[78%] shrink-0 snap-start overflow-hidden rounded-[22px] bg-white shadow-[0_5px_20px_rgba(15,40,55,0.07)] ring-1 ring-slate-100 sm:w-auto">
              <div className="relative h-[205px] overflow-hidden bg-[#eaf7f8]">
                <img src={item.image} alt={item.title} loading="lazy" className="h-full w-full object-cover" />
                <span className="absolute left-3 top-3 rounded-br-xl rounded-tl-xl bg-white/95 px-3 py-2 text-xs font-extrabold text-[#087f82]">{item.tag}</span>
              </div>
              <div className="p-4">
                <h3 className="min-h-[52px] text-[17px] font-extrabold leading-snug text-[#202629]">{item.title}</h3>
                <p className="mt-2 min-h-10 text-sm leading-5 text-slate-500">{item.detail}</p>
                <p className="mt-3 text-sm font-semibold text-slate-700">Price on enquiry</p>
                <a href="#contact" className="mt-4 flex min-h-[54px] items-center justify-center rounded-xl border-2 border-slate-200 bg-white text-base font-extrabold text-[#e76558] shadow-[0_5px_12px_rgba(15,40,55,0.08)] transition hover:border-[#08b8bb] hover:text-[#087f82]">BOOK</a>
              </div>
            </article>
          ))}
        </div>
        <div className="mx-auto h-1 w-2/3 rounded-full bg-slate-200 sm:hidden"><div className="h-1 w-1/4 rounded-full bg-[#172326]" /></div>
      </section>

      <section id="prescription" className="mx-auto mt-8 max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-[#80c9c8] bg-[#effaf9] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div><h2 className="font-extrabold">Have a prescription?</h2><p className="mt-1 text-xs leading-5 text-slate-600">Choose a file to keep it ready for your enquiry. Online submission will be enabled with the booking workflow.</p></div>
          <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-[#087f82] px-5 text-sm font-bold text-white transition hover:bg-[#066c70]">Select prescription<input type="file" accept="image/*,.pdf" className="sr-only" onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")} /></label>
          {fileName && <p className="text-xs font-semibold text-[#087f82]" role="status">Selected: {fileName}</p>}
        </div>
      </section>

      <section id="contact" className="mx-auto mt-8 max-w-6xl px-4 pb-8 sm:px-6"><div className="rounded-2xl bg-[#122c31] p-5 text-white sm:p-7"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#7fe1dc]">MFIT Healthcare</p><h2 className="mt-2 text-xl font-extrabold sm:text-2xl">Need help choosing a health checkup?</h2><p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">Our health services team can guide you through available packages and booking options.</p><p className="mt-4 text-xs text-slate-400">Operated by MFIT HEALTHCARE PRIVATE LIMITED</p></div></section>

      <nav aria-label="Health navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-5px_22px_rgba(15,40,55,0.08)] backdrop-blur">
        <div className="mx-auto grid h-[66px] max-w-xl grid-cols-4">
          <a href="#top" className="flex flex-col items-center justify-center gap-1 text-[#078b8d]"><span className="text-xl">⌂</span><span className="text-[10px] font-bold">Home</span></a>
          <a href="#packages" className="flex flex-col items-center justify-center gap-1 text-slate-600"><span className="text-xl">⚕</span><span className="text-[10px] font-semibold">Packages</span></a>
          <a href="#prescription" className="flex flex-col items-center justify-center gap-1 text-slate-600"><span className="text-xl">▤</span><span className="text-[10px] font-semibold">Prescription</span></a>
          <a href="#contact" className="flex flex-col items-center justify-center gap-1 text-slate-600"><span className="text-xl">♡</span><span className="text-[10px] font-semibold">Contact</span></a>
        </div>
      </nav>
    </main>
  );
}
