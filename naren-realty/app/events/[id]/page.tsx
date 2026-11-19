"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type EventRecord = {
  id:string; title:string; category:string; subcategory:string|null; custom_event_type:string|null;
  venue:string; locality:string; starts_at:string; ends_at:string|null; ticket_price:number;
  total_capacity:number|null; available_seats:number|null; description:string; event_policies:string|null;
  image_url:string|null; organizer_name:string; contact_phone:string; contact_email:string|null;
};

const pretty = (value:string) => value.replaceAll("_"," ").replace(/\b\w/g, letter=>letter.toUpperCase());

export default function EventDetailsPage() {
  const params=useParams<{id:string}>();
  const [event,setEvent]=useState<EventRecord|null>(null);
  const [loading,setLoading]=useState(true);
  const [notFound,setNotFound]=useState(false);

  useEffect(()=>{
    let active=true;
    async function load(){
      const {data,error}=await supabase.from("event_submissions")
        .select("id,title,category,subcategory,custom_event_type,venue,locality,starts_at,ends_at,ticket_price,total_capacity,available_seats,description,event_policies,image_url,organizer_name,contact_phone,contact_email")
        .eq("id",params.id).eq("status","approved").maybeSingle();
      if(!active)return;
      if(error||!data)setNotFound(true);
      else setEvent(data as EventRecord);
      setLoading(false);
    }
    if(params.id)void load();
    return()=>{active=false;};
  },[params.id]);

  if(loading)return <main className="min-h-screen bg-[#f4f7fc] p-6 text-[#10243A]">Loading event details...</main>;
  if(notFound||!event)return <main className="min-h-screen bg-[#f4f7fc] px-4 py-16 text-center text-[#10243A]"><h1 className="text-2xl font-extrabold">Event not found</h1><p className="mt-2 text-sm text-slate-600">This event may have been removed or is not publicly available.</p><Link href="/events" className="mt-5 inline-flex rounded-lg bg-amber-400 px-5 py-3 text-sm font-extrabold">Browse events</Link></main>;

  const date=new Date(event.starts_at);
  const category=event.custom_event_type||event.subcategory||event.category;

  return <main className="min-h-screen bg-[#f4f7fc] text-slate-900">
    <header className="bg-[#10243A] px-4 py-4 text-white"><div className="mx-auto flex max-w-6xl items-center justify-between gap-3"><Link href="/" className="text-lg font-extrabold sm:text-2xl">NAREN <span className="text-amber-400">REALTY</span></Link><Link href="/events" className="text-sm font-semibold text-amber-300">← All Events</Link></div></header>
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-9">
      <div className="mb-4 flex flex-wrap items-center gap-2"><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold text-amber-900">{pretty(category)}</span><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">Admin approved</span></div>
      <h1 className="max-w-4xl text-3xl font-black leading-tight text-[#10243A] sm:text-4xl">{event.title}</h1>
      <p className="mt-2 text-sm text-slate-600 sm:text-base">{event.venue}, {event.locality}</p>
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.8fr)]">
        <section className="min-w-0">
          <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
            {event.image_url?<img src={event.image_url} alt={event.title} className="max-h-[520px] min-h-56 w-full object-cover"/>:<div className="flex aspect-[16/9] items-center justify-center bg-slate-200 text-slate-500">Event poster not provided</div>}
          </div>
          <div className="mt-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
            <h2 className="text-xl font-extrabold text-[#10243A]">About this event</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{event.description}</p>
          </div>
          {event.event_policies&&<div className="mt-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6"><h2 className="text-xl font-extrabold text-[#10243A]">Event rules & policies</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{event.event_policies}</p></div>}
          <div className="mt-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6"><h2 className="text-xl font-extrabold text-[#10243A]">Venue</h2><p className="mt-2 text-sm font-semibold text-slate-800">{event.venue}</p><p className="mt-1 text-sm text-slate-600">{event.locality}</p></div>
        </section>
        <aside className="space-y-5">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-bold text-slate-500">Ticket price</p><p className="mt-1 text-3xl font-black text-[#10243A]">{event.ticket_price>0?"₹"+event.ticket_price:"Free"}</p>
            <div className="mt-5 space-y-4 border-t border-slate-100 pt-4">
              <div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Date & time</p><p className="mt-1 text-sm font-bold text-[#10243A]">{date.toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</p><p className="text-sm text-slate-600">{date.toLocaleTimeString("en-IN",{hour:"numeric",minute:"2-digit"})}{event.ends_at?" – "+new Date(event.ends_at).toLocaleTimeString("en-IN",{hour:"numeric",minute:"2-digit"}):""}</p></div>
              <div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Seats available</p><p className="mt-1 text-2xl font-black text-emerald-700">{event.available_seats??"Not specified"}</p><p className="text-xs text-slate-500">Total capacity: {event.total_capacity??"Not specified"}</p></div>
            </div>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-700">Organiser profile</p>
            <div className="mt-3 flex items-center gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#10243A] text-lg font-black text-amber-300">{event.organizer_name?.trim()?.charAt(0)?.toUpperCase()||"O"}</div><div className="min-w-0"><h2 className="truncate text-lg font-extrabold text-[#10243A]">{event.organizer_name}</h2><p className="text-xs font-semibold text-emerald-700">Event organiser</p></div></div>
            <p className="mt-4 text-sm leading-6 text-slate-600">Contact the organiser for event-related questions and participation details.</p>
            <a href={"tel:"+event.contact_phone} className="mt-4 flex w-full items-center justify-center rounded-xl bg-amber-400 px-4 py-3 text-sm font-extrabold text-[#10243A] hover:bg-amber-300">Contact organiser</a>
            {event.contact_email&&<a href={"mailto:"+event.contact_email} className="mt-2 flex w-full items-center justify-center rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-[#10243A] hover:bg-slate-50">Email organiser</a>}
          </div>
        </aside>
      </div>
      <div className="mt-7"><Link href="/events" className="text-sm font-bold text-blue-800 underline">← Browse more events</Link></div>
    </div>
  </main>;
}
