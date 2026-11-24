"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type CatalogItem = { slug: string; title: string; item_type: string; category: string | null; description: string | null; price: number | null; is_active: boolean; provider_verified: boolean };

export default function HealthCartPage() {
  const [slugs, setSlugs] = useState<string[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("mfit_cart_items") || "[]");
      if (Array.isArray(saved)) setSlugs(saved.filter((value): value is string => typeof value === "string").slice(0, 10));
    } catch {
      localStorage.removeItem("mfit_cart_items");
    }
    fetch("/api/health-catalog", { cache: "no-store" })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "Catalogue unavailable"); setCatalog(data.items || []); })
      .catch((reason) => setError(reason.message || "Unable to load cart items."))
      .finally(() => setLoading(false));
  }, []);

  const selected = useMemo(() => slugs.map((slug) => catalog.find((item) => item.slug === slug)).filter((item): item is CatalogItem => !!item), [slugs, catalog]);
  const unavailable = selected.filter((item) => !item.is_active || item.price === null || !item.provider_verified);
  const total = selected.reduce((sum, item) => sum + (item.price === null ? 0 : Number(item.price)), 0);

  function remove(slug: string) {
    const next = slugs.filter((value) => value !== slug);
    setSlugs(next);
    localStorage.setItem("mfit_cart_items", JSON.stringify(next));
  }

  function clearCart() {
    setSlugs([]);
    localStorage.removeItem("mfit_cart_items");
  }

  const checkoutUrl = "/health-checkup/checkout?items=" + encodeURIComponent(slugs.join(","));

  return <main className="min-h-screen bg-[#f7fafb] pb-24 text-[#172326]">
    <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/95 px-4 py-4 backdrop-blur"><div className="mx-auto flex max-w-3xl items-center gap-3"><Link href="/health-checkup" className="grid size-10 place-items-center rounded-full border text-2xl">‹</Link><div><p className="text-xs font-bold uppercase tracking-widest text-[#078b8d]">MFIT Healthcare</p><h1 className="text-lg font-extrabold">Your cart</h1></div><span className="ml-auto rounded-full bg-[#e9f8f7] px-3 py-2 text-xs font-bold text-[#087f82]">{slugs.length} / 10 items</span></div></header>
    <section className="mx-auto max-w-3xl px-4 py-6">
      <div className="rounded-3xl bg-gradient-to-br from-[#dff7f4] to-[#edf5ff] p-6"><p className="text-xs font-bold uppercase tracking-widest text-[#078b8d]">Review selection</p><h2 className="mt-2 text-2xl font-extrabold">Tests & packages in your cart</h2><p className="mt-2 text-sm leading-6 text-slate-600">Review your selections before continuing to patient and collection details.</p></div>
      {loading ? <p className="mt-5 rounded-2xl bg-white p-6 text-sm text-slate-500">Loading your cart…</p> : error ? <p role="alert" className="mt-5 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p> : selected.length === 0 ? <div className="mt-5 rounded-2xl bg-white p-7 text-center shadow-sm"><p className="text-base font-extrabold">Your cart is empty</p><p className="mt-2 text-sm text-slate-500">Browse approved health packages and individual lab tests.</p><div className="mt-5 flex justify-center gap-3"><Link href="/health-checkup/packages" className="rounded-xl bg-[#078b8d] px-4 py-3 text-xs font-bold text-white">Browse packages</Link><Link href="/health-checkup/tests" className="rounded-xl border border-[#078b8d] px-4 py-3 text-xs font-bold text-[#078b8d]">Browse tests</Link></div></div> : <div className="mt-5 space-y-3">{selected.map((item) => {
        const bookable = item.is_active && item.price !== null && item.provider_verified;
        return <article key={item.slug} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><span className="rounded-full bg-[#eff8f7] px-2.5 py-1 text-[10px] font-bold text-[#078b8d]">{item.item_type === "package" ? "Health package" : "Individual test"}</span><h3 className="mt-2 font-extrabold">{item.title}</h3><p className="mt-1 text-xs text-slate-500">{item.category || "Diagnostics"}</p></div><button type="button" onClick={() => remove(item.slug)} className="shrink-0 text-xs font-bold text-rose-600">Remove</button></div><div className="mt-3 flex items-center justify-between border-t pt-3"><span className="text-xs text-slate-500">{bookable ? "MFIT approved · Booking available" : "Awaiting MFIT approval / price"}</span><b className="text-sm">{item.price === null ? "Price pending" : "₹" + Number(item.price).toLocaleString("en-IN")}</b></div></article>;
      })}
      <div className="rounded-2xl bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm font-semibold text-slate-600">Estimated total</span><b className="text-xl">₹{total.toLocaleString("en-IN")}</b></div>{unavailable.length > 0 && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">{unavailable.length} selected item(s) cannot be booked yet because MFIT approval or final pricing is pending. Remove them or continue only with approved items.</p>}<Link href={checkoutUrl} aria-disabled={selected.length === 0 || unavailable.length > 0} className={"mt-4 flex min-h-12 items-center justify-center rounded-xl bg-[#08aeb1] px-4 text-sm font-extrabold text-white " + (selected.length === 0 || unavailable.length > 0 ? "pointer-events-none opacity-40" : "")}>Continue to booking →</Link><button type="button" onClick={clearCart} className="mt-3 w-full text-xs font-bold text-slate-500">Clear cart</button></div></div>}
      <p className="mt-5 text-[11px] leading-5 text-slate-400">Prices and booking availability are revalidated when you submit the booking request. Preferred collection slots are not confirmed until MFIT / the assigned partner confirms them.</p>
    </section>
    <nav className="fixed inset-x-0 bottom-0 z-30 grid h-[68px] grid-cols-4 border-t bg-white pb-[env(safe-area-inset-bottom)] text-[11px]"><Link href="/health-checkup" className="flex flex-col items-center justify-center gap-1">⌂<span>Home</span></Link><Link href="/health-checkup/tests" className="flex flex-col items-center justify-center gap-1">⚗<span>Lab Tests</span></Link><Link href="/health-checkup/cart" className="flex flex-col items-center justify-center gap-1 font-extrabold text-[#078b8d]">▣<span>Cart</span></Link><Link href="/health-checkup/my-orders" className="flex flex-col items-center justify-center gap-1">▤<span>My Orders</span></Link></nav>
  </main>;
}
