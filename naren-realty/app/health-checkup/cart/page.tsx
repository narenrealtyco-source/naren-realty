"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Item = { slug:string; item_type:"test"|"package"; title:string; category:string; description:string|null; price:number|null; provider_verified:boolean; is_active:boolean };
const CART_KEY = "mfit-health-cart";

export default function HealthCartPage() {
  const [items,setItems] = useState<Item[]>([]);
  const [slugs,setSlugs] = useState<string[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(CART_KEY) || "[]");
      setSlugs(Array.isArray(stored) ? stored.filter((x):x is string => typeof x === "string") : []);
    } catch { setSlugs([]); }
    fetch("/api/health-catalog",{cache:"no-store"})
      .then(async response => { const data=await response.json(); if(!response.ok) throw new Error(data.error||"Unable to load cart items."); setItems((data.items||[]).filter((x:Item)=>x.is_active)); })
      .catch(reason=>setError(reason instanceof Error?reason.message:"Unable to load cart."))
      .finally(()=>setLoading(false));
  },[]);

  const chosen = useMemo(()=>slugs.map(slug=>items.find(item=>item.slug===slug)).filter((item):item is Item=>!!item),[slugs,items]);
  const verifiedTotal = chosen.length>0&&chosen.every(item=>item.provider_verified&&item.price!==null)
    ? chosen.reduce((sum,item)=>sum+Number(item.price),0) : null;

  const save = (next:string[]) => {
    setSlugs(next);
    window.localStorage.setItem(CART_KEY,JSON.stringify(next));
    window.dispatchEvent(new Event("mfit-cart-updated"));
  };

  return <main className="min-h-screen bg-[#f6f9fa] pb-12 text-[#172326]">
    <header className="border-b border-slate-100 bg-white px-4 py-4"><div className="mx-auto flex max-w-4xl items-center gap-3"><Link href="/health-checkup" className="grid size-10 place-items-center rounded-full border text-2xl">‹</Link><div><p className="text-[10px] font-extrabold uppercase tracking-widest text-[#078b8d]">MFIT Healthcare</p><h1 className="text-lg font-extrabold">Your cart</h1></div><span className="ml-auto text-xs font-bold text-slate-500">{chosen.length} items</span></div></header>
    <section className="mx-auto max-w-4xl px-4 py-6">
      {loading?<div className="rounded-2xl bg-white p-6 text-sm text-slate-500">Loading your cart…</div>:error?<p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>:chosen.length===0?<div className="rounded-3xl bg-white p-8 text-center shadow-sm"><span className="text-4xl">▣</span><h2 className="mt-3 text-xl font-extrabold">Your cart is empty</h2><p className="mt-2 text-sm text-slate-500">Explore MFIT tests and packages and add the items you need.</p><div className="mt-5 flex justify-center gap-3"><Link href="/health-checkup/packages" className="rounded-xl bg-[#08aeb1] px-5 py-3 text-xs font-extrabold text-white">Browse packages</Link><Link href="/health-checkup/tests" className="rounded-xl border border-[#08aeb1] px-5 py-3 text-xs font-extrabold text-[#078b8d]">Browse tests</Link></div></div>:<>
        <div className="space-y-3">{chosen.map(item=><article key={item.slug} className="flex gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><div className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#e9f8f6] text-xl text-[#078b8d]">{item.item_type==="package"?"✚":"⚗"}</div><div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-wide text-[#078b8d]">{item.category} · {item.item_type==="package"?"Package":"Lab test"}</p><h2 className="mt-1 text-sm font-extrabold">{item.title}</h2><p className="mt-1 text-xs text-slate-500">{item.provider_verified&&item.price!==null?"₹"+Number(item.price).toLocaleString("en-IN"):"Price on confirmation"}</p><div className="mt-3 flex gap-4 text-xs font-bold"><Link href={item.item_type==="test"?`/health-checkup/test/${encodeURIComponent(item.slug)}`:`/health-checkup/package/${encodeURIComponent(item.slug)}`} className="text-[#078b8d]">View details</Link><button type="button" onClick={()=>save(slugs.filter(slug=>slug!==item.slug))} className="text-rose-600">Remove</button></div></div></article>)}</div>
        <div className="mt-5 rounded-2xl bg-white p-5 shadow-sm"><div className="flex justify-between text-sm"><span className="text-slate-500">Items in cart</span><b>{chosen.length}</b></div><div className="mt-3 flex justify-between border-t pt-3 text-base"><b>Subtotal</b><b>{verifiedTotal===null?"Price on confirmation":"₹"+verifiedTotal.toLocaleString("en-IN")}</b></div><p className="mt-3 text-[11px] leading-5 text-slate-500">Prices are payable only after MFIT confirms the performing laboratory and verifies the final rate.</p><Link href={`/health-checkup/checkout?items=${encodeURIComponent(slugs.join(","))}`} className="mt-5 flex min-h-12 items-center justify-center rounded-xl bg-[#08aeb1] px-5 text-sm font-extrabold text-white">Continue to checkout</Link><button type="button" onClick={()=>save([])} className="mt-3 w-full py-2 text-xs font-bold text-rose-600">Clear cart</button></div>
      </>}
    </section>
  </main>;
}
