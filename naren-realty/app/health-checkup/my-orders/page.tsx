"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/customers";

type Report = { title: string; uploadedAt: string; url: string };
type Booking = {
  id?: string;
  reference: string;
  selected_items: Array<{ title: string; type?: string }>;
  preferred_date: string;
  preferred_slot: string;
  status: string;
  sample_status?: string;
  coupon_code: string | null;
  created_at: string;
  customer_payable_amount?: number | null;
  customer_payment_status?: string;
  reports?: Report[];
};

function BookingCard({ booking }: { booking: Booking }) {
  return <article className="rounded-2xl border border-[#b9e6e1] bg-[#f2fbfa] p-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><b>{booking.reference}</b><span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#087f82]">{booking.status.replaceAll("_", " ")}</span></div>
    <p className="mt-3 text-xs font-bold text-slate-600">Selected items</p>
    <ul className="mt-1 space-y-1">{(booking.selected_items || []).map((item, index) => <li key={index} className="text-sm">{item.title}</li>)}</ul>
    <p className="mt-3 text-xs text-slate-600">Preferred collection: {booking.preferred_date} · {booking.preferred_slot}</p>
    <p className="mt-2 text-xs text-slate-600">Customer payment: {booking.customer_payment_status || "unpaid"} · ₹{Number(booking.customer_payable_amount || 0).toLocaleString("en-IN")}</p>
    {booking.coupon_code && <p className="mt-1 text-xs text-slate-600">Coupon submitted: {booking.coupon_code}</p>}
    <p className="mt-3 text-xs leading-5 text-slate-500">Collection / report status: {(booking.sample_status || booking.status).replaceAll("_", " ")}. MFIT confirms your collection details.</p>
    {booking.reports && booking.reports.length > 0 && <div className="mt-4 border-t pt-3"><p className="text-xs font-bold text-slate-700">Your diagnostic reports</p>{booking.reports.map((report, index) => <a key={index} href={report.url} target="_blank" rel="noreferrer" className="mt-2 block rounded-lg bg-white p-3 text-sm font-bold text-teal-700 underline">{report.title} · Download PDF</a>)}</div>}
  </article>;
}

export default function MyOrdersPage() {
  const [reference, setReference] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [booking, setBooking] = useState<Booking | null>(null);
  const [accountBookings, setAccountBookings] = useState<Booking[]>([]);
  const [accountLoading, setAccountLoading] = useState(true);
  const [accountSignedIn, setAccountSignedIn] = useState(false);
  const [accountError, setAccountError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadAccountBookings() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          if (active) setAccountSignedIn(false);
          return;
        }
        if (active) setAccountSignedIn(true);
        const response = await fetch("/api/health-checkout/my-orders", { headers: { Authorization: "Bearer " + session.access_token }, cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load account bookings.");
        if (active) setAccountBookings(data.requests || []);
      } catch (reason: any) {
        if (active) setAccountError(reason.message || "Unable to load account bookings.");
      } finally {
        if (active) setAccountLoading(false);
      }
    }
    loadAccountBookings();
    return () => { active = false; };
  }, []);

  const lookup = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setBooking(null);
    try {
      const response = await fetch("/api/health-checkout/lookup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reference, phone }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Lookup failed");
      setBooking(data.request);
    } catch (reason: any) {
      setError(reason.message || "Unable to find request.");
    } finally {
      setLoading(false);
    }
  };

  return <main className="min-h-screen bg-[#f7fafb] pb-24 text-slate-900">
    <header className="border-b bg-white px-4 py-4"><div className="mx-auto flex max-w-3xl items-center gap-3"><Link href="/health-checkup" className="text-2xl">‹</Link><div className="flex-1"><p className="text-xs font-bold uppercase tracking-widest text-[#078b8d]">MFIT Healthcare</p><h1 className="text-lg font-extrabold">My Orders & Requests</h1></div><Link href="/account" className="text-xs font-bold text-[#078b8d]">My Account</Link></div></header>
    <section className="mx-auto max-w-3xl space-y-5 px-4 py-8">
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-extrabold">My MFIT bookings</h2><p className="mt-2 text-sm leading-6 text-slate-500">Sign in to your customer account to see bookings linked to it.</p></div><span className="rounded-full bg-[#e9f8f7] px-3 py-2 text-xs font-bold text-[#087f82]">{accountBookings.length} orders</span></div>
        {accountLoading ? <p className="mt-4 text-sm text-slate-500">Checking your account…</p> : !accountSignedIn ? <div className="mt-4 rounded-xl bg-slate-50 p-4"><p className="text-sm text-slate-600">You are browsing as a guest. Sign in or create a customer account before booking to keep future orders together here.</p><div className="mt-3 flex gap-2"><Link href="/account#login" className="rounded-xl bg-[#078b8d] px-4 py-3 text-xs font-bold text-white">Sign in</Link><Link href="/account#signup" className="rounded-xl border border-[#078b8d] px-4 py-3 text-xs font-bold text-[#078b8d]">Create account</Link></div></div> : accountError ? <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{accountError}</p> : accountBookings.length === 0 ? <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No bookings are linked to this account yet. You can still track a guest booking below using its reference and mobile number.</p> : <div className="mt-5 space-y-3">{accountBookings.map((item) => <BookingCard key={item.reference} booking={item} />)}</div>}
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <h2 className="text-xl font-extrabold">Track a guest booking</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">Enter the reference shown after submission and the same mobile number used in the request.</p>
        <form onSubmit={lookup} className="mt-5 space-y-3">
          <label className="block text-xs font-semibold text-slate-600">Booking reference<input required value={reference} onChange={(event) => setReference(event.target.value.toUpperCase())} placeholder="MFIT-XXXXXXXXXX or CP-XXXXXXXXXX" className="mt-1 w-full rounded-xl border px-3 py-3 text-sm" /></label>
          <label className="block text-xs font-semibold text-slate-600">Registered mobile number<input required inputMode="numeric" maxLength={10} value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit mobile" className="mt-1 w-full rounded-xl border px-3 py-3 text-sm" /></label>
          <button disabled={loading} className="w-full rounded-xl bg-[#078b8d] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{loading ? "Checking…" : "Find my request"}</button>
        </form>
        {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        {booking && <div className="mt-5"><BookingCard booking={booking} /></div>}
      </div>
    </section>
    <nav className="fixed inset-x-0 bottom-0 z-30 grid h-[68px] grid-cols-4 border-t bg-white pb-[env(safe-area-inset-bottom)] text-[11px]"><Link href="/health-checkup" className="flex flex-col items-center justify-center gap-1">⌂<span>Home</span></Link><Link href="/health-checkup/tests" className="flex flex-col items-center justify-center gap-1">⚗<span>Lab Tests</span></Link><Link href="/health-checkup/cart" className="flex flex-col items-center justify-center gap-1">▣<span>Cart</span></Link><Link href="/health-checkup/my-orders" className="flex flex-col items-center justify-center gap-1 font-extrabold text-[#078b8d]">▤<span>My Orders</span></Link></nav>
  </main>;
}
