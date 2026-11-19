"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Booking = { id:string; event_id:string; booking_code:string; customer_name:string; quantity:number; total_amount:number; status:string; created_at:string; };
type EventInfo = { id:string; title:string; starts_at:string; venue:string; locality:string|null; };

export default function MyEventBookingsPage() {
  const [items,setItems]=useState<Booking[]>([]);
  const [events,setEvents]=useState<Record<string,EventInfo>>({});
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState<string|null>(null);
  const [message,setMessage]=useState("");

  async function load(){
    setLoading(true);
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){window.location.href="/account?next=/events/my-bookings";return;}
    const {data,error}=await supabase.from("event_bookings")
      .select("id,event_id,booking_code,customer_name,quantity,total_amount,status,created_at")
      .eq("customer_id",user.id).order("created_at",{ascending:false});
    if(error){setMessage("Your bookings could not be loaded. Please try again.");setLoading(false);return;}
    const rows=(data??[]) as Booking[];
    setItems(rows);
    const ids=[...new Set(rows.map(row=>row.event_id))];
    if(ids.length){
      const {data:eventRows}=await supabase.from("event_submissions").select("id,title,starts_at,venue,locality").in("id",ids);
      setEvents(Object.fromEntries((eventRows??[]).map((item)=>[item.id,item as EventInfo])));
    }
    setLoading(false);
  }
  useEffect(()=>{void load();},[]);

  async function cancel(id:string){
    if(!window.confirm("Cancel this event booking?"))return;
    setBusy(id);setMessage("");
    const {data,error}=await supabase.rpc("request_event_booking_cancellation",{p_booking_id:id});
    if(error)setMessage("Cancellation could not be processed. Please try again.");
    else if(data?.status==="cancel_requested")setMessage("Cancellation request received. The organiser will review it.");
    else setMessage("Booking cancelled. Seats have been released.");
    await load();setBusy(null);
  }

  return <main className="min-h-screen bg-[#f4f7fc] text-slate-900">
    <header className="bg-[#10243A] px-4 py-4 text-white"><div className="mx-auto flex max-w-4xl items-center justify-between"><Link href="/" className="font-extrabold">NAREN <span className="text-amber-400">REALTY</span></Link><Link href="/events" className="text-sm font-semibold text-amber-300">← Events</Link></div></header>
    <section className="mx-auto max-w-4xl px-4 py-8">
      <p className="text-xs font-bold uppercase tracking-widest text-amber-700">Your event activity</p>
      <h1 className="mt-2 text-3xl font-extrabold text-[#10243A]">My Event Bookings</h1>
      {message&&<p role="status" className="mt-4 rounded-xl bg-white p-3 text-sm text-slate-700 ring-1 ring-slate-200">{message}</p>}
      {loading?<p className="mt-6 text-sm text-slate-600">Loading your bookings...</p>:items.length===0?<div className="mt-6 rounded-2xl bg-white p-6 text-sm text-slate-600 ring-1 ring-slate-200">You have not booked any events yet. <Link href="/events" className="font-bold text-blue-800 underline">Explore events</Link></div>:<div className="mt-6 space-y-4">{items.map(item=>{const event=events[item.event_id];return <article key={item.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-extrabold text-[#10243A]">{event?.title??"Event"}</h2><p className="mt-1 text-sm text-slate-600">{event?new Date(event.starts_at).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"}):""}</p><p className="mt-1 text-xs text-slate-500">{event?[event.venue,event.locality].filter(Boolean).join(", "):""}</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold capitalize text-emerald-800">{item.status.replaceAll("_"," ")}</span></div><div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm"><div><p className="text-xs text-slate-500">Booking ID</p><p className="font-bold">{item.booking_code}</p></div><div><p className="text-xs text-slate-500">Seats</p><p className="font-bold">{item.quantity}</p></div><div><p className="text-xs text-slate-500">Amount</p><p className="font-bold">{item.total_amount===0?"Free":"₹"+item.total_amount}</p></div><div><p className="text-xs text-slate-500">Booked on</p><p className="font-bold">{new Date(item.created_at).toLocaleDateString("en-IN")}</p></div></div>{item.status==="confirmed"&&<button disabled={busy===item.id} onClick={()=>cancel(item.id)} className="mt-4 rounded-lg border border-rose-200 px-4 py-2.5 text-sm font-bold text-rose-700 disabled:opacity-50">{busy===item.id?"Processing...":"Cancel booking"}</button>}</article>})}</div>}
    </section>
  </main>;
}
