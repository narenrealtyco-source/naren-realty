"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminLogoutButton from "../../../../components/AdminLogoutButton";
import { createSupabaseBrowserClient } from "../../../../lib/supabase-browser";

type Booking = {
  id: string; event_id: string; booking_code: string; customer_name: string; customer_phone: string;
  customer_email: string; quantity: number; unit_price: number; total_amount: number;
  payment_reference: string | null; status: string; created_at: string; admin_note: string | null;
  event_submissions: { title: string; organizer_name: string } | null;
};

export default function DirectEventPaymentsPage() {
  const supabase = createSupabaseBrowserClient();
  const [rows, setRows] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("event_direct_payment_bookings")
      .select("*,event_submissions(title,organizer_name)")
      .order("created_at", { ascending: false }).limit(500);
    if (error) setMessage("Direct payment booking records could not be loaded. Check admin access.");
    else { setRows((data ?? []) as Booking[]); setMessage(""); }
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  async function review(row: Booking, decision: "confirmed" | "rejected") {
    setBusy(row.id); setMessage("");
    const { error } = await supabase.rpc("review_direct_event_payment_booking", {
      p_booking_id: row.id, p_decision: decision, p_admin_note: notes[row.id] || null
    });
    if (error) setMessage(error.message);
    else { setMessage(`Booking ${row.booking_code} marked ${decision}.`); await load(); }
    setBusy(null);
  }

  return <main className="min-h-screen bg-slate-50 text-slate-900">
    <header className="bg-[#10243A] px-4 py-5 text-white"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold tracking-widest text-amber-400">NAREN REALTY · ADMIN</p><h1 className="mt-1 text-2xl font-extrabold">Event UPI Payment Verification</h1></div><nav className="flex flex-wrap gap-2"><Link href="/admin/events" className="rounded-lg border border-white/30 px-3 py-2 text-sm">Event Management</Link><AdminLogoutButton /></nav></div></header>
    <section className="mx-auto max-w-6xl space-y-4 px-4 py-7">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold text-[#10243A]">Direct organiser payments</h2><p className="mt-1 text-sm text-slate-600">Verify UTR with organiser / payment proof before confirming a ticket booking.</p></div><button onClick={() => void load()} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">Refresh</button></div>
      {message && <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{message}</p>}
      {loading ? <p className="text-sm text-slate-600">Loading payment requests…</p> : rows.length === 0 ? <p className="rounded-xl border bg-white p-5 text-sm text-slate-600">No direct payment bookings yet.</p> : <div className="space-y-3">{rows.map(row => <article key={row.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-extrabold text-[#10243A]">{row.event_submissions?.title || "Event"}</h3><p className="mt-1 text-xs text-slate-500">Booking: {row.booking_code} · Organiser: {row.event_submissions?.organizer_name || "—"}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${row.status === "confirmed" ? "bg-emerald-100 text-emerald-800" : row.status === "pending_verification" ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-700"}`}>{row.status.replaceAll("_", " ")}</span></div>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4"><p>Customer: <strong>{row.customer_name}</strong></p><p>Mobile: <strong>{row.customer_phone}</strong></p><p>Email: <strong className="break-all">{row.customer_email}</strong></p><p>Tickets: <strong>{row.quantity}</strong></p><p>Total paid: <strong>₹{Number(row.total_amount).toFixed(2)}</strong></p><p>UPI reference: <strong>{row.payment_reference || "—"}</strong></p><p>Submitted: <strong>{new Date(row.created_at).toLocaleString("en-IN")}</strong></p></div>
        {row.status === "pending_verification" && <div className="mt-4 border-t pt-4"><label className="block text-sm font-semibold">Admin note (optional)<input value={notes[row.id] || ""} onChange={e => setNotes(v => ({ ...v, [row.id]: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal" placeholder="Verification note" /></label><div className="mt-3 flex flex-wrap gap-2"><button disabled={busy === row.id} onClick={() => void review(row, "confirmed")} className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Verify & Confirm Booking</button><button disabled={busy === row.id} onClick={() => void review(row, "rejected")} className="rounded-lg border border-rose-300 px-4 py-2.5 text-sm font-bold text-rose-700 disabled:opacity-50">Reject & Release Seats</button></div></div>}
        {row.admin_note && <p className="mt-3 text-xs text-slate-500">Admin note: {row.admin_note}</p>}
      </article>)}</div>}
    </section>
  </main>;
}
