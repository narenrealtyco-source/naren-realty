"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminLogoutButton from "../../components/AdminLogoutButton";
import { supabase } from "../../lib/supabase";

type EventRecord = { id: string; title: string; category: string; subcategory: string | null; venue: string; locality: string; starts_at: string; ticket_price: number; description: string; organizer_name: string; contact_phone: string; contact_email: string | null; status: string; created_at: string };

export default function AdminEventsPage() {
  const [items, setItems] = useState<EventRecord[]>([]);
  const [status, setStatus] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("event_submissions").select("*").order("created_at", { ascending: false });
    if (error) setMessage("Event submissions could not be loaded. Please verify admin access.");
    else { setItems((data ?? []) as EventRecord[]); setMessage(""); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function review(id: string, nextStatus: "approved" | "rejected") {
    setBusy(id);
    setMessage("");
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("event_submissions").update({
      status: nextStatus, reviewed_by: user?.id ?? null, reviewed_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) setMessage("Status update failed. Check admin permissions and try again.");
    else { setMessage(`Event ${nextStatus}.`); await load(); }
    setBusy(null);
  }

  const visible = items.filter((item) => item.status === status);
  return <main className="min-h-screen bg-slate-50 text-slate-900">
    <header className="bg-[#10243A] text-white"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5"><div><p className="text-xs font-bold tracking-widest text-amber-400">NAREN REALTY</p><h1 className="mt-1 text-xl font-bold">Event Management</h1></div><nav className="flex flex-wrap items-center gap-2"><Link href="/admin" className="rounded-lg border border-white/30 px-3 py-2 text-sm">Dashboard</Link><Link href="/admin/properties" className="rounded-lg border border-white/30 px-3 py-2 text-sm">Properties</Link><AdminLogoutButton /></nav></div></header>
    <section className="mx-auto max-w-6xl px-4 py-8">
      <h2 className="text-2xl font-extrabold text-[#10243A]">Event submissions</h2>
      <p className="mt-1 text-sm text-slate-600">Approve events to publish them on the public Events page.</p>
      <div className="mt-5 flex flex-wrap gap-2">{["pending","approved","rejected"].map((value) => <button key={value} onClick={() => setStatus(value)} className={`min-h-10 rounded-lg px-4 text-sm font-bold capitalize ${status === value ? "bg-[#10243A] text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"}`}>{value} ({items.filter((item) => item.status === value).length})</button>)}</div>
      {message && <p role="status" className="mt-4 text-sm text-amber-800">{message}</p>}
      {loading ? <p className="mt-5 text-sm text-slate-600">Loading submissions...</p> : visible.length === 0 ? <p className="mt-5 rounded-xl bg-white p-5 text-sm text-slate-600 ring-1 ring-slate-200">No {status} events.</p> : <div className="mt-5 space-y-4">{visible.map((item) => <article key={item.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><span className="text-xs font-bold uppercase tracking-wide text-amber-700">{item.category.replaceAll("_", " ")}</span>{item.subcategory && <p className="mt-1 text-xs font-semibold text-slate-500">{item.subcategory.replaceAll("_", " ")}</p>}<h3 className="mt-1 text-lg font-bold text-[#10243A]">{item.title}</h3><p className="mt-1 text-sm text-slate-600">{item.venue}, {item.locality}</p><p className="mt-1 text-sm text-slate-600">{new Date(item.starts_at).toLocaleString("en-IN")} · {item.ticket_price > 0 ? `₹${item.ticket_price}` : "Free"}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold capitalize">{item.status}</span></div><p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{item.description}</p><p className="mt-3 text-sm text-slate-600">Organiser: <strong>{item.organizer_name}</strong> · {item.contact_phone}{item.contact_email ? ` · ${item.contact_email}` : ""}</p>{status === "pending" && <div className="mt-4 flex flex-wrap gap-2"><button disabled={busy === item.id} onClick={() => review(item.id,"approved")} className="min-h-10 rounded-lg bg-emerald-700 px-4 text-sm font-bold text-white disabled:opacity-50">Approve & Publish</button><button disabled={busy === item.id} onClick={() => review(item.id,"rejected")} className="min-h-10 rounded-lg border border-rose-300 px-4 text-sm font-bold text-rose-700 disabled:opacity-50">Reject</button></div>}</article>)}</div>}
    </section>
  </main>;
}
