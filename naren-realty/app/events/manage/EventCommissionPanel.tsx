"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "../../lib/supabase-browser";
const supabase = createSupabaseBrowserClient();
import EventSettlementCycles from "./EventSettlementCycles";

type EventOption={id:string;title:string;ticket_price:number;status:string};
type Settings={commission_percent:number;payment_upi_id:string|null;payee_name:string|null;qr_image_url:string|null};
type Sale={id:string;event_id:string;paid_attendee_count:number;ticket_unit_price:number;total_ticket_amount:number;commission_amount:number;organiser_net_amount:number;collection_method:string;commission_payment_reference:string|null;commission_payment_status:string;created_at:string};
const field="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900";

export default function EventCommissionPanel({events}:{events:EventOption[]}) {
 const [settings,setSettings]=useState<Settings|null>(null);
 const [sales,setSales]=useState<Sale[]>([]);
 const [eventId,setEventId]=useState("");
 const [count,setCount]=useState("1");
 const [method,setMethod]=useState("upi");
 const [references,setReferences]=useState<Record<string,string>>({});
 const [note,setNote]=useState("");
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [message,setMessage]=useState("");
 const activeEvents=events.filter(e=>e.status==="approved"&&Number(e.ticket_price)>0);
 const selected=activeEvents.find(e=>e.id===eventId)??activeEvents[0];
 const total=useMemo(()=>Math.max(0,Number(count)||0)*(Number(selected?.ticket_price)||0),[count,selected]);
 const commissionPercent=Number(settings?.commission_percent??10);
 const commission=useMemo(()=>Math.round(total*commissionPercent)/100,[total,commissionPercent]);
 async function load(){
  setLoading(true);
  const [{data:setting},{data:{user}}]=await Promise.all([supabase.from("event_commission_settings").select("commission_percent,payment_upi_id,payee_name,qr_image_url").eq("id",true).maybeSingle(),supabase.auth.getUser()]);
  setSettings(setting as Settings|null);
  if(user){const {data}=await supabase.from("event_ticket_sales").select("*").eq("organiser_id",user.id).order("created_at",{ascending:false}).limit(100);setSales((data??[]) as Sale[]);}
  setLoading(false);
 }
 useEffect(()=>{void load();},[]);
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(!selected){setMessage("No approved paid event is available for reporting.");return;}
  const n=Number(count);
  if(!Number.isInteger(n)||n<1||n>100000){setMessage("Enter a valid paid attendee count.");return;}
  setSaving(true);setMessage("");
  const {data:{user}}=await supabase.auth.getUser();
  if(!user){setMessage("Please sign in again.");setSaving(false);return;}
  const {error}=await supabase.from("event_ticket_sales").insert({event_id:selected.id,organiser_id:user.id,paid_attendee_count:n,ticket_unit_price:Number(selected.ticket_price),collection_method:method,commission_percent:commissionPercent,commission_payment_reference:null,organiser_note:note.trim()||null,commission_payment_status:"pending"});
  if(error)setMessage("Sales report could not be submitted. Please check the details and try again.");
  else{setMessage("Sales report saved and added to its 12-hour settlement cycle. Check Commission Settlement below.");setCount("1");setNote("");await load();}
  setSaving(false);
 }
 async function addReference(sale:Sale){
  const reference=(references[sale.id]??"").trim();
  if(reference.length<4){setMessage("Enter a valid UTR / transaction reference.");return;}
  const {error}=await supabase.from("event_ticket_sales").update({commission_payment_reference:reference}).eq("id",sale.id).is("commission_payment_reference",null);
  if(error)setMessage("UTR could not be saved. Please try again.");
  else{setMessage("UTR submitted. Commission payment is awaiting admin verification.");await load();}
 }
 return <section id="sales-reporting" className="mt-8 scroll-mt-6 space-y-5">
  <div><p className="text-xs font-bold uppercase tracking-widest text-amber-700">10% platform commission</p><h2 className="mt-1 text-2xl font-extrabold text-[#10243A]">Ticket Sales & Commission</h2><p className="mt-2 text-sm text-slate-600">Record paid ticket sales. Attendees pay you directly. Report every paid ticket sale here. The system groups sales into 12-hour cycles counted from event approval. Transfer each cycle’s 10% commission by the end of that cycle and submit one UTR for that cycle; admin verifies it manually.</p></div>
  {loading?<p className="text-sm text-slate-600">Loading commission details...</p>:<div className="grid gap-5 lg:grid-cols-2">
   <form onSubmit={submit} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
    <h3 className="font-bold text-[#10243A]">Report paid ticket sales</h3>
    {activeEvents.length===0?<p className="mt-3 text-sm text-slate-600">You need an approved paid event before reporting ticket sales.</p>:<>
     <label className="mt-4 block text-sm font-semibold">Event<select className={field} value={eventId||selected?.id||""} onChange={e=>setEventId(e.target.value)}>{activeEvents.map(e=><option key={e.id} value={e.id}>{e.title}</option>)}</select></label>
     <label className="mt-3 block text-sm font-semibold">Paid attendees in this sales report<input required type="number" min="1" max="100000" step="1" className={field} value={count} onChange={e=>setCount(e.target.value)}/></label>
     <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm"><div className="flex justify-between"><span>Ticket price</span><strong>₹{Number(selected?.ticket_price||0).toFixed(2)}</strong></div><div className="mt-2 flex justify-between"><span>Total ticket collection</span><strong>₹{total.toFixed(2)}</strong></div><div className="mt-2 flex justify-between text-amber-800"><span>NAREN REALTY commission ({commissionPercent}%)</span><strong>₹{commission.toFixed(2)}</strong></div><div className="mt-2 flex justify-between text-emerald-800"><span>Organiser balance ({(100-commissionPercent).toFixed(0)}%)</span><strong>₹{(total-commission).toFixed(2)}</strong></div></div>
     <label className="mt-4 block text-sm font-semibold">Attendee payment method<select className={field} value={method} onChange={e=>setMethod(e.target.value)}><option value="upi">UPI</option><option value="bank_transfer">Bank transfer</option></select></label>
     <button disabled={saving} className="mt-4 min-h-11 w-full rounded-lg bg-[#10243A] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{saving?"Saving...":"Save paid ticket sales"}</button>
    </>}
    {message&&<p role="status" className="mt-3 text-sm text-slate-700">{message}</p>}
   </form>
   <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><h3 className="font-bold text-[#10243A]">NAREN REALTY commission payment</h3>
    {settings?.payment_upi_id?<div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm">UPI ID: <strong>{settings.payment_upi_id}</strong></p><button type="button" onClick={()=>{void navigator.clipboard.writeText(settings.payment_upi_id!).then(()=>setMessage("UPI ID copied."),()=>setMessage("Could not copy UPI ID. Please copy it manually."));}} className="mt-2 rounded-lg bg-[#10243A] px-3 py-2 text-xs font-bold text-white">Copy UPI ID</button><p className="mt-2 text-xs text-amber-900">Transfer the cycle-wise commission by each 12-hour deadline. This is a manual UPI transfer, not an automatic split.</p>{settings.payee_name&&<p className="text-sm">Payee: {settings.payee_name}</p>}{settings.qr_image_url&&<img src={settings.qr_image_url} alt="NAREN REALTY commission UPI QR" className="mt-3 h-44 w-44 rounded-lg border bg-white object-contain p-2"/>}</div>:<p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Payment instructions are temporarily unavailable. Please contact NAREN REALTY before submitting a commission transfer.</p>}
    <h3 className="mt-6 font-bold text-[#10243A]">Your commission ledger</h3><p className="mt-1 text-xs text-slate-500">A report remains pending until NAREN REALTY verifies the commission transfer.</p>
    {sales.length===0?<p className="mt-4 text-sm text-slate-600">No ticket sales reported yet.</p>:<div className="mt-4 space-y-3">{sales.map(s=><article key={s.id} className="rounded-xl border border-slate-200 p-3"><div className="flex items-start justify-between gap-2"><strong className="text-sm">{events.find(e=>e.id===s.event_id)?.title??"Event"}</strong><span className={`rounded-full px-2 py-1 text-xs font-bold capitalize ${s.commission_payment_status==="verified"?"bg-emerald-100 text-emerald-800":s.commission_payment_reference?"bg-sky-100 text-sky-800":s.commission_payment_status==="rejected"?"bg-rose-100 text-rose-800":"bg-amber-100 text-amber-900"}`}>{s.commission_payment_status==="verified"?"verified":s.commission_payment_reference?"submitted":s.commission_payment_status}</span></div><p className="mt-2 text-sm text-slate-600">{s.paid_attendee_count} attendees × ₹{Number(s.ticket_unit_price).toFixed(2)}</p><div className="mt-2 flex justify-between text-sm"><span>Ticket collection</span><strong>₹{Number(s.total_ticket_amount).toFixed(2)}</strong></div><div className="flex justify-between text-sm"><span>10% commission</span><strong>₹{Number(s.commission_amount).toFixed(2)}</strong></div><div className="flex justify-between text-sm"><span>Organiser share</span><strong>₹{Number(s.organiser_net_amount).toFixed(2)}</strong></div><p className="mt-2 text-xs text-slate-500">Sales are included in the event’s 12-hour settlement cycle shown below.</p><p className="mt-2 text-xs text-slate-500">{new Date(s.created_at).toLocaleString("en-IN")}</p></article>)}</div>}
   </div>
  </div>}
  <EventSettlementCycles events={events}/>
 </section>;
}
