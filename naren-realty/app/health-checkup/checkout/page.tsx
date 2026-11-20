import Link from "next/link";
import { Suspense } from "react";

function CheckoutContent() {
  return (
    <main className="min-h-screen bg-[#f7fafb] px-4 py-8 text-[#172326]">
      <div className="mx-auto max-w-xl">
        <Link href="/health-checkup" className="text-sm font-bold text-[#078b8d]">‹ MFIT Healthcare</Link>
        <section className="mt-5 rounded-3xl bg-white p-7 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-[#078b8d]">Booking enquiry</p>
          <h1 className="mt-2 text-2xl font-extrabold">Online checkout is not open yet</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">MFIT Healthcare is completing its diagnostic catalogue, laboratory verification and booking workflow. Our team will confirm the selected test or package, service availability and final price before accepting a booking.</p>
          <Link href="/health-checkup#contact" className="mt-6 flex min-h-12 items-center justify-center rounded-xl bg-[#08aeb1] px-5 text-sm font-extrabold text-white">Enquire with MFIT Healthcare</Link>
          <p className="mt-4 text-center text-[11px] leading-5 text-slate-400">Online payment will be introduced only after the booking and fulfilment workflow is verified.</p>
        </section>
      </div>
    </main>
  );
}

export default function HealthCheckoutPage() {
  return <Suspense fallback={<main className="min-h-screen bg-[#f7fafb] p-8 text-center">Loading MFIT Healthcare…</main>}><CheckoutContent /></Suspense>;
}
