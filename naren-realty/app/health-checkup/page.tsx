"use client";

import Link from "next/link";
import { useMemo, useState, type ChangeEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

type HealthCategory = {
  key: string;
  title: string;
  subtitle: string;
  image: string;
  tag?: string;
};

const categories: HealthCategory[] = [
  {
    key: "full-body-checkup",
    title: "Full Body Checkup",
    subtitle: "Preventive health packages",
    image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1000&q=88",
    tag: "Popular",
  },
  {
    key: "lifestyle-checkup",
    title: "Lifestyle Checkup",
    subtitle: "Health screening for everyday wellness",
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1000&q=88",
  },
];

const services: HealthCategory[] = [
  {
    key: "blood-tests",
    title: "Blood Tests",
    subtitle: "Explore individual lab tests",
    image: "https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=900&q=85",
  },
  {
    key: "health-packages",
    title: "Health Packages",
    subtitle: "Curated health screening options",
    image: "https://images.unsplash.com/photo-1584982751601-97dcc096659c?auto=format&fit=crop&w=900&q=85",
  },
  {
    key: "home-sample-collection",
    title: "Home Sample Collection",
    subtitle: "Sample collection at your convenience",
    image: "https://images.unsplash.com/photo-1583912267550-d6c2f4b5a3b4?auto=format&fit=crop&w=900&q=85",
  },
  {
    key: "doctor-consultation",
    title: "Doctor Consultation",
    subtitle: "Connect with healthcare professionals",
    image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=900&q=85",
  },
  {
    key: "scans",
    title: "Scans",
    subtitle: "Explore diagnostic imaging services",
    image: "https://images.unsplash.com/photo-1511174511562-5f7f18b874f8?auto=format&fit=crop&w=900&q=85",
  },
  {
    key: "physiotherapy",
    title: "Physiotherapy",
    subtitle: "Movement, recovery and mobility support",
    image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=85",
  },
];

function BrandLogo() {
  return (
    <Link href="/health-checkup" aria-label="MFIT Healthcare home" className="flex shrink-0 items-center gap-2.5">
      <span className="grid size-11 place-items-center rounded-md bg-[#08B8BB] text-[2rem] font-black leading-none text-white shadow-sm">M</span>
      <span className="flex flex-col leading-none">
        <span className="text-[1.8rem] font-black tracking-[-0.07em] text-[#111C20]">FIT</span>
        <span className="-mt-0.5 text-[0.73rem] font-semibold tracking-[0.01em] text-[#111C20]">Healthcare</span>
      </span>
    </Link>
  );
}

function Icon({ name }: { name: "body" | "phone" | "whatsapp" | "upload" | "search" | "home" | "flask" | "scan" | "orders" }) {
  const common = "h-7 w-7";
  if (name === "body") return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="5" r="2.3"/><path d="M8 21v-5l-1.5-3.5L8 9h8l1.5 3.5L16 16v5M8 12h8M12 8v13"/></svg>;
  if (name === "phone") return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6.5 3.5 9 3l2 4-2 1.5a15 15 0 0 0 6.5 6.5L17 13l4 2-.5 2.5a3 3 0 0 1-3.2 2.4A17 17 0 0 1 4.1 6.7 3 3 0 0 1 6.5 3.5Z"/></svg>;
  if (name === "whatsapp") return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 11.7a8 8 0 0 1-11.8 7L4 20l1.3-4A8 8 0 1 1 20 11.7Z"/><path d="M9 8.5c.5 2 2.5 4 4.5 4.5l1.2-1.1 2 1c-.2 1.4-1.2 2.2-2.6 2.1-3.5-.3-6.3-3.1-6.6-6.6-.1-1.4.7-2.4 2.1-2.6l1 2L9 8.5Z"/></svg>;
  if (name === "upload") return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 16V4m-4 4 4-4 4 4M5 14v5h14v-5"/><path d="M8 12h8"/></svg>;
  if (name === "search") return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg>;
  if (name === "home") return <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m3 10 9-7 9 7v10H3zM9 20v-6h6v6"/></svg>;
  if (name === "flask") return <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3M8 15h8"/></svg>;
  if (name === "scan") return <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h2m6 0h2M7 12h10M7 16h2m6 0h2"/></svg>;
  return <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 4h14v17H5zM8 4V2h8v2M8 9h8M8 13h5"/></svg>;
}

function HealthContent() {
  const params = useSearchParams();
  const selected = params.get("category") ?? "";
  const [search, setSearch] = useState("");
  const [prescriptionName, setPrescriptionName] = useState("");

  const visibleServices = useMemo(() => {
    const term = search.trim().toLowerCase();
    return services.filter((item) => {
      const matchesSearch = !term || `${item.title} ${item.subtitle}`.toLowerCase().includes(term);
      let matchesCategory = true;
      if (selected === "lab-tests") {
        matchesCategory = item.key === "blood-tests" || item.key === "health-packages";
      } else if (selected && !["full-body-checkup", "lifestyle-checkup", "health-packages"].includes(selected)) {
        matchesCategory = item.key === selected;
      }
      return matchesSearch && matchesCategory;
    });
  }, [search, selected]);

  function handlePrescription(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setPrescriptionName(file ? file.name : "");
  }

  return (
    <main className="min-h-screen bg-[#F7FBFB] pb-24 text-[#111C20] sm:pb-10">
      <header className="sticky top-0 z-40 border-b border-[#E5EEEE] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <BrandLogo />
          <div className="hidden items-center gap-7 text-sm font-semibold text-[#33464A] md:flex">
            <a href="#services" className="transition hover:text-[#08AEB2]">Our Services</a>
            <a href="#packages" className="transition hover:text-[#08AEB2]">Health Packages</a>
            <a href="#about" className="transition hover:text-[#08AEB2]">About MFIT</a>
          </div>
          <a href="#contact" className="rounded-full bg-[#08B8BB] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#079DA1]">Book Now</a>
        </div>
        <div className="border-t border-[#F0F4F4] bg-white px-4 py-2 text-[11px] font-semibold tracking-wide text-[#607477] sm:px-6">
          MFIT HEALTHCARE PRIVATE LIMITED
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <section className="pt-5 sm:pt-8">
          <div className="relative">
            <label htmlFor="health-search" className="sr-only">Search health tests and packages</label>
            <div className="flex items-center gap-3 rounded-full border border-[#D7E3E4] bg-white px-5 py-3.5 shadow-[0_5px_24px_rgba(15,65,68,0.06)] focus-within:border-[#08B8BB] focus-within:ring-4 focus-within:ring-[#08B8BB]/10">
              <span className="text-[#08AEB2]"><Icon name="search" /></span>
              <input id="health-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tests, packages or health services" className="w-full bg-transparent text-sm text-[#14272B] outline-none placeholder:text-[#87989A] sm:text-base" />
              {search && <button type="button" onClick={() => setSearch("")} className="text-xs font-bold text-[#08AEB2]">Clear</button>}
            </div>
          </div>
        </section>

        <section aria-label="Quick actions" className="mt-5 grid grid-cols-4 gap-2.5 sm:mt-7 sm:gap-4">
          <a href="#packages" className="group flex min-h-32 flex-col items-center justify-center rounded-2xl bg-[#F7EAFB] px-2 py-4 text-center text-[#A94BC0] transition hover:-translate-y-0.5 hover:shadow-md sm:min-h-36">
            <Icon name="body" />
            <span className="mt-2 text-xs font-medium text-[#526166] sm:text-sm">Full Body</span>
            <strong className="mt-0.5 text-xs font-extrabold text-[#17272B] sm:text-sm">Packages</strong>
          </a>
          <a href="#contact" className="group flex min-h-32 flex-col items-center justify-center rounded-2xl bg-[#EAF4FC] px-2 py-4 text-center text-[#2687C8] transition hover:-translate-y-0.5 hover:shadow-md sm:min-h-36">
            <Icon name="phone" />
            <span className="mt-2 text-xs font-medium text-[#526166] sm:text-sm">Book via</span>
            <strong className="mt-0.5 text-xs font-extrabold text-[#17272B] sm:text-sm">Call</strong>
          </a>
          <a href="#contact" className="group flex min-h-32 flex-col items-center justify-center rounded-2xl bg-[#E8F7EE] px-2 py-4 text-center text-[#20A568] transition hover:-translate-y-0.5 hover:shadow-md sm:min-h-36">
            <Icon name="whatsapp" />
            <span className="mt-2 text-xs font-medium text-[#526166] sm:text-sm">Book via</span>
            <strong className="mt-0.5 text-xs font-extrabold text-[#17272B] sm:text-sm">WhatsApp</strong>
          </a>
          <label className="group flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl bg-[#FCEEF4] px-2 py-4 text-center text-[#C34D83] transition hover:-translate-y-0.5 hover:shadow-md sm:min-h-36">
            <Icon name="upload" />
            <span className="mt-2 text-xs font-medium text-[#526166] sm:text-sm">Upload</span>
            <strong className="mt-0.5 text-xs font-extrabold text-[#17272B] sm:text-sm">Prescription</strong>
            <input type="file" accept="image/*,.pdf" onChange={handlePrescription} className="sr-only" />
          </label>
        </section>
        {prescriptionName && <p className="mt-2 truncate rounded-xl bg-white px-3 py-2 text-xs text-[#476064] ring-1 ring-[#DCE9E9]">Selected file: {prescriptionName} <button onClick={() => setPrescriptionName("")} className="ml-2 font-bold text-[#079DA1]">Remove</button></p>}

        <section className="relative mt-7 min-h-[220px] overflow-hidden rounded-[1.7rem] bg-gradient-to-r from-[#07558A] via-[#087EAA] to-[#4DB8D4] shadow-[0_16px_40px_rgba(4,87,126,0.18)] sm:mt-9 sm:min-h-[270px]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_30%,rgba(255,255,255,0.2),transparent_34%)]" />
          <div className="relative z-10 flex min-h-[220px] items-center px-5 py-6 sm:min-h-[270px] sm:px-10">
            <div className="max-w-[65%] text-white sm:max-w-[58%]">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#B9F4EF] sm:text-xs">MFIT Healthcare</p>
              <h1 className="mt-2 text-2xl font-black leading-tight tracking-tight sm:text-4xl">Your health, <span className="text-[#B9F4EF]">our priority.</span></h1>
              <p className="mt-2 max-w-md text-xs leading-relaxed text-white/90 sm:mt-3 sm:text-base">Explore preventive checkups and healthcare services for you and your family.</p>
              <a href="#packages" className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-xs font-extrabold text-[#075A7D] shadow-sm transition hover:bg-[#E9FFFC] sm:mt-6 sm:px-5 sm:py-3 sm:text-sm">Explore Health Packages <span aria-hidden="true">→</span></a>
            </div>
            <div className="absolute bottom-0 right-0 top-0 w-[43%] sm:w-[42%]">
              <img src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=900&q=90" alt="Healthcare professional" className="h-full w-full object-cover object-center opacity-95 [mask-image:linear-gradient(to_right,transparent,black_25%)]" />
            </div>
          </div>
          <div className="absolute -right-12 -top-16 size-52 rounded-full border-[22px] border-white/10 sm:size-72" />
        </section>

        <section id="packages" className="mt-8 scroll-mt-28 sm:mt-11">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#079DA1] sm:text-xs">Choose your checkup</p>
              <h2 className="mt-1 text-xl font-black tracking-tight text-[#13272B] sm:text-2xl">Health Packages</h2>
            </div>
            <a href="#services" className="text-xs font-bold text-[#079DA1] sm:text-sm">View all <span aria-hidden="true">→</span></a>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-5">
            {categories.map((item) => (
              <Link key={item.key} href={`/health-checkup?category=${item.key}`} className="group overflow-hidden rounded-2xl bg-white shadow-[0_5px_22px_rgba(15,65,68,0.07)] ring-1 ring-[#E6EEEE] transition hover:-translate-y-1 hover:shadow-lg">
                <div className="relative aspect-[1.42/1] overflow-hidden bg-[#DDEEEF]">
                  <img src={item.image} alt={item.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  {item.tag && <span className="absolute left-3 top-3 rounded-full bg-[#08B8BB] px-2.5 py-1 text-[10px] font-extrabold text-white">{item.tag}</span>}
                </div>
                <div className="p-3 sm:p-4">
                  <h3 className="text-sm font-extrabold text-[#17292D] sm:text-base">{item.title}</h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-[#718184] sm:text-sm">{item.subtitle}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section id="services" className="mt-9 scroll-mt-28 sm:mt-12">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#079DA1] sm:text-xs">Care that fits your needs</p>
              <h2 className="mt-1 text-xl font-black tracking-tight text-[#13272B] sm:text-2xl">Lab Tests & Services</h2>
            </div>
            <span className="text-xs font-semibold text-[#809194]">{visibleServices.length} options</span>
          </div>
          {visibleServices.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-6">
            {visibleServices.map((item) => (
              <Link key={item.key} href={`/health-checkup?category=${item.key}`} className="group overflow-hidden rounded-2xl bg-white shadow-[0_4px_18px_rgba(15,65,68,0.06)] ring-1 ring-[#E6EEEE] transition hover:-translate-y-1 hover:shadow-lg">
                <div className="aspect-[1.25/1] overflow-hidden bg-[#E7F2F2]">
                  <img src={item.image} alt={item.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                </div>
                <div className="p-3">
                  <h3 className="text-xs font-extrabold leading-snug text-[#17292D] sm:text-sm">{item.title}</h3>
                  <p className="mt-1 text-[10px] leading-relaxed text-[#718184] sm:text-xs">{item.subtitle}</p>
                </div>
              </Link>
            ))}
          </div> : <div className="rounded-2xl border border-dashed border-[#C9DADB] bg-white px-4 py-10 text-center text-sm text-[#718184]">No matching services found. Try another search.</div>}
        </section>

        <section id="about" className="mt-9 rounded-3xl bg-[#E9F8F7] p-5 sm:mt-12 sm:p-8">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#078F93]">About MFIT Healthcare</p>
          <h2 className="mt-2 text-xl font-black text-[#14282C] sm:text-2xl">A simpler way to take care of your health.</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#5B7073]">Explore health checkups, diagnostic services and care options in one place. Service availability, package details and booking confirmation will be shared before you proceed.</p>
        </section>

        <section id="contact" className="mt-7 rounded-3xl border border-[#DDEAEA] bg-white p-5 text-center shadow-sm sm:p-7">
          <h2 className="text-lg font-black text-[#14282C] sm:text-xl">Need help choosing a health package?</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-[#718184]">Contact and WhatsApp booking details will be added once MFIT Healthcare’s official number is confirmed.</p>
          <p className="mt-3 text-xs font-bold tracking-wide text-[#079DA1]">MFIT HEALTHCARE PRIVATE LIMITED</p>
        </section>

        <footer className="pb-5 pt-7 text-center text-[11px] text-[#879799]">
          © {new Date().getFullYear()} MFIT HEALTHCARE PRIVATE LIMITED. All rights reserved.
        </footer>
      </div>

      <nav aria-label="MFIT Health navigation" className="fixed inset-x-0 bottom-0 z-50 border-t border-[#E2EBEB] bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_22px_rgba(15,65,68,0.09)] backdrop-blur sm:hidden">
        <div className="mx-auto flex h-[4.25rem] max-w-lg items-stretch justify-around">
          <Link href="/health-checkup" className={`flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-semibold ${!selected ? "text-[#079DA1]" : "text-[#66777A]"}`}><Icon name="home" /><span>Home</span></Link>
          <Link href="/health-checkup?category=lab-tests" className={`flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-semibold ${selected === "lab-tests" ? "text-[#079DA1]" : "text-[#66777A]"}`}><Icon name="flask" /><span>Lab Tests</span></Link>
          <Link href="/health-checkup?category=scans" className={`flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-semibold ${selected === "scans" ? "text-[#079DA1]" : "text-[#66777A]"}`}><Icon name="scan" /><span>Scans</span></Link>
          <Link href="/account?tab=orders" className="flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-semibold text-[#66777A]"><Icon name="orders" /><span>My Orders</span></Link>
        </div>
      </nav>
    </main>
  );
}

export default function HealthPage() {
  return <Suspense fallback={<main className="min-h-screen bg-[#F7FBFB] p-6 text-[#14282C]">Loading MFIT Healthcare...</main>}><HealthContent /></Suspense>;
}
