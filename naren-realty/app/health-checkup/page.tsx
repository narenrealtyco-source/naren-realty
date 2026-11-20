"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

const quickActions = [
  { title: "Full Body", subtitle: "Packages", symbol: "✚", href: "/health-checkup/packages?category=Full%20Body", tone: "bg-[#eaf8f7] text-[#078b8d]" },
  { title: "Book via", subtitle: "Call", symbol: "☎", href: "#contact", tone: "bg-[#edf5ff] text-[#2476bd]" },
  { title: "Book via", subtitle: "WhatsApp", symbol: "◉", href: "#contact", tone: "bg-[#eaf8ef] text-[#23965a]" },
];

const categories = [
  { title: "Full Body Checkup", subtitle: "Explore preventive health packages", category: "Full Body", image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1000&q=85", tag: "Popular" },
  { title: "Lifestyle Checkup", subtitle: "Health screening for everyday wellbeing", category: "Lifestyle", image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1000&q=85", tag: "Explore" },
  { title: "Women's Health", subtitle: "Screening and wellness options", category: "Women", image: "https://images.unsplash.com/photo-1559757175-0eb30cd8c063?auto=format&fit=crop&w=1000&q=85", tag: "Explore" },
  { title: "Senior Citizen Care", subtitle: "Health checkup options for seniors", category: "Senior Citizens", image: "https://images.unsplash.com/photo-1576765608866-5b510464521b?auto=format&fit=crop&w=1000&q=85", tag: "Explore" },
];

const audienceCategories = [
  { title: "Adult Women", category: "Women", image: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=700&q=85" },
  { title: "Senior Women", category: "Senior Citizens", image: "https://images.unsplash.com/photo-1576765608866-5b510464521b?auto=format&fit=crop&w=700&q=85" },
  { title: "Fitness", category: "Fitness", image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=700&q=85" },
];

const recommendedPackages = [
  { title: "Comprehensive Full Body Checkup", detail: "Explore a broad preventive screening option", image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=85", label: "Full body" },
  { title: "Complete Blood Count (CBC)", detail: "Ask about this individual blood test", image: "https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=800&q=85", label: "Lab test" },
  { title: "Women's Health Checkup", detail: "Explore available women's health options", image: "https://images.unsplash.com/photo-1559757175-0eb30cd8c063?auto=format&fit=crop&w=800&q=85", label: "Women's health" },
];

const mostBookedPackages = [
  { title: "Comprehensive Gold Full Body Checkup", detail: "Full body preventive health screening", category: "Full Body", image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=900&q=85", tag: "Popular" },
  { title: "Comprehensive Silver Full Body Checkup", detail: "Essential health screening package", category: "Full Body", image: "https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=900&q=85", tag: "Popular" },
  { title: "Comprehensive Full Body Checkup", detail: "Explore a complete health screening option", category: "Full Body", image: "https://images.unsplash.com/photo-1559757175-0eb30cd8c063?auto=format&fit=crop&w=900&q=85", tag: "Recommended" },
];

const childrenCategories = [
  { title: "Full Body Checkup", category: "Children", image: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=800&q=85" },
  { title: "Growth & Nutrition", category: "Children", image: "https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=800&q=85" },
  { title: "Allergy & Infection", category: "Children", image: "https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=800&q=85" },
];
const lifestylePackages = [
  { title: "Fatigue Monitoring Checkup", category: "Lifestyle", detail: "Explore screening options for common causes of fatigue", image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=900&q=85" },
  { title: "Nutrition Checkup", category: "Lifestyle", detail: "Nutrition-focused health screening options", image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=900&q=85" },
  { title: "Weight Management Checkup", category: "Lifestyle", detail: "Explore health assessments related to weight management", image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=85" },
];

const mostBookedTests = [
  { title: "Complete Blood Count (CBC)", detail: "Common blood screening test", category: "Blood", image: "https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=900&q=85", tag: "Popular" },
  { title: "Thyroid Profile", detail: "Thyroid function blood test", category: "Thyroid", image: "https://images.unsplash.com/photo-1582719471384-894fbb16e074?auto=format&fit=crop&w=900&q=85", tag: "Popular" },
  { title: "Vitamin D Test", detail: "Vitamin D level assessment", category: "Vitamins", image: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=900&q=85", tag: "Popular" },
];

const services = [
  { title: "Blood Tests", description: "Browse individual lab tests", image: "https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=900&q=85" },
  { title: "Home Sample Collection", description: "Ask about sample collection at home", image: "https://images.unsplash.com/photo-1584982751601-97dcc096659c?auto=format&fit=crop&w=900&q=85" },
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
            <a key={item.title} href={`/health-checkup/packages?category=${encodeURIComponent(item.category)}`} className="group overflow-hidden rounded-2xl bg-white shadow-[0_4px_18px_rgba(15,40,55,0.06)] ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-lg">
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
          {services.map((item) => <Link key={item.title} href={item.title === "Blood Tests" ? "/health-checkup/tests" : "/health-checkup/packages"} className="group flex overflow-hidden rounded-2xl bg-white shadow-[0_4px_18px_rgba(15,40,55,0.05)] ring-1 ring-slate-100"><img src={item.image} alt="" loading="lazy" className="h-28 w-28 shrink-0 object-cover sm:h-32 sm:w-32" /><span className="flex min-w-0 flex-col justify-center p-3"><strong className="text-sm font-extrabold">{item.title}</strong><span className="mt-1 text-xs leading-4 text-slate-500">{item.description}</span><span className="mt-2 text-xs font-bold text-[#078b8d]">Know more →</span></span></Link>)}
        </div>
      </section>

      <section className="mx-auto mt-10 max-w-6xl px-4 sm:px-6">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">Explore health categories</h2><span className="text-xs font-semibold text-slate-400">Swipe to explore</span></div>
        <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0">
          {audienceCategories.map((item) => <a key={item.title} href={`/health-checkup/packages?category=${encodeURIComponent(item.category)}`} className="w-[72%] shrink-0 snap-start sm:w-auto">
            <div className="overflow-hidden rounded-2xl bg-[#fbeef0]"><img src={item.image} alt={item.title} loading="lazy" className="h-[145px] w-full object-cover sm:h-[175px]" /></div>
            <h3 className="mt-2 text-center text-base font-semibold text-[#252b2e]">{item.title}</h3>
          </a>)}
        </div>
      </section>

      <section className="mx-auto mt-7 max-w-6xl px-4 sm:px-6">
        <Link href="/health-checkup/packages?category=Women" className="flex min-h-[76px] items-center justify-center rounded-2xl bg-[#08b8bb] px-4 py-5 text-center text-base font-extrabold text-white shadow-[0_8px_18px_rgba(8,184,187,0.2)] transition hover:bg-[#079da0] sm:text-lg">Explore Packages for Women <span className="ml-2">→</span></Link>
      </section>

      <section id="recommended" className="mx-auto mt-9 max-w-6xl px-4 sm:px-6">
        <div className="mb-4"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#078b8d]">Picked for your wellbeing</p><h2 className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl">Recommended for you</h2></div>
        <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0">
          {recommendedPackages.map((item) => <article key={item.title} className="w-[78%] shrink-0 snap-start overflow-hidden rounded-2xl bg-white shadow-[0_4px_18px_rgba(15,40,55,0.07)] ring-1 ring-slate-100 sm:w-auto">
            <div className="relative"><img src={item.image} alt="" loading="lazy" className="h-[190px] w-full object-cover" /><span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-bold text-[#087f82]">{item.label}</span></div>
            <div className="p-4"><h3 className="min-h-10 text-base font-extrabold leading-snug">{item.title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{item.detail}</p><p className="mt-3 text-sm font-bold text-[#172326]">Price on enquiry</p><Link href={item.label === "Lab test" ? `/health-checkup/tests?category=Blood` : `/health-checkup/packages?category=${encodeURIComponent(item.label === "Women's health" ? "Women" : "Full Body")}`} className="mt-3 flex min-h-11 items-center justify-center rounded-xl border border-[#08b8bb] text-sm font-extrabold text-[#078b8d] transition hover:bg-[#eaf8f7]">VIEW & BOOK</Link></div>
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
                <Link href={mostBookedTab === "packages" ? `/health-checkup/packages?category=${encodeURIComponent(item.category || "Full Body")}` : `/health-checkup/tests?category=${encodeURIComponent(item.category || "Blood")}`} className="mt-4 flex min-h-[54px] items-center justify-center rounded-xl border-2 border-slate-200 bg-white text-base font-extrabold text-[#e76558] shadow-[0_5px_12px_rgba(15,40,55,0.08)] transition hover:border-[#08b8bb] hover:text-[#087f82]">VIEW & BOOK</Link>
              </div>
            </article>
          ))}
        </div>
        <div className="mx-auto h-1 w-2/3 rounded-full bg-slate-200 sm:hidden"><div className="h-1 w-1/4 rounded-full bg-[#172326]" /></div>
      </section>


      <section className="mx-auto mt-10 max-w-6xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-2xl bg-[#fde4e1]">
          <img src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=85" alt="Doctor with parent and child" loading="lazy" className="absolute inset-y-0 right-0 h-full w-[48%] object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#fde4e1] via-[#fde4e1]/95 to-transparent" />
          <div className="relative max-w-[68%] px-5 py-7 sm:px-8 sm:py-10">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#a53e4c] sm:text-xs">MFIT Healthcare</p>
            <h2 className="mt-2 text-xl font-extrabold leading-tight text-[#7d2335] sm:text-3xl">Introducing Children's Health Checkup Range</h2>
            <p className="mt-2 text-xs leading-5 text-[#392c30] sm:text-base">Packages for growth, nutrition, allergies and more</p>
          </div>
        </div>
        <div className="-mx-4 mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0">
          {childrenCategories.map((item) => <a key={item.title} href={`/health-checkup/packages?category=${encodeURIComponent(item.category)}`} className="w-[72%] shrink-0 snap-start sm:w-auto">
            <div className="overflow-hidden rounded-xl bg-[#fde4e1]"><img src={item.image} alt={item.title} loading="lazy" className="h-[175px] w-full object-cover sm:h-[210px]" /></div>
            <h3 className="mt-2 text-center text-sm font-semibold text-[#252b2e] sm:text-base">{item.title}</h3>
          </a>)}
        </div>
      </section>

      <section className="mx-auto mt-10 max-w-6xl px-4 sm:px-6">
        <div className="mb-4"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#078b8d]">Personalised wellness</p><h2 className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl">Packages for lifestyle concerns</h2></div>
        <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0">
          {lifestylePackages.map((item) => <article key={item.title} className="w-[78%] shrink-0 snap-start overflow-hidden rounded-2xl bg-white shadow-[0_4px_18px_rgba(15,40,55,0.07)] ring-1 ring-slate-100 sm:w-auto">
            <img src={item.image} alt={item.title} loading="lazy" className="h-[190px] w-full object-cover" />
            <div className="p-4"><h3 className="text-base font-extrabold leading-snug">{item.title}</h3><p className="mt-2 min-h-10 text-xs leading-5 text-slate-500">{item.detail}</p><p className="mt-3 text-sm font-semibold text-slate-700">Price on enquiry</p><Link href="/health-checkup/packages?category=Lifestyle" className="mt-3 flex min-h-11 items-center justify-center rounded-xl border border-[#08b8bb] text-sm font-extrabold text-[#078b8d]">VIEW PACKAGES</Link></div>
          </article>)}
        </div>
      </section>


      <section className="mx-auto mt-10 max-w-6xl px-4 sm:px-6">
        <div className="rounded-2xl bg-white p-5 shadow-[0_4px_18px_rgba(15,40,55,0.05)] ring-1 ring-slate-100 sm:p-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#078b8d]">Simple steps, from home</p>
          <h2 className="mt-2 max-w-3xl text-xl font-extrabold leading-tight tracking-tight sm:text-2xl">How does home sample collection for lab tests work?</h2>
          <div className="mt-6 space-y-6 sm:mt-8">
            <div className="flex gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#e8f8f6] text-2xl text-[#078b8d]">▣</span>
              <div><h3 className="text-base font-extrabold">Booking completion</h3><p className="mt-1 text-sm leading-6 text-slate-600">Select the required tests or package and share your preferred home collection date and time.</p></div>
            </div>
            <div className="flex gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#fff0ee] text-2xl text-[#c76c69]">⌂</span>
              <div><h3 className="text-base font-extrabold">Home sample collection</h3><p className="mt-1 text-sm leading-6 text-slate-600">A collection professional visits your address at the confirmed time, subject to service availability in your area.</p></div>
            </div>
            <div className="flex gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#f4f6df] text-2xl text-[#7c8a35]">➜</span>
              <div><h3 className="text-base font-extrabold">Sample transfer to the lab</h3><p className="mt-1 text-sm leading-6 text-slate-600">Your sample is transported to the assigned laboratory following the applicable handling process.</p></div>
            </div>
            <div className="flex gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#fff1e8] text-2xl text-[#d97842]">▤</span>
              <div><h3 className="text-base font-extrabold">Online report delivery</h3><p className="mt-1 text-sm leading-6 text-slate-600">Reports are shared digitally through the contact details provided at booking. Report timelines and consultation options depend on the selected test or package.</p></div>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-[#f0faf9] p-4 sm:grid-cols-4 sm:gap-4 sm:p-6">
          <div className="flex flex-col items-center gap-2 px-1 py-2 text-center"><span className="text-3xl">⚗️</span><span className="text-xs font-semibold leading-5 text-[#27383a] sm:text-sm">Laboratory partner network</span></div>
          <div className="flex flex-col items-center gap-2 px-1 py-2 text-center"><span className="text-3xl">🧪</span><span className="text-xs font-semibold leading-5 text-[#27383a] sm:text-sm">Test and package options</span></div>
          <div className="flex flex-col items-center gap-2 px-1 py-2 text-center"><span className="text-3xl">🏠</span><span className="text-xs font-semibold leading-5 text-[#27383a] sm:text-sm">Home collection where available</span></div>
          <div className="flex flex-col items-center gap-2 px-1 py-2 text-center"><span className="text-3xl">📋</span><span className="text-xs font-semibold leading-5 text-[#27383a] sm:text-sm">Digital report access</span></div>
        </div>

        <div className="mx-auto mt-8 max-w-2xl py-5 text-center">
          <div className="mx-auto mb-5 h-px w-3/4 bg-gradient-to-r from-transparent via-[#b9d9d7] to-transparent" />
          <p className="text-xl font-extrabold leading-relaxed tracking-tight text-[#aab8c0] sm:text-2xl">Making healthcare more understandable, accessible and convenient.</p>
          <p className="mt-3 text-xs leading-5 text-slate-500">Service availability, collection slots and report timelines are confirmed during booking.</p>
        </div>
      </section>

      <section id="prescription" className="mx-auto mt-8 max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-[#80c9c8] bg-[#effaf9] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div><h2 className="font-extrabold">Have a prescription?</h2><p className="mt-1 text-xs leading-5 text-slate-600">Choose a file to keep it ready for your enquiry. Online submission will be enabled with the booking workflow.</p></div>
          <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-[#087f82] px-5 text-sm font-bold text-white transition hover:bg-[#066c70]">Select prescription<input type="file" accept="image/*,.pdf" className="sr-only" onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")} /></label>
          {fileName && <p className="text-xs font-semibold text-[#087f82]" role="status">Selected: {fileName}</p>}
        </div>
      </section>

      <section id="contact" className="mx-auto mt-8 max-w-6xl px-4 pb-8 sm:px-6"><div className="rounded-2xl bg-[#122c31] p-5 text-white sm:p-7"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#7fe1dc]">MFIT Healthcare</p><h2 className="mt-2 text-xl font-extrabold sm:text-2xl">Need help choosing a health checkup?</h2><p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">Our health services team can guide you through available packages and booking options.</p><p className="mt-4 text-xs text-slate-400">Operated by MFIT HEALTHCARE PRIVATE LIMITED</p></div></section>

      <footer className="mt-10">
        <section className="bg-[#17191d] px-5 py-9 text-white sm:px-8 sm:py-12">
          <div className="mx-auto max-w-6xl">
            <p className="text-lg font-medium text-white/90 sm:text-xl">Healthcare made easier with MFIT</p>
            <div className="mt-7 grid grid-cols-2 gap-x-5 gap-y-7 sm:grid-cols-3">
              <div><p className="text-2xl font-extrabold text-[#65d2cf] sm:text-3xl">Care</p><p className="mt-1 text-sm text-white/75">Health checkup options</p></div>
              <div><p className="text-2xl font-extrabold text-[#65d2cf] sm:text-3xl">Convenience</p><p className="mt-1 text-sm text-white/75">Booking support</p></div>
              <div className="col-span-2 sm:col-span-1"><p className="text-2xl font-extrabold text-[#65d2cf] sm:text-3xl">Access</p><p className="mt-1 text-sm text-white/75">Home collection where available</p></div>
            </div>
            <div className="my-8 h-px bg-white/25" />
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-extrabold sm:text-lg">
                Know more about MFIT Healthcare
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-slate-200 text-xl text-[#17191d] transition group-open:rotate-180">⌄</span>
              </summary>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-white/70">MFIT Healthcare provides a digital place to explore health checkup packages, lab test options and related healthcare services. Availability, collection locations, report timelines and service terms are confirmed during the booking process.</p>
            </details>
          </div>
        </section>
        <section className="bg-[#f0f2f5] px-5 py-7 pb-28 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="flex items-center gap-2" aria-label="MFIT Healthcare">
              <span className="grid size-12 place-items-center rounded-sm bg-[#08b8bb] text-3xl font-black leading-none text-white">M</span>
              <span className="leading-none"><span className="block text-2xl font-black tracking-[-0.07em] text-[#17191d]">FIT</span><span className="mt-1 block text-xs font-semibold text-[#343a40]">Healthcare</span></span>
            </div>
            <p className="mt-6 text-xs leading-5 text-slate-500">© 2026 MFIT Healthcare. All rights reserved.</p>
            <p className="mt-2 max-w-4xl text-[11px] leading-5 text-slate-500">Healthcare services and diagnostic tests are subject to availability and the terms of the respective service providers. Test information is not a substitute for medical advice, diagnosis or treatment.</p>
            <p className="mt-3 text-[11px] font-semibold text-slate-500">Operated by MFIT HEALTHCARE PRIVATE LIMITED</p>
          </div>
        </section>
      </footer>

      <nav aria-label="Health navigation" className="fixed inset-x-0 bottom-0 z-40 rounded-b-[28px] border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-5px_22px_rgba(15,40,55,0.08)]">
        <div className="mx-auto grid h-[76px] max-w-3xl grid-cols-4">
          <a href="#top" className="flex flex-col items-center justify-center gap-1.5 text-slate-600" aria-label="Home">
            <svg viewBox="0 0 48 48" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="24" cy="24" r="20"/><path d="M27 15 18 24l9 9M18 24h17"/></svg><span className="text-[13px] leading-none">Home</span>
          </a>
          <a href="/health-checkup/tests" className="flex flex-col items-center justify-center gap-1.5 text-slate-900" aria-label="Lab Tests">
            <svg viewBox="0 0 48 48" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 5h12M20 5v15L9 39a3 3 0 0 0 3 4h24a3 3 0 0 0 3-4L28 20V5"/><path d="M14 33h20M18 27h12"/></svg><span className="text-[13px] font-bold leading-none">Lab Tests</span>
          </a>
          <a href="/health-checkup/scans" className="flex flex-col items-center justify-center gap-1.5 text-slate-600" aria-label="Scans">
            <svg viewBox="0 0 48 48" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="5" width="38" height="38" rx="5"/><path d="M13 14h8M13 21h8M13 28h8M29 12l3 4-3 4M32 16h5M29 24l3 4-3 4M32 28h5"/></svg><span className="text-[13px] leading-none">Scans</span>
          </a>
          <a href="/health-checkup/my-orders" className="flex flex-col items-center justify-center gap-1.5 text-slate-600" aria-label="My Orders">
            <svg viewBox="0 0 48 48" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 5h17l8 8v25a4 4 0 0 1-4 4H13a4 4 0 0 1-4-4V9a4 4 0 0 1 4-4Z"/><path d="M29 5v9h9M16 20h13M16 26h8"/><circle cx="31" cy="32" r="7"/><path d="M31 28v4l3 2"/></svg><span className="text-[13px] leading-none">My Orders</span>
          </a>
        </div>
      </nav>
    </main>
  );
}
