"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Scan = { slug: string; title: string; category: string | null; description: string | null; price: number | null; is_active: boolean; provider_verified: boolean };
const symbols: Record<string, string> = { "2d-echo": "♥", "ct-scan": "▤", "digital-xray": "▦", ecg: "♡", "mri-scan": "⌁", ultrasound: "◉" };

export default function ScansPage() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/health-catalog", { cache: "no-store" })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "Unable to load imaging catalogue."); setScans((data.items || []).filter((item: Scan & { item_type: string }) => item.item_type === "scan")); })
      .catch((reason) => setError(reason.message || "Unable to load imaging catalogue."))
      .finally(() => setLoading(false));
  }, []);

  return <main className="min-h-screen bg-[#f7fafb] pb-24 text-slate-900">
    <header className="border-b bg-white px-4 py-4"><div className="mx-auto flex max-w-3xl items-center gap-3"><Link href="/health-checkup" className="text-2xl">‹</Link><div className="flex-1"><p className="text-xs font-bold uppercase tracking-widest text-[#078b8d]">MFIT Healthcare</p><h1 className="text-lg font-extrabold">Scans & Imaging</h1></div><Link href="/health-checkup/cart" className="text-xs font-bold text-[#078b8d]">Cart</Link></div></header>
    <section className="mx-auto max-w-3xl px-4 py-6">
      <div className="rounded-3xl bg-gradient-to-br from-[#e0f7f5] to-[#edf4ff] p-6"><p className="text-xs font-bold uppercase tracking-widest text-[#078b8d]">Diagnostic imaging</p><h2 className="mt-2 text-2xl font-extrabold">Explore scans and imaging services</h2><p className="mt-2 text-sm leading-6 text-slate-600">Scan listings and booking status are loaded from the MFIT catalogue. Appointment availability, centre and final price are confirmed before a booking is accepted.</p></div>
      {loading && <p className="mt-5 rounded-xl bg-white p-5 text-sm text-slate-500">Loading imaging catalogue…</p>}
      {error && <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
      {!loading && !error && scans.length === 0 && <p className="mt-5 rounded-xl bg-white p-5 text-sm text-slate-500">No imaging services are listed yet.</p>}
      <div className="mt-5 grid grid-cols-2 gap-3">{scans.map((scan) => {
        const bookable = scan.is_active && scan.provider_verified && scan.price !== null;
        return <article key={scan.slug} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><span className="grid size-12 place-items-center rounded-2xl bg-[#e9f8f6] text-2xl text-[#078b8d]">{symbols[scan.slug] || "▣"}</span><h3 className="mt-3 font-extrabold">{scan.title}</h3><p className="mt-1 min-h-10 text-xs leading-5 text-slate-500">{scan.description || scan.category || "Diagnostic imaging service"}</p><p className="mt-3 text-xs font-semibold text-slate-600">{bookable ? "Booking available" : "Awaiting MFIT provider / price approval"}</p>{bookable ? <><p className="mt-1 text-sm font-extrabold">₹{Number(scan.price).toLocaleString("en-IN")}</p><Link href={"/health-checkup/checkout?item=" + encodeURIComponent(scan.slug)} className="mt-3 flex min-h-10 items-center justify-center rounded-xl bg-[#078b8d] text-xs font-extrabold text-white">BOOK</Link></> : <Link href="/health-checkup#contact" className="mt-3 flex min-h-10 items-center justify-center rounded-xl border border-[#08b8bb] text-xs font-extrabold text-[#078b8d]">ENQUIRE</Link>}</article>;
      })}</div>
      <p className="mt-5 text-[11px] leading-5 text-slate-400">Services cannot be booked until MFIT has verified the provider and price. Do not treat an enquiry as a confirmed appointment.</p>
    </section>
    <nav className="fixed inset-x-0 bottom-0 z-30 grid h-[68px] grid-cols-4 border-t bg-white pb-[env(safe-area-inset-bottom)] text-[11px]"><Link href="/health-checkup" className="flex flex-col items-center justify-center gap-1">⌂<span>Home</span></Link><Link href="/health-checkup/tests" className="flex flex-col items-center justify-center gap-1">⚗<span>Lab Tests</span></Link><Link href="/health-checkup/scans" className="flex flex-col items-center justify-center gap-1 font-extrabold text-[#078b8d]">▣<span>Scans</span></Link><Link href="/health-checkup/my-orders" className="flex flex-col items-center justify-center gap-1">▤<span>My Orders</span></Link></nav>
  </main>;
}
