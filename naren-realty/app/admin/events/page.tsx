"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminLogoutButton from "../../components/AdminLogoutButton";
import { createSupabaseBrowserClient } from "../../lib/supabase-browser";

type EventRecord = { id: string; title: string; organiser_upi_id:string|null; organiser_payee_name:string|null; organiser_qr_image_url:string|null; category: string; subcategory: string | null; custom_event_type: string | null; total_capacity: number | null; available_seats: number | null; image_url: string | null; venue: string; locality: string|null; event_mode: string; location_status: string; venue_address: string|null; map_link: string|null; online_event_link: string|null; starts_at: string; ticket_price: number; description: string; event_policies: string | null; event_details: {highlights?:string;target_audience?:string;age_restriction?:string;language?:string;registration_deadline?:string|null;cancellation_refund_policy?:string}|null; organizer_name: string; contact_phone: string; contact_email: string | null; status: string; created_at: string };

export default function AdminEventsPage() {
  const supabase = createSupabaseBrowserClient();
  const [items, setItems] = useState<EventRecord[]>([]);
  const [status, setStatus] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  function toggleDetails(id: string) { setExpandedItems((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]); }

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
  return <main className="min-h-screen bg-[#f4f6f9] text-slate-900">
    <header className="bg-[#10243A] text-white"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5"><div><p className="text-xs font-bold tracking-[0.22em] text-amber-400">NAREN REALTY</p><h1 className="mt-1 text-xl font-bold">Event Management</h1></div><nav className="flex flex-wrap items-center gap-2"><Link href="/admin" className="rounded-lg border border-white/30 px-3 py-2 text-sm">Dashboard</Link><Link href="/admin/properties" className="rounded-lg border border-white/30 px-3 py-2 text-sm">Properties</Link><Link href="/admin/events/commission" className="rounded-lg border border-amber-300 px-3 py-2 text-sm text-amber-200">Commission & Settlements</Link><Link href="/admin/events/direct-payments" className="rounded-lg border border-amber-300 px-3 py-2 text-sm text-amber-200">UPI Ticket Payments</Link><AdminLogoutButton /></nav></div></header>
    <section className="mx-auto max-w-5xl px-4 py-7">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Review workspace</p><h2 className="mt-1 text-2xl font-extrabold tracking-tight text-[#10243A]">Event submissions</h2><p className="mt-1 text-sm text-slate-600">Review details and approve events for publishing.</p></div><div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 shadow-sm">Total submissions <strong className="ml-1 text-sm text-[#10243A]">{items.length}</strong></div></div>
      <div className="mt-5 flex flex-wrap gap-2">{["pending","approved","rejected"].map((value) => <button key={value} onClick={() => setStatus(value)} className={`rounded-xl px-4 py-2.5 text-sm font-bold capitalize transition ${status === value ? "bg-[#10243A] text-white shadow-md shadow-slate-900/10" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"}`}>{value} <span className={`ml-1 rounded-full px-2 py-0.5 text-xs ${status === value ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600"}`}>{items.filter((item) => item.status === value).length}</span></button>)}</div>
      {message && <p role="status" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{message}</p>}
      {loading ? <p className="mt-5 text-sm text-slate-600">Loading submissions...</p> : visible.length === 0 ? <p className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">No {status} events.</p> : <div className="mt-5 space-y-3">{visible.map((item) => {
        const expanded = expandedItems.includes(item.id);
        return <article key={item.id} className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.045)] transition hover:shadow-md">
          <div className="flex gap-3 p-3 sm:gap-4 sm:p-4">
            {item.image_url ? <img src={item.image_url} alt={item.title} className="h-24 w-24 shrink-0 rounded-xl bg-slate-100 object-cover sm:h-28 sm:w-36" /> : <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-semibold text-slate-400 sm:h-28 sm:w-36">No image</div>}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-amber-700">{item.category.replaceAll("_", " ")}</span>{item.subcategory && <span className="text-[10px] font-semibold text-slate-400">/ {item.subcategory.replaceAll("_", " ")}</span>}<span className={`ml-auto rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${item.status==="pending"?"bg-amber-50 text-amber-800":item.status==="approved"?"bg-emerald-50 text-emerald-800":"bg-rose-50 text-rose-700"}`}>{item.status}</span></div>
              <h3 className="mt-1 truncate text-base font-extrabold text-[#10243A] sm:text-lg">{item.title}</h3>
              {item.custom_event_type && <p className="mt-0.5 text-xs font-semibold text-blue-700">New type: {item.custom_event_type}</p>}
              <p className="mt-1 text-xs text-slate-600">{new Date(item.starts_at).toLocaleString("en-IN")} <span className="mx-1 text-slate-300">·</span><strong className="text-slate-800">{item.ticket_price > 0 ? `₹${item.ticket_price}` : "Free"}</strong></p>
              <p className="mt-1 truncate text-xs text-slate-500">{item.event_mode==="hybrid"?"Online + Offline":item.event_mode==="online"?"Online":"Offline"} <span className="mx-1 text-slate-300">·</span>{item.event_mode==="online"?"Online event":item.location_status==="tba"?`Venue TBA · ${item.locality}`:`${item.venue}, ${item.locality}`}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">{item.total_capacity !== null && <span>Capacity <strong className="text-slate-700">{item.total_capacity}</strong> · Available <strong className="text-slate-700">{item.available_seats ?? "—"}</strong></span>}<span>Organiser <strong className="text-slate-700">{item.organizer_name}</strong></span></div>
              <button type="button" onClick={() => toggleDetails(item.id)} aria-expanded={expanded} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#1b5276] hover:text-[#10243A]">{expanded ? "Hide details" : "View details"} <span aria-hidden="true">{expanded ? "⌃" : "⌄"}</span></button>
            </div>
          </div>
          {expanded && <div className="border-t border-slate-100 bg-[#fbfcfe] px-4 py-4 sm:px-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-slate-400">Event description</p><p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{item.description || "No description provided."}</p></div>
              {item.event_details && <div className="rounded-xl border border-slate-200 bg-white p-3 sm:col-span-2"><p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-amber-800">Additional event details</p>{item.event_details.highlights&&<p className="mt-2 whitespace-pre-wrap text-sm text-slate-700"><strong>Highlights:</strong> {item.event_details.highlights}</p>}{item.event_details.target_audience&&<p className="mt-1 text-sm text-slate-700"><strong>Audience:</strong> {item.event_details.target_audience}</p>}{item.event_details.age_restriction&&<p className="mt-1 text-sm text-slate-700"><strong>Age:</strong> {item.event_details.age_restriction}</p>}{item.event_details.language&&<p className="mt-1 text-sm text-slate-700"><strong>Language:</strong> {item.event_details.language}</p>}{item.event_details.registration_deadline&&<p className="mt-1 text-sm text-slate-700"><strong>Registration deadline:</strong> {new Date(item.event_details.registration_deadline).toLocaleString("en-IN")}</p>}{item.event_details.cancellation_refund_policy&&<p className="mt-2 whitespace-pre-wrap border-t border-slate-100 pt-2 text-xs leading-relaxed text-slate-600"><strong>Cancellation & refund:</strong> {item.event_details.cancellation_refund_policy}</p>}</div>}
              {item.event_policies && <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-slate-500">Organiser rules & policies</p><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{item.event_policies}</p></div>}
              <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-slate-500">Organiser contact</p><p className="mt-2 text-sm font-bold text-slate-800">{item.organizer_name}</p><p className="mt-1 text-xs text-slate-600">{item.contact_phone}</p><p className="mt-1 break-all text-xs text-slate-600">{item.contact_email || "No email provided"}</p></div>
              {(item.organiser_upi_id||item.organiser_qr_image_url)&&<div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 sm:col-span-2"><p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-emerald-900">Attendee payment details — review before approval</p>{item.organiser_upi_id&&<p className="mt-2 text-sm text-slate-800">UPI ID: <strong>{item.organiser_upi_id}</strong></p>}{item.organiser_payee_name&&<p className="mt-1 text-sm text-slate-800">Payee: {item.organiser_payee_name}</p>}{item.organiser_qr_image_url&&<img src={item.organiser_qr_image_url} alt="Organiser payment QR" className="mt-2 h-28 w-28 rounded-lg border bg-white object-contain p-2"/>}</div>}
              {item.venue_address&&<div className="text-xs text-slate-600"><strong>Venue address:</strong> {item.venue_address}</div>}
              {item.map_link&&<a className="text-xs font-bold text-blue-800 underline" href={item.map_link} target="_blank" rel="noreferrer">Open Google Maps</a>}
              {item.online_event_link&&<a className="text-xs font-bold text-blue-800 underline" href={item.online_event_link} target="_blank" rel="noreferrer">Open online event link</a>}
            </div>
          </div>}
          {status === "pending" && <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-white px-3 py-3 sm:px-4"><p className="text-[11px] text-slate-400">Review this submission before publishing</p><div className="flex gap-2"><button disabled={busy === item.id} onClick={() => review(item.id,"rejected")} className="min-h-9 rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50">Reject</button><button disabled={busy === item.id} onClick={() => review(item.id,"approved")} className="min-h-9 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-50">{busy===item.id?"Please wait…":"Approve & Publish"}</button></div></div>}
        </article>;
      })}</div>}
    </section>
  </main>;
}
