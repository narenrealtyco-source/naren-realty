"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminLogoutButton from "../../components/AdminLogoutButton";
import { supabase } from "../../lib/supabase";

type EventRecord = { id: string; title: string; organiser_upi_id:string|null; organiser_payee_name:string|null; organiser_qr_image_url:string|null; category: string; subcategory: string | null; custom_event_type: string | null; total_capacity: number | null; available_seats: number | null; image_url: string | null; venue: string; locality: string|null; event_mode: string; location_status: string; venue_address: string|null; map_link: string|null; online_event_link: string|null; starts_at: string; ticket_price: number; description: string; event_policies: string | null; event_details: {highlights?:string;target_audience?:string;age_restriction?:string;language?:string;registration_deadline?:string|null;cancellation_refund_policy?:string}|null; organizer_name: string; contact_phone: string; contact_email: string | null; status: string; created_at: string };

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
    <header className="bg-[#10243A] text-white"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5"><div><p className="text-xs font-bold tracking-widest text-amber-400">NAREN REALTY</p><h1 className="mt-1 text-xl font-bold">Event Management</h1></div><nav className="flex flex-wrap items-center gap-2"><Link href="/admin" className="rounded-lg border border-white/30 px-3 py-2 text-sm">Dashboard</Link><Link href="/admin/properties" className="rounded-lg border border-white/30 px-3 py-2 text-sm">Properties</Link><Link href="/admin/events/commission" className="rounded-lg border border-amber-300 px-3 py-2 text-sm text-amber-200">Commission & Settlements</Link><AdminLogoutButton /></nav></div></header>
    <section className="mx-auto max-w-6xl px-4 py-8">
      <h2 className="text-2xl font-extrabold text-[#10243A]">Event submissions</h2>
      <p className="mt-1 text-sm text-slate-600">Approve events to publish them on the public Events page.</p>
      <div className="mt-5 flex flex-wrap gap-2">{["pending","approved","rejected"].map((value) => <button key={value} onClick={() => setStatus(value)} className={`min-h-10 rounded-lg px-4 text-sm font-bold capitalize ${status === value ? "bg-[#10243A] text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"}`}>{value} ({items.filter((item) => item.status === value).length})</button>)}</div>
      {message && <p role="status" className="mt-4 text-sm text-amber-800">{message}</p>}
      {loading ? <p className="mt-5 text-sm text-slate-600">Loading submissions...</p> : visible.length === 0 ? <p className="mt-5 rounded-xl bg-white p-5 text-sm text-slate-600 ring-1 ring-slate-200">No {status} events.</p> : <div className="mt-5 space-y-4">{visible.map((item) => <article key={item.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><span className="text-xs font-bold uppercase tracking-wide text-amber-700">{item.category.replaceAll("_", " ")}</span>{item.subcategory && <p className="mt-1 text-xs font-semibold text-slate-500">{item.subcategory.replaceAll("_", " ")}</p>}<h3 className="mt-1 text-lg font-bold text-[#10243A]">{item.title}</h3>{item.custom_event_type && <p className="mt-1 text-sm font-semibold text-blue-700">New type requested: {item.custom_event_type}</p>}{item.image_url && <img src={item.image_url} alt={item.title} className="mt-3 h-40 w-full max-w-sm rounded-xl object-cover" />}{item.total_capacity !== null && <p className="mt-2 text-sm text-slate-600">Capacity: {item.total_capacity} · Seats available: {item.available_seats ?? "—"}</p>}<p className="mt-1 text-sm font-semibold text-slate-700">Mode: {item.event_mode==="hybrid"?"Online + Offline":item.event_mode==="online"?"Online":"Offline"}</p>{item.event_mode==="online"?<p className="mt-1 text-sm text-slate-600">No physical venue required</p>:item.location_status==="tba"?<p className="mt-1 text-sm font-semibold text-amber-800">Venue To Be Announced · {item.locality}</p>:<><p className="mt-1 text-sm text-slate-600">{item.venue}, {item.locality}</p>{item.venue_address&&<p className="mt-1 text-sm text-slate-600">{item.venue_address}</p>}{item.map_link&&<a className="mt-1 inline-block text-sm font-bold text-blue-800 underline" href={item.map_link} target="_blank" rel="noreferrer">Google Maps link</a>}</>}{item.online_event_link&&<a className="mt-1 block text-sm font-bold text-blue-800 underline" href={item.online_event_link} target="_blank" rel="noreferrer">Online meeting link</a>}<p className="mt-1 text-sm text-slate-600">{new Date(item.starts_at).toLocaleString("en-IN")} · {item.ticket_price > 0 ? `₹${item.ticket_price}` : "Free"}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold capitalize">{item.status}</span></div><p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{item.description}</p>{item.event_details&&<div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 p-3"><p className="text-xs font-bold uppercase tracking-wide text-amber-900">Additional event details</p>{item.event_details.highlights&&<p className="mt-2 whitespace-pre-wrap text-sm text-slate-700"><strong>Highlights:</strong> {item.event_details.highlights}</p>}{item.event_details.target_audience&&<p className="mt-1 text-sm text-slate-700"><strong>Audience:</strong> {item.event_details.target_audience}</p>}{item.event_details.age_restriction&&<p className="mt-1 text-sm text-slate-700"><strong>Age:</strong> {item.event_details.age_restriction}</p>}{item.event_details.language&&<p className="mt-1 text-sm text-slate-700"><strong>Language:</strong> {item.event_details.language}</p>}{item.event_details.registration_deadline&&<p className="mt-1 text-sm text-slate-700"><strong>Registration deadline:</strong> {new Date(item.event_details.registration_deadline).toLocaleString("en-IN")}</p>}{item.event_details.cancellation_refund_policy&&<p className="mt-1 whitespace-pre-wrap text-sm text-slate-700"><strong>Cancellation & refund:</strong> {item.event_details.cancellation_refund_policy}</p>}</div>}{item.event_policies && <div className="mt-3 rounded-lg bg-amber-50 p-3"><p className="text-xs font-bold uppercase text-amber-800">Organiser rules & policies</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{item.event_policies}</p></div>}<p className="mt-3 text-sm text-slate-600">Organiser: <strong>{item.organizer_name}</strong> · {item.contact_phone}{item.contact_email ? ` · ${item.contact_email}` : ""}</p>{(item.organiser_upi_id||item.organiser_qr_image_url)&&<div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3"><p className="text-xs font-bold uppercase tracking-wide text-emerald-900">Organiser attendee payment details — review before approval</p>{item.organiser_upi_id&&<p className="mt-2 text-sm text-slate-800">UPI ID: <strong>{item.organiser_upi_id}</strong></p>}{item.organiser_payee_name&&<p className="mt-1 text-sm text-slate-800">Payee: {item.organiser_payee_name}</p>}{item.organiser_qr_image_url&&<img src={item.organiser_qr_image_url} alt="Organiser payment QR" className="mt-2 h-36 w-36 rounded-lg border bg-white object-contain p-2"/>}</div>}{status === "pending" && <div className="mt-4 flex flex-wrap gap-2"><button disabled={busy === item.id} onClick={() => review(item.id,"approved")} className="min-h-10 rounded-lg bg-emerald-700 px-4 text-sm font-bold text-white disabled:opacity-50">Approve & Publish</button><button disabled={busy === item.id} onClick={() => review(item.id,"rejected")} className="min-h-10 rounded-lg border border-rose-300 px-4 text-sm font-bold text-rose-700 disabled:opacity-50">Reject</button></div>}</article>)}</div>}
    </section>
  </main>;
}
