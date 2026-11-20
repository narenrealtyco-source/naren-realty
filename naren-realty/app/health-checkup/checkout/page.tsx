"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { useSearchParams } from "next/navigation";

declare global {
  interface Window {
    Cashfree?: (options: { mode: "sandbox" | "production" }) => {
      checkout: (options: { paymentSessionId: string; redirectTarget: "_self" }) => Promise<unknown>;
    };
  }
}

export default function HealthCheckoutPage() {
  const params = useSearchParams();
  const slug = params.get("item") || "";
  const [name,setName] = useState("");
  const [phone,setPhone] = useState("");
  const [email,setEmail] = useState("");
  const [address,setAddress] = useState("");
  const [pincode,setPincode] = useState("");
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");
  const [sdkReady,setSdkReady] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/health-checkout/create", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({customer:{name,phone,email,address,pincode},items:[{slug,quantity:1}]})
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Checkout could not start.");
      if (!window.Cashfree) throw new Error("Payment window is still loading. Please try again.");
      const cashfree = window.Cashfree({mode:result.environment === "production" ? "production" : "sandbox"});
      await cashfree.checkout({paymentSessionId:result.paymentSessionId,redirectTarget:"_self"});
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to continue.");
    } finally { setBusy(false); }
  }

  return <main className="min-h-screen bg-[#f7fafb] px-4 py-6 text-[#172326]">
    <Script src="https://sdk.cashfree.com/js/v3/cashfree.js" strategy="afterInteractive" onLoad={()=>setSdkReady(true)}/>
    <div className="mx-auto max-w-xl">
      <Link href="/health-checkup" className="text-sm font-bold text-[#078b8d]">‹ MFIT Healthcare</Link>
      <div className="mt-5 rounded-3xl bg-white p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-widest text-[#078b8d]">Secure booking</p>
        <h1 className="mt-2 text-2xl font-extrabold">Your health checkup details</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Enter your details to request a diagnostic booking. Final availability, package inclusions and price are confirmed by MFIT Healthcare before payment is enabled.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-sm font-semibold">Full name<input required minLength={2} value={name} onChange={e=>setName(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-[#08aeb1]"/></label>
          <label className="block text-sm font-semibold">Mobile number<input required inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength={10} value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,"").slice(0,10))} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-[#08aeb1]"/></label>
          <label className="block text-sm font-semibold">Email (optional)<input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-[#08aeb1]"/></label>
          <label className="block text-sm font-semibold">Address<input value={address} onChange={e=>setAddress(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-[#08aeb1]"/></label>
          <label className="block text-sm font-semibold">Pincode<input required inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} value={pincode} onChange={e=>setPincode(e.target.value.replace(/\D/g,"").slice(0,6))} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-[#08aeb1]"/></label>
          <label className="flex items-start gap-2 text-xs leading-5 text-slate-500"><input required type="checkbox" className="mt-1"/> I agree that MFIT Healthcare may contact me about this diagnostic booking and use my details to coordinate the requested service.</label>
          {message&&<p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{message}</p>}
          <button disabled={busy||!sdkReady||!slug} className="w-full rounded-xl bg-[#08aeb1] px-5 py-4 text-sm font-extrabold text-white disabled:opacity-50">{busy?"Please wait...":sdkReady?"Continue to secure checkout":"Loading secure checkout..."}</button>
          <p className="text-center text-[11px] leading-5 text-slate-400">Cashfree payment is activated only after MFIT merchant verification, API credentials and approved test pricing are configured.</p>
        </form>
      </div>
    </div>
  </main>;
}
