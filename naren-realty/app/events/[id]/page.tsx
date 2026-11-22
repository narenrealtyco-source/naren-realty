"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type EventRecord = {
  id:string; title:string; organiser_upi_id:string|null; organiser_payee_name:string|null; organiser_qr_image_url:string|null;
  category:string; subcategory:string|null; custom_event_type:string|null; venue:string; locality:string|null;
  event_mode:string; location_status:string; venue_address:string|null; map_link:string|null; online_event_link:string|null;
  starts_at:string; ends_at:string|null; ticket_price:number; total_capacity:number|null; available_seats:number|null;
  description:string; event_policies:string|null;
  event_details:{highlights?:string;target_audience?:string;age_restriction?:string;language?:string;registration_deadline?:string|null;cancellation_refund_policy?:string}|null;
  image_url:string|null; organizer_name:string; contact_phone:string; contact_email:string|null;
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
      const {data,error}=await supabase.from("event_submissions").select("id,title,organiser_upi_id,organiser_payee_name,organiser_qr_image_url,category,subcategory,custom_event_type,venue,locality,event_mode,location_status,venue_address,map_link,online_event_link,starts_at,ends_at,ticket_price,total_capacity,available_seats,description,event_policies,event_details,image_url,organizer_name,contact_phone,contact_email").eq("id",params.id).eq("status","approved").maybeSingle();
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
  if(loading)return <main className="min-h-screen bg-[#f3f8f7] p-6 text-[#153b39]">Loading event details...</main>;
  if(notFound||!event)return <main className="min-h-screen bg-[#f3f8f7] px-4 py-16 text-center text-[#153b39]"><h1 className="text-2xl font-extrabold">Event not found</h1><p className="mt-2 text-sm text-slate-600">This event may have been removed or is not publicly available.</p><Link href="/events" className="mt-5 inline-flex rounded-xl bg-[#087f75] px-5 py-3 text-sm font-bold text-white">Browse events</Link></main>;
  const category=pretty(event.custom_event_type||event.subcategory||event.category);
  const venueLabel=event.event_mode==="online"?"Online event":event.location_status==="tba"?`Venue to be announced · ${event.locality??""}`:`${event.venue}${event.locality?", "+event.locality:""}`;
  const date=new Date(event.starts_at);
  return <main className="min-h-screen bg-[#f3f8f7] pb-28 text-[#172b2a]">
    <header className="sticky top-0 z-30 border-b border-[#dcebe8] bg-white/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3"><Link href="/events" className="flex items-center gap-2 text-sm font-semibold text-[#31514e]"><span className="text-xl">‹</span> All Events</Link><Link href="/" className="text-base font-black tracking-tight text-[#153b39]">NAREN <span className="text-[#07877b]">REALTY</span></Link><button type="button" onClick={()=>{if(typeof navigator!=="undefined"&&navigator.share)void navigator.share({title:event.title,url:window.location.href});else if(typeof navigator!=="undefined")void navigator.clipboard.writeText(window.location.href);}} aria-label="Share event" className="rounded-full border border-[#dcebe8] px-3 py-2 text-sm font-semibold text-[#087f75]">Share ↗</button></div>
    </header>
    <div className="mx-auto max-w-5xl px-3 py-4 sm:px-6 sm:py-7">
      <div className="overflow-hidden rounded-2xl border border-[#dcebe8] bg-white shadow-sm">
        {event.image_url?<img src={event.image_url} alt={event.title} className="max-h-[520px] min-h-52 w-full object-cover"/>:<div className="flex aspect-[16/8] items-center justify-center bg-[#e4f0ed] text-sm font-semibold text-[#55716d]">Event poster not provided</div>}
      </div>
      <div className="mt-4 flex flex-wrap gap-2"><span className="rounded-md bg-[#e1f2ef] px-3 py-1 text-xs font-bold text-[#086d65]">{category}</span><span className="rounded-md bg-[#edf2f1] px-3 py-1 text-xs font-semibold text-[#49615e]">{event.event_mode==="hybrid"?"Online + Offline":pretty(event.event_mode)}</span>{event.location_status==="tba"&&<span className="rounded-md bg-[#fff4dc] px-3 py-1 text-xs font-semibold text-[#8a5a08]">Venue to be announced</span>}</div>
      <h1 className="mt-3 text-2xl font-black leading-tight text-[#153b39] sm:text-4xl">{event.title}</h1>
      <div className="mt-5 grid gap-3 rounded-2xl border border-[#dcebe8] bg-white p-4 sm:grid-cols-2 sm:p-5">
        <Info icon="▦" label="Date" value={event.ends_at&&new Date(event.ends_at).toDateString()!==date.toDateString()?`${dateLabel(event.starts_at)} – ${dateLabel(event.ends_at)}`:dateLabel(event.starts_at)}/>
        <Info icon="◷" label="Time" value={`${timeLabel(event.starts_at)}${event.ends_at?" – "+timeLabel(event.ends_at):""}`}/>
        <Info icon="⌛" label="Duration" value={event.ends_at?(()=>{const mins=Math.max(0,Math.round((new Date(event.ends_at).getTime()-date.getTime())/60000));return mins>=60?`${Math.floor(mins/60)}h ${mins%60?mins%60+"m":""}`:`${mins} min`;})():"Not specified"}/>
        <Info icon="♙" label="Age guidance" value={event.event_details?.age_restriction||"Not specified"}/>
        <Info icon="文" label="Language" value={event.event_details?.language||"Not specified"}/>
        <Info icon="⌖" label="Venue" value={venueLabel} link={event.map_link||undefined}/>
      </div>
      <section className="mt-5 rounded-2xl border border-[#dcebe8] bg-white p-4 sm:p-6"><h2 className="text-lg font-extrabold text-[#153b39]">About the Event</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#536966]">{event.description}</p>{event.event_details?.highlights&&<div className="mt-4 rounded-xl bg-[#eff7f5] p-4"><h3 className="text-sm font-bold text-[#087f75]">Event highlights</h3><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#49615e]">{event.event_details.highlights}</p></div>}</section>
      {(event.event_details?.target_audience||event.event_details?.registration_deadline)&&<section className="mt-4 rounded-2xl border border-[#dcebe8] bg-white p-4 sm:p-6"><h2 className="text-lg font-extrabold text-[#153b39]">Good to Know</h2>{event.event_details.target_audience&&<Info icon="♧" label="Who should attend" value={event.event_details.target_audience}/ >}{event.event_details.registration_deadline&&<div className="mt-3"><Info icon="◷" label="Registration deadline" value={new Date(event.event_details.registration_deadline).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"})}/></div>}</section>}
      {event.event_policies&&<section className="mt-4 rounded-2xl border border-[#dcebe8] bg-white p-4 sm:p-6"><h2 className="text-lg font-extrabold text-[#153b39]">Event Rules & Policies</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#536966]">{event.event_policies}</p></section>}
      {event.event_details?.cancellation_refund_policy&&<section className="mt-4 rounded-2xl border border-[#dcebe8] bg-white p-4 sm:p-6"><h2 className="text-lg font-extrabold text-[#153b39]">Cancellation & Refund</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#536966]">{event.event_details.cancellation_refund_policy}</p></section>}
      <button type="button" onClick={()=>setTermsOpen(v=>!v)} aria-expanded={termsOpen} className="mt-4 flex w-full items-center justify-between rounded-xl border border-[#cfe2de] bg-white px-4 py-4 text-left text-sm font-bold text-[#244b47] shadow-sm">Terms & Conditions <span>{termsOpen?"−":"›"}</span></button>
      {termsOpen&&<div className="rounded-b-xl border border-t-0 border-[#cfe2de] bg-white p-4 text-sm leading-6 text-[#536966]">Please review the event rules, ticket details and cancellation/refund policy above before booking. Contact the organiser if you need clarification.</div>}
      <section className="mt-5 rounded-2xl border border-[#cfe2de] bg-[#e8f3f1] p-4 sm:p-5"><div className="flex items-start gap-3"><span className="text-2xl text-[#087f75]">▣</span><div><h2 className="font-bold text-[#153b39]">Easy Event Entry</h2><p className="mt-1 text-sm leading-6 text-[#536966]">Keep your ticket confirmation ready when you arrive. Follow the organiser’s instructions for entry and check-in.</p></div></div></section>
      <section className="mt-6"><div className="mb-3"><h2 className="text-lg font-extrabold text-[#153b39]">Events At This Venue</h2><p className="text-xs text-[#6a817d]">Explore more upcoming events nearby</p></div>{related.length?<div className="flex gap-3 overflow-x-auto pb-3">{related.map(item=><RelatedCard key={item.id} item={item}/>)}</div>:<p className="rounded-xl bg-white p-4 text-sm text-[#6a817d]">More events will appear here when available.</p>}</section>
      <section className="mt-5"><div className="mb-3"><h2 className="text-lg font-extrabold text-[#153b39]">You May Also Like</h2><p className="text-xs text-[#6a817d]">More events around you</p></div>{related.length?<div className="flex gap-3 overflow-x-auto pb-3">{related.slice().reverse().map(item=><RelatedCard key={item.id} item={item}/>)}</div>:null}</section>
      <section className="mt-5 rounded-2xl border border-[#dcebe8] bg-white p-4 sm:p-5"><p className="text-xs font-bold uppercase tracking-wider text-[#087f75]">Organiser</p><div className="mt-2 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-extrabold text-[#153b39]">{event.organizer_name}</h2><p className="text-sm text-[#6a817d]">Event organiser</p></div><div className="flex gap-2"><a href={"tel:"+event.contact_phone} className="rounded-lg bg-[#087f75] px-4 py-2.5 text-sm font-bold text-white">Call</a>{event.contact_email&&<a href={"mailto:"+event.contact_email} className="rounded-lg border border-[#cfe2de] px-4 py-2.5 text-sm font-bold text-[#087f75]">Email</a>}</div></div></section>
      {(event.organiser_upi_id||event.organiser_qr_image_url)&&<section className="mt-4 rounded-2xl border border-[#cfe2de] bg-white p-4"><h2 className="font-extrabold text-[#153b39]">Organiser Payment Details</h2><p className="mt-1 text-xs leading-5 text-[#6a817d]">Pay the organiser directly. Verify the payee details in your UPI app before payment.</p>{event.organiser_upi_id&&<div className="mt-3 flex flex-wrap items-center justify-between gap-2"><span className="break-all text-sm font-bold text-[#244b47]">{event.organiser_upi_id}</span><button type="button" onClick={()=>void navigator.clipboard.writeText(event.organiser_upi_id!)} className="rounded-lg bg-[#e1f2ef] px-3 py-2 text-xs font-bold text-[#087f75]">Copy UPI</button></div>}{event.organiser_payee_name&&<p className="mt-2 text-sm text-[#536966]">Payee: <strong>{event.organiser_payee_name}</strong></p>}{event.organiser_qr_image_url&&<img src={event.organiser_qr_image_url} alt="Organiser UPI QR code" className="mx-auto mt-4 h-48 w-48 rounded-xl border border-[#dcebe8] object-contain p-2"/>}</section>}
    </div>
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#dcebe8] bg-white/95 px-3 py-3 shadow-[0_-8px_24px_rgba(21,59,57,0.08)] backdrop-blur"><div className="mx-auto flex max-w-5xl items-center justify-between gap-3"><div><p className="text-lg font-black text-[#153b39]">{event.ticket_price>0?"₹"+event.ticket_price:"Free"}</p><p className="text-xs font-semibold text-[#087f75]">{event.available_seats===null?"Tickets available":event.available_seats>0?`${event.available_seats} seats available`:"Check availability"}</p></div><a href="#ticket-details" onClick={e=>{e.preventDefault();document.getElementById("ticket-details")?.scrollIntoView({behavior:"smooth"});}} className="inline-flex min-h-12 min-w-[48%] items-center justify-center rounded-xl bg-[#087f75] px-6 text-sm font-extrabold text-white shadow-md shadow-[#087f75]/20 hover:bg-[#066b63] sm:min-w-52">Book Now</a></div></div>
  </main>;
}
function Info({icon,label,value,link}:{icon:string;label:string;value:string;link?:string}){return <div className="flex min-w-0 items-start gap-3"><span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#e8f3f1] text-base font-bold text-[#087f75]">{icon}</span><div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-wide text-[#78908b]">{label}</p>{link?<a href={link} target="_blank" rel="noreferrer" className="mt-0.5 block text-sm font-semibold text-[#087f75] underline">{value} ↗</a>:<p className="mt-0.5 break-words text-sm font-semibold text-[#244b47]">{value}</p>}</div></div>}
function RelatedCard({item}:{item:RelatedEvent}){return <Link href={"/events/"+item.id} className="w-36 shrink-0 overflow-hidden rounded-xl border border-[#dcebe8] bg-white shadow-sm sm:w-44">{item.image_url?<img src={item.image_url} alt={item.title} className="h-28 w-full object-cover"/>:<div className="h-28 bg-[#e8f3f1]"/>}<div className="p-2.5"><p className="line-clamp-2 text-sm font-bold text-[#153b39]">{item.title}</p><p className="mt-1 text-xs text-[#6a817d]">{dateLabel(item.starts_at)}</p><p className="mt-1 text-sm font-extrabold text-[#087f75]">{item.ticket_price>0?"₹"+item.ticket_price:"Free"}</p></div></Link>}
export default function EventDetailsPage(){return <Suspense fallback={<main className="min-h-screen bg-[#f3f8f7] p-6 text-[#153b39]">Loading event details...</main>}><EventDetailsContent/></Suspense>;}
