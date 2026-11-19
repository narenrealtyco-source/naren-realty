"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type EventRecord = {
  id:string; title:string; category:string; subcategory:string|null; custom_event_type:string|null;
  venue:string; locality:string|null; event_mode:string; location_status:string; venue_address:string|null; map_link:string|null; online_event_link:string|null; starts_at:string; ends_at:string|null; ticket_price:number;
  total_capacity:number|null; available_seats:number|null; description:string; event_policies:string|null;
  event_details:{highlights?:string;target_audience?:string;age_restriction?:string;language?:string;registration_deadline?:string|null;cancellation_refund_policy?:string}|null; image_url:string|null; organizer_name:string; contact_phone:string; contact_email:string|null;
};

const pretty = (value:string) => value.replaceAll("_"," ").replace(/\b\w/g, letter=>letter.toUpperCase());

function EventDetailsContent() {
  const params=useParams<{id:string}>();
  const [event,setEvent]=useState<EventRecord|null>(null);
  const [loading,setLoading]=useState(true);
  const [notFound,setNotFound]=useState(false);

  useEffect(()=>{
    let active=true;
    async function load(){
      const {data,error}=await supabase.from("event_submissions")
        .select("id,title,category,subcategory,custom_event_type,venue,locality,event_mode,location_status,venue_address,map_link,online_event_link,starts_at,ends_at,ticket_price,total_capacity,available_seats,description,event_policies,event_details,image_url,organizer_name,contact_phone,contact_email")
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
      <p className="mt-2 text-sm text-slate-600 sm:text-base">{event.event_mode==="online"?"Online event":event.location_status==="tba"?`Venue to be announced · ${event.locality??""}`:`${event.venue}, ${event.locality??""}`}</p><div className="mt-3 flex flex-wrap gap-2"><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold capitalize text-blue-800">{event.event_mode==="hybrid"?"Online + Offline":event.event_mode}</span>{event.location_status==="tba"&&<span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">Venue To Be Announced</span>}</div>
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
          {(event.event_details?.highlights||event.event_details?.target_audience||event.event_details?.age_restriction||event.event_details?.language||event.event_details?.registration_deadline||event.event_details?.cancellation_refund_policy)&&<div className="mt-5 rounded-2xl border border-amber-100 bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6"><p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Event essentials</p><h2 className="mt-1 text-xl font-extrabold text-[#10243A]">Good to know before you go</h2>{event.event_details.highlights&&<div className="mt-4"><h3 className="text-sm font-bold text-[#10243A]">Highlights</h3><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{event.event_details.highlights}</p></div>}<div className="mt-4 grid gap-3 sm:grid-cols-2">{event.event_details.target_audience&&<div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-bold uppercase text-slate-500">Who should attend</p><p className="mt-1 text-sm font-semibold text-[#10243A]">{event.event_details.target_audience}</p></div>}{event.event_details.age_restriction&&<div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-bold uppercase text-slate-500">Age guidance</p><p className="mt-1 text-sm font-semibold text-[#10243A]">{event.event_details.age_restriction}</p></div>}{event.event_details.language&&<div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-bold uppercase text-slate-500">Language</p><p className="mt-1 text-sm font-semibold text-[#10243A]">{event.event_details.language}</p></div>}{event.event_details.registration_deadline&&<div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-bold uppercase text-slate-500">Registration deadline</p><p className="mt-1 text-sm font-semibold text-[#10243A]">{new Date(event.event_details.registration_deadline).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"})}</p></div>}</div>{event.event_details.cancellation_refund_policy&&<div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-4"><h3 className="text-sm font-bold text-amber-950">Cancellation & refund policy</h3><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{event.event_details.cancellation_refund_policy}</p></div>}</div>}
          <div className="mt-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6"><h2 className="text-xl font-extrabold text-[#10243A]">{event.event_mode==="online"?"Online event": "Venue & location"}</h2>{event.event_mode==="online"?<p className="mt-2 text-sm text-slate-700">This event will be held online.</p>:event.location_status==="tba"?<><p className="mt-2 text-sm font-semibold text-amber-800">Venue will be announced soon.</p><p className="mt-1 text-sm text-slate-600">{event.locality}</p></>:<><p className="mt-2 text-sm font-semibold text-slate-800">{event.venue}</p><p className="mt-1 text-sm text-slate-600">{event.venue_address||event.locality}</p>{event.venue_address&&<p className="mt-1 text-sm text-slate-600">{event.locality}</p>}{event.map_link&&<a href={event.map_link} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-sm font-bold text-blue-800 underline">Open in Google Maps</a>}</>}{event.online_event_link&&<div className="mt-4"><p className="text-xs font-bold uppercase text-slate-500">Online participation</p><a href={event.online_event_link} target="_blank" rel="noreferrer" className="mt-1 inline-flex text-sm font-bold text-blue-800 underline">Join online event</a></div>}</div>
        </section>
        <aside className="space-y-5">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-bold text-slate-500">Ticket price</p><p className="mt-1 text-3xl font-black text-[#10243A]">{event.ticket_price>0?"₹"+event.ticket_price:"Free"}</p>
            <div className="mt-5 space-y-4 border-t border-slate-100 pt-4">
              <div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Date & time</p><p className="mt-1 text-sm font-bold text-[#10243A]">{date.toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</p><p className="text-sm text-slate-600">{date.toLocaleTimeString("en-IN",{hour:"numeric",minute:"2-digit"})}{event.ends_at?" – "+new Date(event.ends_at).toLocaleTimeString("en-IN",{hour:"numeric",minute:"2-digit"}):""}</p></div>
              <div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Seats available</p><p className="mt-1 text-2xl font-black text-emerald-700">{event.available_seats??"Not specified"}</p><p className="text-xs text-slate-500">Total capacity: {event.total_capacity??"Not specified"}</p></div>
            </div>
          </div>
        </aside>
      </div>
      <section className="mt-7 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-amber-700">Organiser details</p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold text-[#10243A]">{event.organizer_name}</h2>
            <p className="mt-1 text-sm text-slate-600">Event organiser</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={"tel:"+event.contact_phone} className="inline-flex items-center justify-center rounded-xl bg-amber-400 px-4 py-3 text-sm font-extrabold text-[#10243A] hover:bg-amber-300">Call organiser</a>
            {event.contact_email&&<a href={"mailto:"+event.contact_email} className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-[#10243A] hover:bg-slate-50">Email organiser</a>}
          </div>
        </div>
      </section>
      <div className="mt-7"><Link href="/events" className="text-sm font-bold text-blue-800 underline">← Browse more events</Link></div>
    </div>
  </main>;
}

export default function EventDetailsPage() {
  return <Suspense fallback={<main className="min-h-screen bg-[#f4f7fc] p-6 text-[#10243A]">Loading event details...</main>}><EventDetailsContent /></Suspense>;
}
