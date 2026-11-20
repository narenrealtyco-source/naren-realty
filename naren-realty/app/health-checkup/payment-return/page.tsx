"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function PaymentReturnPage(){
  const params=useSearchParams();
  const orderId=params.get("order_id")||"";
  const [state,setState]=useState<"loading"|"paid"|"pending"|"error">("loading");
  const [reference,setReference]=useState("");
  useEffect(()=>{
    if(!orderId){setState("error");return;}
    fetch("/api/health-checkout/status?order_id="+encodeURIComponent(orderId),{cache:"no-store"})
      .then(async r=>{const data=await r.json();if(!r.ok)throw new Error(data.error||"Could not verify payment.");setReference(data.orderId||orderId);setState(data.status==="paid"?"paid":"pending");})
      .catch(()=>setState("error"));
  },[orderId]);
  return <main className="grid min-h-screen place-items-center bg-[#f7fafb] px-4 text-[#172326]"><section className="w-full max-w-md rounded-3xl bg-white p-7 text-center shadow-sm">
    <span className="mx-auto grid size-16 place-items-center rounded-full bg-[#e9f8f6] text-3xl text-[#078b8d]">{state==="paid"?"✓":state==="loading"?"…":"!"}</span>
    <h1 className="mt-4 text-2xl font-extrabold">{state==="paid"?"Payment successful":state==="pending"?"Payment processing":state==="loading"?"Verifying your payment":"We could not verify the payment"}</h1>
    <p className="mt-2 text-sm leading-6 text-slate-500">{state==="paid"?"Your MFIT Healthcare booking has been confirmed.":state==="pending"?"Your payment status is not final yet. Please check again shortly or contact MFIT Healthcare.":state==="loading"?"Please wait while we verify the transaction directly with Cashfree.":"Please contact MFIT Healthcare with your payment reference if money was deducted."}</p>
    {reference&&<p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs font-semibold">Reference: {reference}</p>}
    <Link href="/health-checkup" className="mt-6 inline-flex rounded-xl bg-[#078b8d] px-6 py-3 text-sm font-bold text-white">Back to MFIT Healthcare</Link>
  </section></main>;
}
