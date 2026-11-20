"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

export default function HealthStoreHeader({ title, backHref = "/health-checkup" }: { title?: string; backHref?: string }) {
  const [query,setQuery] = useState("");
  const [cartCount,setCartCount] = useState(0);

  useEffect(() => {
    const sync = () => {
      try {
        const value = JSON.parse(window.localStorage.getItem("mfit-health-cart") || "[]");
        setCartCount(Array.isArray(value) ? value.length : 0);
      } catch { setCartCount(0); }
    };
    sync();
    window.addEventListener("mfit-cart-updated",sync);
    return () => window.removeEventListener("mfit-cart-updated",sync);
  },[]);

  const search = (event: FormEvent) => {
    event.preventDefault();
    if(query.trim()) window.location.href = "/health-checkup/search?q=" + encodeURIComponent(query.trim());
  };

  return <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/95 shadow-[0_2px_12px_rgba(15,40,55,.035)] backdrop-blur">
    <div className="hidden bg-[#123a40] px-4 py-2 text-center text-[10px] font-semibold tracking-wide text-white sm:block">MFIT Healthcare · Diagnostic tests and home sample collection where available</div>
    <div className="mx-auto flex min-h-[72px] max-w-7xl items-center gap-4 px-4 sm:px-6 lg:gap-8">
      <Link href="/health-checkup" aria-label="MFIT Healthcare home" className="flex shrink-0 items-center gap-2.5">
        <span className="grid size-10 place-items-center rounded-md bg-[#08b8bb] text-3xl font-black leading-none text-white">M</span>
        <span className="leading-none"><span className="block text-[24px] font-extrabold tracking-[-0.07em] text-[#15191b]">FIT</span><span className="mt-1 block text-[11px] font-semibold text-[#222729]">Healthcare</span></span>
      </Link>
      <form onSubmit={search} className="hidden min-w-0 flex-1 items-center gap-3 rounded-lg border border-slate-200 bg-[#f8fafb] px-3 py-2.5 focus-within:border-[#08aeb1] md:flex">
        <span className="text-xl text-slate-400">⌕</span><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search for tests, packages and health concerns" className="w-full bg-transparent text-xs outline-none placeholder:text-slate-400"/><button className="rounded-md bg-[#08aeb1] px-4 py-2 text-[10px] font-extrabold text-white">SEARCH</button>
      </form>
      <div className="ml-auto flex shrink-0 items-center gap-3">
        <Link href="/health-checkup/my-orders" className="hidden text-xs font-bold text-slate-600 hover:text-[#078b8d] sm:block">My Orders</Link>
        <Link href="/account" className="hidden text-xs font-bold text-slate-600 hover:text-[#078b8d] sm:block">Login / Sign up</Link>
        <Link href="/health-checkup/cart" className="flex items-center gap-2 rounded-lg border border-[#b9dedd] px-3 py-2.5 text-xs font-extrabold text-[#087f82]"><span className="text-base">▣</span><span className="hidden sm:inline">Cart</span><span className="grid min-w-5 place-items-center rounded-full bg-[#078b8d] px-1.5 py-0.5 text-[10px] text-white">{cartCount}</span></Link>
      </div>
    </div>
    <div className="border-t border-slate-100 px-4 py-2 md:hidden">
      <form onSubmit={search} className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-[#f8fafb] px-3"><span className="text-lg text-slate-400">⌕</span><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search tests and packages" className="w-full bg-transparent text-xs outline-none"/><button className="text-[10px] font-extrabold text-[#078b8d]">GO</button></form>
    </div>
    <nav aria-label="MFIT health categories" className="hidden border-t border-slate-100 md:block">
      <div className="mx-auto flex max-w-7xl items-center gap-7 overflow-x-auto px-6 py-3 text-xs font-bold text-slate-600">
        <Link href="/health-checkup/packages">Health Packages</Link><Link href="/health-checkup/tests">Lab Tests</Link><Link href="/health-checkup/collections/full-body">Full Body</Link><Link href="/health-checkup/collections/womens-health">Women's Health</Link><Link href="/health-checkup/collections/mens-health">Men's Health</Link><Link href="/health-checkup/scans">Scans & Imaging</Link><Link href="/health-checkup/my-orders">Track Order</Link>
      </div>
    </nav>
    {title&&<div className="border-t border-slate-100 bg-[#fbfdfd]"><div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6"><Link href={backHref} aria-label="Go back" className="grid size-8 place-items-center rounded-full border border-slate-200 bg-white text-xl text-slate-600">‹</Link><h1 className="text-sm font-extrabold text-[#172326] sm:text-base">{title}</h1></div></div>}
  </header>;
}
