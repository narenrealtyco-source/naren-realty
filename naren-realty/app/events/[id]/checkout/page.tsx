"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "../../../lib/supabase-browser";
import { getCustomerSession } from "../../../lib/customers";

type EventPayment = {
  id: string; title: string; starts_at: string; ends_at: string | null;
  venue: string; locality: string | null; ticket_price: number; available_seats: number | null;
  organiser_upi_id: string | null; organiser_payee_name: string | null;
};
type Customer = { id: string; fullName: string; mobileNumber: string; email: string };
const money = (n: number) => n === 0 ? "Free" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

function CheckoutContent() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const quantity = Math.max(1, Math.min(20, Number(params.get("quantity")) || 1));
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [event, setEvent] = useState<EventPayment | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [utr, setUtr] = useState("");
  const [booking, setBooking] = useState<{ booking_code: string; status: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [session, result] = await Promise.all([
          getCustomerSession(),
          supabase.from("event_submissions")
            .select("id,title,starts_at,ends_at,venue,locality,ticket_price,available_seats,organiser_upi_id,organiser_payee_name")
            .eq("id", id).eq("status", "approved").maybeSingle()
        ]);
        if (!active) return;
        if (result.error || !result.data) throw new Error("Event is unavailable. Please go back and try again.");
        setEvent(result.data as EventPayment);
        if (!session) {
          window.location.replace(`/account?next=${encodeURIComponent(`/events/${id}/checkout?quantity=${quantity}`)}#login`);
          return;
        }
        setCustomer(session);
        setName(session.fullName || "");
        setPhone(session.mobileNumber || "");
        setEmail(session.email || "");
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Unable to load checkout.");
      } finally {
        if (active) setLoading(false);
      }
    }
    if (id) void load();
    return () => { active = false; };
  }, [id, supabase]);

  const total = event ? Number(event.ticket_price) * quantity : 0;
  const upiLink = event?.organiser_upi_id
    ? `upi://pay?pa=${encodeURIComponent(event.organiser_upi_id)}&pn=${encodeURIComponent(event.organiser_payee_name || "Event Organiser")}&am=${total.toFixed(2)}&cu=INR&tn=${encodeURIComponent(event.title)}`
    : "";

  async function copyUpi() {
    if (!event?.organiser_upi_id) return;
    await navigator.clipboard.writeText(event.organiser_upi_id);
    setCopied(true);
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!customer || !event) return;
    setError("");
    if (total > 0 && utr.trim().length < 6) {
      setError("UPI payment karne ke baad UTR / transaction reference enter karein.");
      return;
    }
    setSubmitting(true);
    try {
      const requestKey = crypto.randomUUID();
      const { data, error: rpcError } = await supabase.rpc("create_direct_event_payment_booking", {
        p_event_id: event.id,
        p_quantity: quantity,
        p_customer_name: name.trim(),
        p_customer_phone: phone.trim(),
        p_customer_email: email.trim(),
        p_payment_reference: total > 0 ? utr.trim() : null,
        p_request_key: requestKey,
      });
      if (rpcError) throw new Error(rpcError.message);
      const result = data as { booking_code: string; status: string };
      setBooking(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Booking request could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <main className="min-h-screen bg-[#F7F7F5] p-6 text-[#10243A]">Loading secure checkout…</main>;
  if (!event) return <main className="min-h-screen bg-[#F7F7F5] p-6 text-[#10243A]">{error || "Event unavailable."} <Link href="/events">Browse events</Link></main>;

  const date = new Date(event.starts_at);
  return <main className="min-h-screen bg-[#F7F7F5] pb-12 text-[#10243A]">
    <header className="border-b border-[#E5DFD2] bg-white px-4 py-4"><div className="mx-auto flex max-w-3xl justify-between"><Link href={`/events/${id}/ticket`}>‹ Back to tickets</Link><b>NAREN <span className="text-[#B08D3E]">REALTY</span></b></div></header>
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-7 text-xs font-bold"><span className="rounded-full bg-[#E9E2D2] px-3 py-2 text-[#8F7130]">1 Date & Time ✓</span> <span className="ml-2 rounded-full bg-[#E9E2D2] px-3 py-2 text-[#8F7130]">2 Tickets ✓</span> <span className="ml-2 rounded-full bg-[#B08D3E] px-3 py-2 text-white">3 Details & Payment</span></div>
      <p className="text-xs font-bold uppercase tracking-widest text-[#B08D3E]">Complete your booking</p>
      <h1 className="mt-2 text-3xl font-black">Customer Details</h1>
      <section className="mt-5 rounded-2xl border border-[#D8C9A5] bg-white p-5">
        <h2 className="text-lg font-extrabold">{event.title}</h2>
        <p className="mt-1 text-sm text-slate-500">{date.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · {date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</p>
        <p className="mt-1 text-sm text-slate-500">{event.venue}{event.locality ? ", " + event.locality : ""}</p>
        <div className="mt-4 flex justify-between border-t pt-4 text-sm"><span>{quantity} × {money(Number(event.ticket_price))}</span><b className="text-xl">{money(total)}</b></div>
      </section>

      {booking ? <section className="mt-5 rounded-2xl border border-amber-300 bg-white p-5">
        <div className="text-xs font-bold uppercase tracking-widest text-amber-700">Booking request received</div>
        <h2 className="mt-2 text-2xl font-black">Reference: {booking.booking_code}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">{booking.status === "confirmed" ? "Your free ticket booking is confirmed." : "Payment reference submitted. Your booking will be confirmed after the organiser / NAREN REALTY admin verifies the payment."}</p>
        <p className="mt-2 text-sm font-semibold text-[#10243A]">Status: {booking.status === "confirmed" ? "Confirmed" : "Payment verification pending"}</p>
        <Link href="/events" className="mt-5 inline-flex rounded-xl bg-[#10243A] px-5 py-3 text-sm font-bold text-white">Browse more events</Link>
      </section> : <form onSubmit={submit} className="mt-5 space-y-5">
        <section className="rounded-2xl border border-[#E5DFD2] bg-white p-5">
          <h2 className="font-extrabold">Attendee information</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold">Full name<input required minLength={2} value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal" /></label>
            <label className="text-sm font-semibold">Mobile number<input required type="tel" minLength={10} value={phone} onChange={e => setPhone(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal" /></label>
            <label className="text-sm font-semibold sm:col-span-2">Email address<input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal" /></label>
          </div>
        </section>
        {total > 0 && <section className="rounded-2xl border border-[#D8C9A5] bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-[#B08D3E]">Pay organiser directly · Personal UPI</p>
          <h2 className="mt-1 text-xl font-extrabold">Pay {money(total)}</h2>
          {event.organiser_payee_name && <p className="mt-2 text-sm text-slate-600">Personal UPI account name: <strong className="text-[#10243A]">{event.organiser_payee_name}</strong></p>}
          {event.organiser_upi_id ? <><div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-[#F7F7F5] p-3"><span className="font-bold">{event.organiser_upi_id}</span><button type="button" onClick={() => void copyUpi()} className="rounded-lg border border-[#D8C9A5] px-3 py-2 text-xs font-bold text-[#8F7130]">{copied ? "Copied" : "Copy UPI ID"}</button></div><div className="mt-4"><p className="mb-3 text-sm font-semibold">Choose your UPI app</p><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[{name:"Google Pay",scheme:"gpay://upi/pay?",mark:"G",style:"bg-[#E8F0FE] text-[#1A73E8]"},{name:"PhonePe",scheme:"phonepe://upi/pay?",mark:"पे",style:"bg-[#F1E8FF] text-[#5F259F]"},{name:"Paytm",scheme:"paytm://upi/pay?",mark:"P",style:"bg-[#E5F4FF] text-[#00A5F0]"},{name:"BHIM",scheme:"bhim://upi/pay?",mark:"BH",style:"bg-[#FFF1E8] text-[#E56B2F]"}].map(app => <a key={app.name} href={app.scheme + upiLink.split("?")[1]} className="flex min-h-16 items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition hover:border-[#B08D3E] hover:shadow-sm"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-black ${app.style}`}>{app.mark}</span><span className="text-sm font-bold">{app.name}</span></a>)}</div><a href={upiLink} className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-[#D8C9A5] px-4 py-3 text-sm font-bold text-[#8F7130]">Other UPI Apps</a><p className="mt-2 text-xs leading-5 text-slate-500">App opens only if installed and supported by your device. If your preferred app is not listed, use Other UPI Apps.</p></div></> : <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">Organiser has not added a UPI ID. Please contact NAREN REALTY before paying.</p>}

          <label className="mt-5 block text-sm font-semibold">UPI transaction reference / UTR<input required minLength={6} value={utr} onChange={e => setUtr(e.target.value)} placeholder="Enter UTR after completing UPI payment" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal" /></label>
          <p className="mt-2 text-xs leading-5 text-slate-500">Pay the organiser’s personal UPI ID directly using your preferred UPI app. Payment goes to the organiser’s bank account. NAREN REALTY does not collect or hold ticket payments. Do not submit until you have completed the UPI payment.</p>
        </section>}
        {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <button disabled={submitting || (total > 0 && !event.organiser_upi_id)} className="min-h-14 w-full rounded-xl bg-[#B08D3E] px-6 font-extrabold text-white disabled:opacity-50">{submitting ? "Submitting…" : total > 0 ? "I have paid — Submit booking" : "Confirm free booking"}</button>
      </form>}
    </div>
  </main>;
}
export default function Page() {
  return <Suspense fallback={<main className="min-h-screen bg-[#F7F7F5] p-6">Loading secure checkout…</main>}><CheckoutContent /></Suspense>;
}
