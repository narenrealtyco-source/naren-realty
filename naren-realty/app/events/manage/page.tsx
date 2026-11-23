"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "../../lib/supabase-browser";
const supabase = createSupabaseBrowserClient();
import EventCommissionPanel from "./EventCommissionPanel";
import EventOrganiserPaymentPanel from "./EventOrganiserPaymentPanel";

type OwnEvent = { id:string; title:string; organiser_upi_id:string|null; organiser_payee_name:string|null; starts_at:string; ends_at:string|null; description:string|null; image_url:string|null; event_details:Record<string,unknown>|null; venue:string; locality:string|null; status:string; event_mode:string; location_status:string; venue_address:string|null; map_link:string|null; online_event_link:string|null; total_capacity:number|null; available_seats:number|null; event_policies:string|null; ticket_price:number };
const field = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900";

export default function ManageEventsPage() {
  const [items,setItems] = useState<OwnEvent[]>([]);
  const [posterFiles,setPosterFiles] = useState<Record<string,File>>({});
  const [bannerFiles,setBannerFiles] = useState<Record<string,File>>({});
  const [values,setValues] = useState<Record<string,{capacity:string;seats:string;policies:string;venue:string;locality:string;venueAddress:string;mapLink:string;onlineLink:string;locationStatus:string;title:string;startsAt:string;endsAt:string;ticketPrice:string;description:string}>>({});
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState<string|null>(null);
  const [message,setMessage] = useState("");
  const [activeTab,setActiveTab] = useState<"overview"|"events"|"sales"|"payments">("overview");

  useEffect(() => {
    let active = true;
    async function load() {
      const {data:{user}} = await supabase.auth.getUser();
      if (!user) { window.location.href = "/account?next=/events/manage"; return; }
      const {data,error} = await supabase.from("event_submissions")
        .select("id,title,starts_at,ends_at,description,image_url,event_details,venue,locality,status,event_mode,location_status,venue_address,map_link,online_event_link,total_capacity,available_seats,event_policies,ticket_price,organiser_upi_id,organiser_payee_name")
        .eq("submitted_by",user.id).order("created_at",{ascending:false});
      if (!active) return;
      if (error) setMessage("Your events could not be loaded. Please try again.");
      else {
        const rows = (data??[]) as OwnEvent[];
        setItems(rows);
        setValues(Object.fromEntries(rows.map(item=>[item.id,{
          capacity:String(item.total_capacity??""),
          seats:String(item.available_seats??""),
          policies:item.event_policies??"", title:item.title, startsAt:new Date(item.starts_at).toISOString().slice(0,16), endsAt:item.ends_at?new Date(item.ends_at).toISOString().slice(0,16):"", ticketPrice:String(item.ticket_price), description:item.description??"", venue:item.venue==="To Be Announced"?"":item.venue==="Online Event"?"":item.venue, locality:item.locality??"", venueAddress:item.venue_address??"", mapLink:item.map_link??"", onlineLink:item.online_event_link??"", locationStatus:item.location_status==="tba"?"tba":"confirmed"
        }])));
      }
      setLoading(false);
    }
    void load();
    return ()=>{active=false;};
  },[]);

  async function save(item:OwnEvent) {
    const value=values[item.id];
    const capacity=Number(value.capacity), seats=Number(value.seats);
    if (!Number.isInteger(capacity)||capacity<1||capacity>100000||!Number.isInteger(seats)||seats<0||seats>capacity) {
      setMessage("Enter a valid capacity. Available seats must be between 0 and total capacity."); return;
    }
    if (value.policies.length>5000) {setMessage("Rules and policies must be 5,000 characters or fewer.");return;}
    if(item.event_mode!=="online"&&!value.locality.trim()){setMessage("Please enter the city/locality.");return;}
    if(item.event_mode!=="online"&&value.locationStatus==="confirmed"&&!value.venue.trim()){setMessage("Please enter the venue name or mark the location as TBA.");return;}
    if(value.mapLink.trim()&&!/^https?:\/\//i.test(value.mapLink.trim())){setMessage("Enter a valid Google Maps link.");return;}
    if(value.onlineLink.trim()&&!/^https?:\/\//i.test(value.onlineLink.trim())){setMessage("Enter a valid online meeting link.");return;}
    setBusy(item.id);setMessage("");
    if(!value.title.trim()||value.title.trim().length<3||value.title.trim().length>120){setMessage("Event title must be between 3 and 120 characters.");return;}
    const start=new Date(value.startsAt), end=value.endsAt?new Date(value.endsAt):null;
    if(!value.startsAt||Number.isNaN(start.getTime())||(end&&(Number.isNaN(end.getTime())||end<=start))){setMessage("Please enter valid event start and end times.");return;}
    const price=Number(value.ticketPrice);
    if(!Number.isFinite(price)||price<1||price>10000000){setMessage("Enter a valid ticket price.");return;}
    const upload=async(file:File|null)=>{if(!file)return null;if(file.size>5*1024*1024)throw new Error("Each event image must be smaller than 5 MB.");if(!["image/jpeg","image/png","image/webp"].includes(file.type))throw new Error("Use JPG, PNG or WEBP images.");const ext=file.name.split(".").pop()?.toLowerCase()||"jpg";const path=item.id+"/"+crypto.randomUUID()+"."+ext;const {error}=await supabase.storage.from("event-images").upload(path,file,{contentType:file.type,upsert:false});if(error)throw error;return supabase.storage.from("event-images").getPublicUrl(path).data.publicUrl;};
    let posterUrl:string|null=null,bannerUrl:string|null=null;
    try{[posterUrl,bannerUrl]=await Promise.all([upload(posterFiles[item.id]??null),upload(bannerFiles[item.id]??null)]);}catch(e){setMessage(e instanceof Error?e.message:"Image upload failed.");setBusy(null);return;}
    setBusy(item.id);setMessage("");
    const {error}=await supabase.rpc("update_own_event_content",{
      p_event_id:item.id,p_title:value.title.trim(),p_starts_at:start.toISOString(),p_ends_at:end?.toISOString()??null,p_description:value.description.trim(),p_ticket_price:price,p_image_url:posterUrl,p_banner_image_url:bannerUrl,
      p_total_capacity:capacity,p_available_seats:seats,p_event_policies:value.policies,p_venue:item.event_mode==="online"?"Online Event":value.locationStatus==="tba"?"To Be Announced":value.venue.trim(),p_locality:item.event_mode==="online"?null:value.locality.trim(),p_venue_address:value.locationStatus==="confirmed"?value.venueAddress.trim():null,p_map_link:value.locationStatus==="confirmed"?value.mapLink.trim():null,p_online_event_link:item.event_mode!=="offline"?value.onlineLink.trim():null,p_location_status:value.locationStatus
    });
    if(error) setMessage("Changes could not be saved. Please try again.");
    else {
      setItems(current=>current.map(row=>row.id===item.id?{...row,title:value.title.trim(),starts_at:start.toISOString(),ends_at:end?.toISOString()??null,description:value.description.trim(),ticket_price:price,image_url:posterUrl??row.image_url,event_details:bannerUrl?{...(row.event_details??{}),banner_image_url:bannerUrl}:row.event_details,total_capacity:capacity,available_seats:seats,event_policies:value.policies.trim()||null,venue:item.event_mode==="online"?"Online Event":value.locationStatus==="tba"?"To Be Announced":value.venue.trim(),locality:item.event_mode==="online"?"Online":value.locality.trim(),location_status:item.event_mode==="online"?"not_required":value.locationStatus,venue_address:value.venueAddress.trim()||null,map_link:value.mapLink.trim()||null,online_event_link:value.onlineLink.trim()||null}:row));
      setMessage("Event details updated successfully.");
    }
    setBusy(null);
  }

  return <main className="min-h-screen bg-[#f4f7fc] text-slate-900">
    <header className="bg-[#10243A] px-4 py-4 text-white"><div className="mx-auto flex max-w-4xl items-center justify-between gap-3"><Link href="/" className="font-extrabold">NAREN <span className="text-amber-400">REALTY</span></Link><Link href="/events" className="text-sm font-semibold text-amber-300">← Events</Link></div></header>
    <section className="mx-auto max-w-7xl px-4 py-8" id="overview">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-amber-700">NAREN REALTY · ORGANISER PORTAL</p><h1 className="mt-2 text-3xl font-extrabold text-[#10243A]">Manage My Events</h1><p className="mt-2 max-w-2xl text-sm text-slate-600">Your organiser workspace for events, ticket sales, settlements and payment details.</p></div><Link href="/events/submit" className="rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-extrabold text-[#10243A] shadow-sm hover:bg-amber-300">+ Post another event</Link></div>
      <div className="grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-6">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="px-2 pb-3 text-xs font-extrabold uppercase tracking-widest text-slate-500">Dashboard menu</p>
          <nav className="space-y-1">
            <button type="button" onClick={()=>setActiveTab("overview")} className={"flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold "+(activeTab==="overview"?"bg-[#10243A] text-white":"text-slate-700 hover:bg-slate-100")}>⌂ <span>Overview</span></button>
            <button type="button" onClick={()=>setActiveTab("events")} className={"flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold "+(activeTab==="events"?"bg-[#10243A] text-white":"text-slate-700 hover:bg-slate-100")}>▣ <span>My Events</span></button>
            <button type="button" onClick={()=>setActiveTab("sales")} className={"flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold "+(activeTab==="sales"?"bg-[#10243A] text-white":"text-slate-700 hover:bg-slate-100")}>▤ <span>Ticket Sales & Reports</span></button>
            <button type="button" onClick={()=>setActiveTab("sales")} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100">₹ <span>Commission Settlement</span></button>
            <button type="button" onClick={()=>setActiveTab("payments")} className={"flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold "+(activeTab==="payments"?"bg-[#10243A] text-white":"text-slate-700 hover:bg-slate-100")}>▧ <span>Attendee Payment Settings</span></button>
            <Link href="/events/submit" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">＋ <span>Create New Event</span></Link>
            <Link href="/account" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">♙ <span>My Account</span></Link>
            <Link href="/contact" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">? <span>Support</span></Link>
          </nav>
          <div className="mt-4 rounded-xl bg-amber-50 p-3"><p className="text-xs font-bold text-amber-900">Settlement cycle</p><p className="mt-1 text-xs leading-5 text-amber-800">Commission is reviewed in 12-hour cycles after event approval.</p></div>
        </div>
      </aside>
      <div className="min-w-0">
      {message&&<p role="status" className="mt-5 rounded-lg bg-white p-3 text-sm text-slate-700 ring-1 ring-slate-200">{message}</p>}
      {activeTab==="overview"&&<div className="mt-5 grid gap-4 sm:grid-cols-3"><div className="rounded-xl bg-white p-5 ring-1 ring-slate-200"><p className="text-sm text-slate-500">My events</p><p className="mt-1 text-2xl font-extrabold text-[#10243A]">{items.length}</p></div><div className="rounded-xl bg-white p-5 ring-1 ring-slate-200"><p className="text-sm text-slate-500">Approved events</p><p className="mt-1 text-2xl font-extrabold text-[#10243A]">{items.filter(x=>x.status==="approved").length}</p></div><div className="rounded-xl bg-white p-5 ring-1 ring-slate-200"><p className="text-sm text-slate-500">Pending review</p><p className="mt-1 text-2xl font-extrabold text-[#10243A]">{items.filter(x=>x.status==="pending").length}</p></div><div className="sm:col-span-3 rounded-xl bg-white p-5 ring-1 ring-slate-200"><h2 className="font-bold text-[#10243A]">Welcome to your organiser workspace</h2><p className="mt-1 text-sm text-slate-600">Use the buttons above to manage event details, attendee payment settings, ticket sales and commission settlements. Each workspace opens separately so the page stays clean and easy to use.</p><button type="button" onClick={()=>setActiveTab("events")} className="mt-3 rounded-lg bg-amber-400 px-4 py-2 text-sm font-bold text-[#10243A]">Manage my events</button></div></div>}
      <div className={activeTab==="events"?"block":"hidden"}>{loading?<p className="mt-6 text-sm text-slate-600">Loading your events...</p>:items.length===0?<p className="mt-6 rounded-xl bg-white p-5 text-sm text-slate-600 ring-1 ring-slate-200">You have not submitted any events yet.</p>:<div id="my-events" className="mt-6 space-y-5">{items.map(item=><article key={item.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-[#10243A]">{item.title}</h2><p className="mt-1 text-sm text-slate-600">{item.venue}, {item.locality}</p><p className="mt-1 text-sm text-slate-600">{new Date(item.starts_at).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"})}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold capitalize">{item.status}</span></div>
        <div className="mt-4 rounded-xl border border-slate-200 p-3"><p className="text-sm font-bold text-[#10243A]">Event mode: <span className="capitalize">{item.event_mode}</span></p>{item.event_mode!=="online"&&<><div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={()=>setValues(v=>({...v,[item.id]:{...v[item.id],locationStatus:"confirmed"}}))} className={`rounded-lg px-3 py-2 text-xs font-bold ${values[item.id]?.locationStatus==="confirmed"?"bg-amber-400 text-[#10243A]":"bg-slate-100 text-slate-700"}`}>Location Confirmed</button><button type="button" onClick={()=>setValues(v=>({...v,[item.id]:{...v[item.id],locationStatus:"tba"}}))} className={`rounded-lg px-3 py-2 text-xs font-bold ${values[item.id]?.locationStatus==="tba"?"bg-amber-400 text-[#10243A]":"bg-slate-100 text-slate-700"}`}>To Be Announced</button></div>{values[item.id]?.locationStatus==="confirmed"&&<label className="mt-3 block text-sm font-semibold">Venue name<input className={field} value={values[item.id]?.venue??""} onChange={e=>setValues(v=>({...v,[item.id]:{...v[item.id],venue:e.target.value}}))}/></label>}<label className="mt-3 block text-sm font-semibold">City / locality<input className={field} value={values[item.id]?.locality??""} onChange={e=>setValues(v=>({...v,[item.id]:{...v[item.id],locality:e.target.value}}))}/></label>{values[item.id]?.locationStatus==="confirmed"&&<><label className="mt-3 block text-sm font-semibold">Full venue address<textarea rows={2} className={field} value={values[item.id]?.venueAddress??""} onChange={e=>setValues(v=>({...v,[item.id]:{...v[item.id],venueAddress:e.target.value}}))}/></label><label className="mt-3 block text-sm font-semibold">Google Maps link<input className={field} value={values[item.id]?.mapLink??""} onChange={e=>setValues(v=>({...v,[item.id]:{...v[item.id],mapLink:e.target.value}}))} placeholder="https://maps.google.com/..."/></label></>}</>}{item.event_mode!=="offline"&&<label className="mt-3 block text-sm font-semibold">Online meeting link<input className={field} value={values[item.id]?.onlineLink??""} onChange={e=>setValues(v=>({...v,[item.id]:{...v[item.id],onlineLink:e.target.value}}))} placeholder="https://..."/></label>}</div><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Event title<input className={field} maxLength="120" value={values[item.id]?.title??""} onChange={e=>setValues(v=>({...v,[item.id]:{...v[item.id],title:e.target.value}}))}/></label><label className="text-sm font-semibold">Ticket price (₹)<input className={field} type="number" min="1" max="10000000" value={values[item.id]?.ticketPrice??""} onChange={e=>setValues(v=>({...v,[item.id]:{...v[item.id],ticketPrice:e.target.value}}))}/></label><label className="text-sm font-semibold">Event start date & time<input className={field} type="datetime-local" value={values[item.id]?.startsAt??""} onChange={e=>setValues(v=>({...v,[item.id]:{...v[item.id],startsAt:e.target.value}}))}/></label><label className="text-sm font-semibold">Event end date & time (optional)<input className={field} type="datetime-local" min={values[item.id]?.startsAt||undefined} value={values[item.id]?.endsAt??""} onChange={e=>setValues(v=>({...v,[item.id]:{...v[item.id],endsAt:e.target.value}}))}/></label></div><label className="mt-4 block text-sm font-semibold">Event description<textarea className={field} rows={4} maxLength={5000} value={values[item.id]?.description??""} onChange={e=>setValues(v=>({...v,[item.id]:{...v[item.id],description:e.target.value}}))}/></label><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold">Update listing poster · Portrait 9:16<input type="file" accept="image/jpeg,image/png,image/webp" className={field} onChange={e=>{const file=e.target.files?.[0];if(file)setPosterFiles(v=>({...v,[item.id]:file}));}}/><span className="mt-1 block text-xs font-normal text-slate-500">JPG, PNG or WEBP · max 5 MB. Leave blank to keep current poster.</span>{posterFiles[item.id]&&<span className="block text-xs text-emerald-700">Selected: {posterFiles[item.id].name}</span>}</label><label className="block text-sm font-semibold">Update detail page cover · Landscape 16:9<input type="file" accept="image/jpeg,image/png,image/webp" className={field} onChange={e=>{const file=e.target.files?.[0];if(file)setBannerFiles(v=>({...v,[item.id]:file}));}}/><span className="mt-1 block text-xs font-normal text-slate-500">JPG, PNG or WEBP · max 5 MB. Leave blank to keep current cover.</span>{bannerFiles[item.id]&&<span className="block text-xs text-emerald-700">Selected: {bannerFiles[item.id].name}</span>}</label></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Total event capacity<input className={field} type="number" min="1" max="100000" value={values[item.id]?.capacity??""} onChange={e=>setValues(v=>({...v,[item.id]:{...v[item.id],capacity:e.target.value}}))}/></label><label className="text-sm font-semibold">Available seats<input className={field} type="number" min="0" max={values[item.id]?.capacity||100000} value={values[item.id]?.seats??""} onChange={e=>setValues(v=>({...v,[item.id]:{...v[item.id],seats:e.target.value}}))}/></label></div>
        <label className="mt-4 block text-sm font-semibold">Event rules & policies<textarea className={field} rows={5} maxLength={5000} value={values[item.id]?.policies??""} onChange={e=>setValues(v=>({...v,[item.id]:{...v[item.id],policies:e.target.value}}))} placeholder="Add entry rules, cancellation and refund terms, age limits, late arrival rules, prohibited items, photography guidelines, etc."/></label>
        <p className="mt-1 text-xs text-slate-500">These details are visible on your public listing. Maximum 5,000 characters.</p>
        <button disabled={busy===item.id} onClick={()=>save(item)} className="mt-4 min-h-11 rounded-lg bg-[#10243A] px-5 text-sm font-bold text-white disabled:opacity-50">{busy===item.id?"Saving...":"Save changes"}</button>
      </article>)}</div>}</div>
      <div className={activeTab==="payments"?"block":"hidden"}><div className="mt-5 space-y-5">{items.length===0?<p className="rounded-xl bg-white p-5 text-sm text-slate-600">Submit an event first to add its attendee payment details.</p>:items.map(item=><EventOrganiserPaymentPanel key={item.id} eventId={item.id} eventTitle={item.title} initialUpi={item.organiser_upi_id} initialPayee={item.organiser_payee_name}/>)}</div></div>
      <div id="sales-reports" className={activeTab==="sales"?"block":"hidden"}><EventCommissionPanel events={items} /></div>
      </div>
      </div>
    </section>
  </main>;
}
