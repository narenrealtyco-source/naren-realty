"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import LocalityAutocomplete from "../components/LocalityAutocomplete";

type Category = { slug: string; name: string; image: string; description: string };

const categories: Category[] = [
  { slug: "plumbing", name: "Plumbing", image: "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=700&q=80", description: "Tap, pipe, leakage and bathroom repairs" },
  { slug: "electrical", name: "Electrical", image: "https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=700&q=80", description: "Wiring, switches, fans and fittings" },
  { slug: "painting", name: "Painting", image: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=700&q=80", description: "Interior and exterior painting" },
  { slug: "carpentry-furniture", name: "Carpentry & Furniture", image: "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=700&q=80", description: "Furniture repair and custom woodwork" },
  { slug: "home-cleaning", name: "Home Cleaning", image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=700&q=80", description: "Deep cleaning and regular home cleaning" },
  { slug: "housekeeping-maid", name: "Housekeeping / Maid", image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=700&q=80", description: "Maid, cook and housekeeping help" },
  { slug: "interior-design", name: "Interior Design", image: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=700&q=80", description: "Home interiors and space planning" },
  { slug: "pest-control", name: "Pest Control", image: "https://images.unsplash.com/photo-1632759145351-1d592919f522?auto=format&fit=crop&w=700&q=80", description: "Cockroach, termite and pest treatment" },
  { slug: "civil-renovation", name: "Civil Work & Renovation", image: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=700&q=80", description: "Repairs, renovation and civil work" },
  { slug: "ac-installation", name: "AC Installation", image: "https://images.unsplash.com/photo-1631545806609-1c75d8b8a4b8?auto=format&fit=crop&w=700&q=80", description: "New AC fitting and shifting" },
  { slug: "packers-movers", name: "Packers & Movers", image: "https://images.unsplash.com/photo-1600518464441-9154a4dea21b?auto=format&fit=crop&w=700&q=80", description: "House shifting and packing" },
  { slug: "appliance-repair", name: "Appliance Repair", image: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=700&q=80", description: "Washing machine and home appliances" },
  { slug: "waterproofing", name: "Waterproofing", image: "https://images.unsplash.com/photo-1517581177682-a085bb7ffb15?auto=format&fit=crop&w=700&q=80", description: "Terrace, bathroom and wall leakage" },
  { slug: "pet-services", name: "Pet Services", image: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=700&q=80", description: "Pet grooming, walking and pet care" },
  { slug: "ac-cleaning-repair", name: "AC Cleaning & Repair", image: "https://images.unsplash.com/photo-1631545806609-1c75d8b8a4b8?auto=format&fit=crop&w=700&q=80", description: "AC servicing, cleaning and repair" },
  { slug: "kitchen-services", name: "Kitchen Services", image: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=700&q=80", description: "Gas stove, hob, chimney and kitchen repair" },
];

type Vendor = { id: string; public_name: string; business_name: string; category: string; category_slug: string; city: string; locality: string };

export default function ServicesDirectory({ initialCategory, initialVendors = [] }: { initialCategory: string; initialVendors?: Vendor[] }) {
  const router = useRouter();
  const [vendorSearch, setVendorSearch] = useState("");
  const [locality, setLocality] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const selected = categories.find((item) => item.slug === selectedCategory);
  const vendors = initialVendors;
  const filteredVendors = useMemo(() => vendors.filter((vendor) => {
    const matchesName = `${vendor.public_name} ${vendor.business_name}`.toLowerCase().includes(vendorSearch.toLowerCase());
    const matchesArea = `${vendor.locality} ${vendor.city}`.toLowerCase().includes(locality.toLowerCase());
    const matchesCategory = !selected || vendor.category === selected.name;
    return matchesName && matchesArea && matchesCategory;
  }), [vendors, vendorSearch, locality, selected]);

  return (
    <div className="space-y-7">
      <header className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">NAREN REALTY</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#10243A] sm:text-3xl">Home Services</h1>
            <p className="mt-1 hidden text-sm text-slate-600 sm:block">Find trusted professionals for your home.</p>
          </div>
          <Link href="/home-services/register" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#176B45] px-3 py-2 text-center text-xs font-bold text-white shadow-sm transition hover:bg-[#125638] sm:px-5 sm:text-sm">
            <span aria-hidden="true">＋</span><span className="hidden sm:inline">Apply as Service Provider</span><span className="sm:hidden">Apply</span>
          </Link>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5 shrink-0 text-slate-500"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
            <input aria-label="Search vendor name" value={vendorSearch} onChange={(event) => setVendorSearch(event.target.value)} placeholder="Search vendor name..." className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-slate-400" />
          </label>
          <label className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5 shrink-0 text-slate-500"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>
            <LocalityAutocomplete aria-label="Search locality" value={locality} onChange={(event) => setLocality(event.target.value)} placeholder="Enter locality (e.g. Wakad)" className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-slate-400" />
          </label>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>Search by vendor name and locality</span>
          <button type="button" onClick={() => { setVendorSearch(""); setLocality(""); setSelectedCategory(""); }} className="font-semibold text-emerald-800 hover:underline">Clear search & filters</button>
        </div>
      </header>
      <section aria-labelledby="service-categories">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div><h2 id="service-categories" className="text-xl font-extrabold text-[#10243A] sm:text-2xl">Browse Services</h2><p className="mt-1 text-sm text-slate-600">Choose a category to find the right professional.</p></div>
          <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">16 Categories</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((category) => {
            const active = selectedCategory === category.slug;
            return (
              <button type="button" key={category.slug} onClick={() => router.push(`/home-services/vendors?category=${encodeURIComponent(category.slug)}`)} aria-label={`View ${category.name} service providers`} className={`group min-w-0 overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${active ? "border-emerald-600 ring-2 ring-emerald-100" : "border-slate-200"}`}>
                <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                  <img src={category.image} alt={category.name} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                  <span className="absolute right-2 top-2 rounded-full bg-white/95 px-2 py-1 text-[10px] font-bold text-[#10243A]">{active ? "Selected" : "Explore"}</span>
                </div>
                <div className="p-3"><h3 className="text-sm font-bold leading-snug text-[#10243A]">{category.name}</h3><p className="mt-1 hidden text-xs leading-relaxed text-slate-500 sm:block">{category.description}</p></div>
              </button>
            );
          })}
        </div>
      </section>
      <section aria-labelledby="providers-heading" className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><h2 id="providers-heading" className="text-xl font-extrabold text-[#10243A]">{selected ? selected.name : "Popular Service Providers"}</h2><p className="mt-1 text-sm text-slate-600">{locality ? `Showing providers for ${locality}` : "Approved professionals will appear here."}</p></div>
          {selected && <button type="button" onClick={() => setSelectedCategory("")} className="text-sm font-semibold text-emerald-800 hover:underline">View all categories</button>}
        </div>
        {filteredVendors.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-50 text-2xl" aria-hidden="true">⌂</div>
            <h3 className="mt-3 font-bold text-[#10243A]">Service providers are being onboarded</h3>
            <p className="mx-auto mt-1 max-w-lg text-sm leading-relaxed text-slate-600">Verified vendor profiles will appear here after NAREN REALTY admin approval. You can browse all service categories or apply to join as a provider.</p>
            <Link href="/home-services/register" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#176B45] px-5 text-sm font-bold text-white hover:bg-[#125638]">Apply as Service Provider</Link>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">{filteredVendors.map((vendor) => <article key={vendor.id} className="rounded-xl border border-slate-200 p-4"><h3 className="font-bold">{vendor.public_name}</h3><p className="text-sm text-slate-600">{vendor.business_name} · {vendor.locality}, {vendor.city}</p><p className="mt-1 text-xs text-emerald-800">{vendor.category}</p></article>)}</div>
        )}
      </section>
      <p className="pb-2 text-center text-xs text-slate-500">Only vendors approved by NAREN REALTY will be displayed.</p>
    </div>
  );
}
