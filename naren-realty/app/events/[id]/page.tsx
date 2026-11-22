"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type EventRecord = {
  id:string; title:string;
  category:string; subcategory:string|null; custom_event_type:string|null; venue:string; locality:string|null;
  event_mode:string; location_status:string; venue_address:string|null; map_link:string|null; online_event_link:string|null;
  starts_at:string; ends_at:string|null; ticket_price:number; total_capacity:number|null; available_seats:number|null;
  description:string; event_policies:string|null;
  event_details:{highlights?:string;target_audience?:string;age_restriction?:string;language?:string;registration_deadline?:string|null;cancellation_refund_policy?:string}|null;
  image_url:string|null;
};
type RelatedEvent = Pick<EventRecord,"id"|"title"|"image_url"|"starts_at"|"ticket_price"|"venue"|"locality">;
const pretty=(value:string)=>value.replaceAll("_"," ").replace(/\b\w/g,l=>l.toUpperCase());
const dateLabel=(value:string)=>new Date(value).toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short",year:"numeric"});
const timeLabel=(value:string)=>new Date(value).toLocaleTimeString("en-IN",{hour:"numeric",minute:"2-digit"});

function EventDetailsContent(){
  const params=useParams<{id:string}>();
  const [event,setEvent]=useState<EventRecord|null>(null);
  const [related,setRelated]=useState<RelatedEvent[]>([]);
  const [loading,setLoading]=useState(true);
  const [notFound,setNotFound]=useState(false);
  const [termsOpen,setTermsOpen]=useState(false);
  useEffect(()=>{
    let active=true;
    async function load(){
      const {data,error}=await supabase.from("event_submissions").select("id,title,category,subcategory,custom_event_type,venue,locality,event_mode,location_status,venue_address,map_link,online_event_link,starts_at,ends_at,ticket_price,total_capacity,available_seats,description,event_policies,event_details,image_url").eq("id",params.id).eq("status","approved").maybeSingle();
      if(!active)return;
      if(error||!data){setNotFound(true);setLoading(false);return;}
      const current=data as EventRecord; setEvent(current);
      const base=supabase.from("event_submissions").select("id,title,image_url,starts_at,ticket_price,venue,locality").eq("status","approved").gte("starts_at",new Date().toISOString()).neq("id",current.id).order("starts_at",{ascending:true}).limit(8);
      const {data:nearby}=current.locality?await base.eq("locality",current.locality):await base.eq("category",current.category);
      if(active)setRelated((nearby??[]) as RelatedEvent[]);
      setLoading(false);
    }
    if(params.id)void load();
    return()=>{active=false;};
  },[params.id]);
  if(loading)return <main className="min-h-screen bg-[#F7F7F5] p-6 text-[#10243A]">Loading event details...</main>;
  if(notFound||!event)return <main className="min-h-screen bg-[#F7F7F5] px-4 py-16 text-center text-[#10243A]"><h1 className="text-2xl font-extrabold">Event not found</h1><p className="mt-2 text-sm text-slate-600">This event may have been removed or is not publicly available.</p><Link href="/events" className="mt-5 inline-flex rounded-xl bg-[#B08D3E] px-5 py-3 text-sm font-bold text-white">Browse events</Link></main>;
  const category=pretty(event.custom_event_type||event.subcategory||event.category);
  const venueLabel=event.event_mode==="online"?"Online event":event.location_status==="tba"?`Venue to be announced · ${event.locality??""}`:`${event.venue}${event.locality?", "+event.locality:""}`;
  const date=new Date(event.starts_at);
  return <main className="min-h-screen bg-[#F7F7F5] pb-28 text-[#172b2a]">
    <header className="sticky top-0 z-30 border-b border-[#E5DFD2] bg-white/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3"><Link href="/events" className="flex items-center gap-2 text-sm font-semibold text-[#10243A]"><span className="text-xl">‹</span> All Events</Link><Link href="/" className="text-base font-black tracking-tight text-[#10243A]">NAREN <span className="text-[#B08D3E]">REALTY</span></Link><button type="button" onClick={()=>{if(typeof navigator!=="undefined"&&navigator.share)void navigator.share({title:event.title,url:window.location.href});else if(typeof navigator!=="undefined")void navigator.clipboard.writeText(window.location.href);}} aria-label="Share event" className="rounded-full border border-[#E5DFD2] px-3 py-2 text-sm font-semibold text-[#B08D3E]">Share ↗</button></div>
    </header>
    <div className="mx-auto max-w-5xl px-3 py-4 sm:px-6 sm:py-7">
      <section className="overflow-hidden rounded-2xl border border-[#E5DFD2] bg-white shadow-sm">
        <div className="grid md:grid-cols-[minmax(250px,340px)_1fr]">
          <div className="relative aspect-[4/3] overflow-hidden bg-[#F4F0E7] sm:aspect-[16/9] md:aspect-[3/4]">
            {event.image_url?<img src={event.image_url} alt={event.title} className="absolute inset-0 h-full w-full object-cover"/>:<div className="flex h-full items-center justify-center px-5 text-center text-sm font-semibold text-[#5C6673]">Event poster not provided</div>}
          </div>
          <div className="flex flex-col p-4 sm:p-6 lg:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-[#F4F0E7] px-3 py-1 text-xs font-bold text-[#086d65]">{category}</span>
              <span className="rounded-md bg-[#F1F2F4] px-3 py-1 text-xs font-semibold text-[#475467]">{event.event_mode==="hybrid"?"Online + Offline":pretty(event.event_mode)}</span>
              {event.location_status==="tba"&&<span className="rounded-md bg-[#F4F0E7] px-3 py-1 text-xs font-semibold text-[#8F7130]">Venue to be announced</span>}
            </div>
            <h1 className="mt-4 text-2xl font-black leading-tight text-[#10243A] sm:text-3xl lg:text-4xl">{event.title}</h1>
            <div className="mt-5 grid gap-4 border-y border-[#EEE8DC] py-5">
              <Info icon="▦" label="Date" value={event.ends_at&&new Date(event.ends_at).toDateString()!==date.toDateString()?dateLabel(event.starts_at)+" – "+dateLabel(event.ends_at):dateLabel(event.starts_at)}/>
              <Info icon="◷" label="Time" value={timeLabel(event.starts_at)+(event.ends_at?" – "+timeLabel(event.ends_at):"")}/>
              <Info icon="⌖" label="Venue" value={venueLabel} link={event.map_link||undefined}/>
            </div>
            <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#667085]">Starts from</p>
                <p className="mt-1 text-3xl font-black text-[#10243A]">{event.ticket_price>0?"₹"+event.ticket_price:"Free"}</p>
                <p className="mt-1 text-xs font-semibold text-[#B08D3E]">{event.available_seats===null?"Availability as listed":event.available_seats>0?event.available_seats+" seats available":"Check availability with organiser"}</p>
              </div>
              <a href="#ticket-details" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#B08D3E] px-5 text-sm font-extrabold text-white hover:bg-[#8F7130]">Ticket details ↓</a>
            </div>
          </div>
        </div>
      </section>
      <section id="ticket-details" className="mt-5 overflow-hidden rounded-2xl border border-[#E5DFD2] bg-white shadow-sm">
        <div className="border-b border-[#EEE8DC] px-4 py-4 sm:px-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#B08D3E]">Plan your visit</p>
          <h2 className="mt-1 text-xl font-extrabold text-[#10243A]">Event Details</h2>
        </div>
        <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-3">
          <div className="border-b border-[#EEE8DC] p-4 sm:border-r"><Info icon="▦" label="Date" value={event.ends_at&&new Date(event.ends_at).toDateString()!==date.toDateString()?dateLabel(event.starts_at)+" – "+dateLabel(event.ends_at):dateLabel(event.starts_at)}/></div>
          <div className="border-b border-[#EEE8DC] p-4 lg:border-r"><Info icon="◷" label="Time" value={timeLabel(event.starts_at)+(event.ends_at?" – "+timeLabel(event.ends_at):"")}/></div>
          <div className="border-b border-[#EEE8DC] p-4 sm:border-r lg:border-r-0"><Info icon="⌛" label="Duration" value={event.ends_at?(()=>{const mins=Math.max(0,Math.round((new Date(event.ends_at).getTime()-date.getTime())/60000));return mins>=60?Math.floor(mins/60)+"h "+(mins%60?mins%60+"m":"") :mins+" min";})():"Not specified"}/></div>
          <div className="border-b border-[#EEE8DC] p-4 lg:border-r"><Info icon="♙" label="Age guidance" value={event.event_details?.age_restriction||"Not specified"}/></div>
          <div className="border-b border-[#EEE8DC] p-4 sm:border-r lg:border-r-0"><Info icon="文" label="Language" value={event.event_details?.language||"Not specified"}/></div>
          <div className="border-b border-[#EEE8DC] p-4"><Info icon="⌖" label="Venue" value={venueLabel} link={event.map_link||undefined}/></div>
        </div>
      </section>
      <section className="mt-5 rounded-2xl border border-[#E5DFD2] bg-white p-4 sm:p-6"><h2 className="text-lg font-extrabold text-[#10243A]">About the Event</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#475467]">{event.description}</p>{event.event_details?.highlights&&<div className="mt-4 rounded-xl bg-[#eff7f5] p-4"><h3 className="text-sm font-bold text-[#B08D3E]">Event highlights</h3><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#475467]">{event.event_details.highlights}</p></div>}</section>
      {(event.event_details?.target_audience||event.event_details?.registration_deadline)&&<section className="mt-4 rounded-2xl border border-[#E5DFD2] bg-white p-4 sm:p-6"><h2 className="text-lg font-extrabold text-[#10243A]">Good to Know</h2>{event.event_details.target_audience&&<Info icon="♧" label="Who should attend" value={event.event_details.target_audience}/ >}{event.event_details.registration_deadline&&<div className="mt-3"><Info icon="◷" label="Registration deadline" value={new Date(event.event_details.registration_deadline).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"})}/></div>}</section>}
      {event.event_policies&&<section className="mt-4 rounded-2xl border border-[#E5DFD2] bg-white p-4 sm:p-6"><h2 className="text-lg font-extrabold text-[#10243A]">Event Rules & Policies</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#475467]">{event.event_policies}</p></section>}
      {event.event_details?.cancellation_refund_policy&&<section className="mt-4 rounded-2xl border border-[#E5DFD2] bg-white p-4 sm:p-6"><h2 className="text-lg font-extrabold text-[#10243A]">Cancellation & Refund</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#475467]">{event.event_details.cancellation_refund_policy}</p></section>}
      <button type="button" onClick={()=>setTermsOpen(v=>!v)} aria-expanded={termsOpen} className="mt-4 flex w-full items-center justify-between rounded-xl border border-[#D8C9A5] bg-white px-4 py-4 text-left text-sm font-bold text-[#10243A] shadow-sm">Terms & Conditions <span>{termsOpen?"−":"›"}</span></button>
      {termsOpen&&<div className="rounded-b-xl border border-t-0 border-[#D8C9A5] bg-white p-4 text-sm leading-6 text-[#475467]">Please review the event rules, ticket details and cancellation/refund policy above before booking. Contact the organiser if you need clarification.</div>}
      <section className="mt-5 rounded-2xl border border-[#D8C9A5] bg-[#F4F0E7] p-4 sm:p-5"><div className="flex items-start gap-3"><span className="text-2xl text-[#B08D3E]">▣</span><div><h2 className="font-bold text-[#10243A]">Easy Event Entry</h2><p className="mt-1 text-sm leading-6 text-[#475467]">Keep your ticket confirmation ready when you arrive. Follow the organiser’s instructions for entry and check-in.</p></div></div></section>
      <section className="mt-6"><div className="mb-3"><h2 className="text-lg font-extrabold text-[#10243A]">Events At This Venue</h2><p className="text-xs text-[#667085]">Explore more upcoming events nearby</p></div>{related.length?<div className="flex gap-3 overflow-x-auto pb-3">{related.map(item=><RelatedCard key={item.id} item={item}/>)}</div>:<p className="rounded-xl bg-white p-4 text-sm text-[#667085]">More events will appear here when available.</p>}</section>
      <section className="mt-5"><div className="mb-3"><h2 className="text-lg font-extrabold text-[#10243A]">You May Also Like</h2><p className="text-xs text-[#667085]">More events around you</p></div>{related.length?<div className="flex gap-3 overflow-x-auto pb-3">{related.slice().reverse().map(item=><RelatedCard key={item.id} item={item}/>)}</div>:null}</section>


    </div>
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E5DFD2] bg-white/95 px-3 py-3 shadow-[0_-8px_24px_rgba(21,59,57,0.08)] backdrop-blur"><div className="mx-auto flex max-w-5xl items-center justify-between gap-3"><div><p className="text-lg font-black text-[#10243A]">{event.ticket_price>0?"₹"+event.ticket_price:"Free"}</p><p className="text-xs font-semibold text-[#B08D3E]">{event.available_seats===null?"Tickets available":event.available_seats>0?`${event.available_seats} seats available`:"Check availability"}</p></div><Link href={"/events/"+event.id+"/book"} className="inline-flex min-h-12 min-w-[48%] items-center justify-center rounded-xl bg-[#B08D3E] px-6 text-sm font-extrabold text-white shadow-md shadow-[#B08D3E]/20 hover:bg-[#8F7130] sm:min-w-52">Book Now</Link></div></div>
  </main>;
}
function Info({icon,label,value,link}:{icon:string;label:string;value:string;link?:string}){return <div className="flex min-w-0 items-start gap-3"><span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F4F0E7] text-base font-bold text-[#B08D3E]">{icon}</span><div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-wide text-[#667085]">{label}</p>{link?<a href={link} target="_blank" rel="noreferrer" className="mt-0.5 block text-sm font-semibold text-[#B08D3E] underline">{value} ↗</a>:<p className="mt-0.5 break-words text-sm font-semibold text-[#10243A]">{value}</p>}</div></div>}
function RelatedCard({item}:{item:RelatedEvent}){return <Link href={"/events/"+item.id} className="w-36 shrink-0 overflow-hidden rounded-xl border border-[#E5DFD2] bg-white shadow-sm sm:w-44">{item.image_url?<img src={item.image_url} alt={item.title} className="h-28 w-full object-cover"/>:<div className="h-28 bg-[#F4F0E7]"/>}<div className="p-2.5"><p className="line-clamp-2 text-sm font-bold text-[#10243A]">{item.title}</p><p className="mt-1 text-xs text-[#667085]">{dateLabel(item.starts_at)}</p><p className="mt-1 text-sm font-extrabold text-[#B08D3E]">{item.ticket_price>0?"₹"+item.ticket_price:"Free"}</p></div></Link>}
export default function EventDetailsPage(){return <Suspense fallback={<main className="min-h-screen bg-[#F7F7F5] p-6 text-[#10243A]">Loading event details...</main>}><EventDetailsContent/></Suspense>;}
