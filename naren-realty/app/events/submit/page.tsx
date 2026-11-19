"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const inputClass = "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100";
const categories = [
  {key:"home_gatherings",title:"House & Home Gatherings",subs:[["potluck_dinner","Potluck Dinner"],["game_night","Game Night"],["movie_match_screening","Movie / Match Screening"],["byob_party","BYOB Party"],["pajama_slumber_party","Pajama / Slumber Party"],["theme_party","Theme Party"],["jamming_session","Jamming Session"]]},
  {key:"social_meetups",title:"Social & Community Meetups",subs:[["hobby_interest_clubs","Hobby & Interest Clubs"],["open_mic_nights","Open Mic Nights"],["networking_mixers","Networking Mixers"],["language_exchange","Language Exchange Meetup"],["blind_stranger_dinners","Blind / Stranger Dinners"],["brunch_meetup","Brunch Meetup"]]},
  {key:"outdoor_active",title:"Outdoor & Active Events",subs:[["picnic","Picnic"],["bbq_bonfire","BBQ / Bonfire Night"],["pool_party","Pool Party"]]},
  {key:"workshops_activities",title:"Workshops & Activity-Based Events",subs:[["cooking_baking_workshop","Cooking / Baking Workshop"],["paint_and_sip","Paint and Sip"],["trivia_quiz_night","Trivia / Quiz Night"]]},
  {key:"cultural",title:"Cultural Events",subs:[["bhajan_jamming","Bhajan Jamming"],["live_music","Live Music"],["dance_performances","Dance & Performances"],["cultural_gatherings","Cultural Gatherings"]]},
  {key:"community",title:"Community Events",subs:[["lohri","Lohri"],["christmas","Christmas"],["holi","Holi"],["diwali","Diwali"],["local_celebrations","Local Celebrations"]]},
] as const;

export default function SubmitEventPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [form, setForm] = useState({ category:"home_gatherings", subcategory:"potluck_dinner", customEventType:"", title:"", venue:"", locality:"", startsAt:"", endsAt:"", ticketPrice:"0", totalCapacity:"", availableSeats:"", description:"", organizerName:"", phone:"", email:"", eventPolicies:"" });
  const activeCategory = categories.find((category) => category.key === form.category) ?? categories[0];
  function update(key: keyof typeof form, value: string) { setForm((current) => ({ ...current, [key]: value })); }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) { router.push("/account?next=/events/submit"); return; }
      const capacity = Number(form.totalCapacity);
      const seats = Number(form.availableSeats);
      if (!Number.isInteger(capacity) || capacity < 1 || !Number.isInteger(seats) || seats < 0 || seats > capacity) {
        setError("Enter a valid total capacity and available seat count. Available seats cannot exceed total capacity."); return;
      }
      let imageUrl: string | null = null;
      if (image) {
        const extension = image.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from("event-images").upload(path, image, { contentType:image.type, upsert:false });
        if (uploadError) throw uploadError;
        imageUrl = supabase.storage.from("event-images").getPublicUrl(path).data.publicUrl;
      }
      const customType = form.subcategory === "custom";
      const { error: insertError } = await supabase.from("event_submissions").insert({
        submitted_by:user.id, category:form.category, subcategory:customType ? "custom" : form.subcategory,
        custom_event_type:customType ? form.customEventType.trim() : null,
        title:form.title.trim(), venue:form.venue.trim(), locality:form.locality.trim(),
        starts_at:new Date(form.startsAt).toISOString(), ends_at:form.endsAt ? new Date(form.endsAt).toISOString() : null,
        ticket_price:Number(form.ticketPrice), total_capacity:capacity, available_seats:seats,
        description:form.description.trim(), event_policies:form.eventPolicies.trim() || null, organizer_name:form.organizerName.trim(),
        contact_phone:form.phone.trim(), contact_email:form.email.trim() || user.email || null,
        image_url:imageUrl, status:"pending",
      });
      if (insertError) throw insertError;
      router.push("/events/submitted");
    } catch (cause) {
      console.error("[events] Submission failed", { message:cause instanceof Error ? cause.message : "unknown" });
      setError("Your event could not be submitted. Please check the details and try again.");
    } finally { setBusy(false); }
  }

  return <main className="min-h-screen bg-[#f4f7fc] text-slate-900">
    <header className="bg-[#10243A] px-4 py-4 text-white"><div className="mx-auto flex max-w-3xl items-center justify-between"><Link href="/" className="font-extrabold">NAREN <span className="text-amber-400">REALTY</span></Link><div className="flex items-center gap-3"><Link href="/events/manage" className="text-sm font-semibold text-white underline">Manage My Events</Link><Link href="/events" className="text-sm font-semibold text-amber-300">← Events</Link></div></div></header>
    <section className="mx-auto max-w-3xl px-4 py-8">
      <p className="text-xs font-bold uppercase tracking-widest text-amber-700">For organisers & vendors</p><h1 className="mt-2 text-3xl font-extrabold text-[#10243A]">Post Your Event</h1>
      <p className="mt-2 text-sm text-slate-600">Submit your event details. Your event will appear in the public listing after admin approval.</p>
      <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <label className="block text-sm font-semibold">Event category<select required className={inputClass} value={form.category} onChange={(e) => { const next=categories.find((item)=>item.key===e.target.value)??categories[0]; setForm((current)=>({...current,category:next.key,subcategory:next.subs[0][0],customEventType:""})); }}>{categories.map((category)=><option key={category.key} value={category.key}>{category.title}</option>)}</select></label>
        <label className="block text-sm font-semibold">Event type<select required className={inputClass} value={form.subcategory} onChange={(e)=>update("subcategory",e.target.value)}>{activeCategory.subs.map(([key,title])=><option key={key} value={key}>{title}</option>)}<option value="custom">+ Create a new event type</option></select></label>
        {form.subcategory==="custom" && <label className="block text-sm font-semibold">Your new event type<input required minLength={3} maxLength={80} className={inputClass} value={form.customEventType} onChange={(e)=>update("customEventType",e.target.value)} placeholder="Enter new event type" /><span className="mt-1 block text-xs font-normal text-slate-500">Your new event type will be reviewed by the admin and will appear after approval.</span></label>}
        <label className="block text-sm font-semibold">Event name<input required minLength={3} maxLength={120} className={inputClass} value={form.title} onChange={(e)=>update("title",e.target.value)} placeholder="e.g. Sunday Music Meetup" /></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold">Venue<input required maxLength={180} className={inputClass} value={form.venue} onChange={(e)=>update("venue",e.target.value)} placeholder="Venue / address" /></label><label className="block text-sm font-semibold">City / locality<input required maxLength={120} className={inputClass} value={form.locality} onChange={(e)=>update("locality",e.target.value)} placeholder="e.g. Baner, Pune" /></label></div>
        <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold">Event start date & time<input required type="datetime-local" className={inputClass} value={form.startsAt} onChange={(e)=>update("startsAt",e.target.value)} /></label><label className="block text-sm font-semibold">End date & time (optional)<input type="datetime-local" min={form.startsAt || undefined} className={inputClass} value={form.endsAt} onChange={(e)=>update("endsAt",e.target.value)} /></label></div>
        <div className="rounded-xl border border-slate-200 p-4"><h2 className="font-bold text-[#10243A]">Attendee capacity</h2><p className="mt-1 text-xs text-slate-500">Enter the maximum number of attendees and the number of seats currently available.</p><div className="mt-3 grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold">Total event capacity<input required type="number" min="1" max="100000" step="1" className={inputClass} value={form.totalCapacity} onChange={(e)=>{update("totalCapacity",e.target.value);if(form.availableSeats==="")update("availableSeats",e.target.value);}} placeholder="e.g. 100" /></label><label className="block text-sm font-semibold">Available seats<input required type="number" min="0" max={form.totalCapacity || 100000} step="1" className={inputClass} value={form.availableSeats} onChange={(e)=>update("availableSeats",e.target.value)} placeholder="e.g. 75" /></label></div></div>
        <label className="block text-sm font-semibold">Ticket price (₹, 0 for free)<input required type="number" min="0" max="1000000" className={inputClass} value={form.ticketPrice} onChange={(e)=>update("ticketPrice",e.target.value)} /></label>
        <label className="block text-sm font-semibold">Event description<textarea required minLength={10} maxLength={3000} rows={4} className={inputClass} value={form.description} onChange={(e)=>update("description",e.target.value)} placeholder="Tell people what to expect..." /></label>
        <label className="block text-sm font-semibold">Event rules & policies (optional)<textarea maxLength={5000} rows={5} className={inputClass} value={form.eventPolicies} onChange={(e)=>update("eventPolicies",e.target.value)} placeholder={"Add your event rules and policies, such as:\\n• Entry and age requirements\\n• Cancellation and refund terms\\n• Late arrival and no-show rules\\n• Food, drinks and prohibited items\\n• Photography and conduct guidelines"} /><span className="mt-1 block text-xs font-normal text-slate-500">These rules will be shown with your public event listing after admin approval. You can update them later.</span></label>
        <label className="block text-sm font-semibold">Event photo / poster<input type="file" accept="image/jpeg,image/png,image/webp" className={inputClass} onChange={(e)=>{const file=e.target.files?.[0]??null;if(file&&file.size>5*1024*1024){setError("The image must be smaller than 5 MB.");e.target.value="";setImage(null);return;}setError("");setImage(file);}} /><span className="mt-1 block text-xs font-normal text-slate-500">Upload a JPG, PNG or WEBP image from your device (maximum 5 MB).</span>{image&&<span className="mt-1 block text-xs text-emerald-700">Selected: {image.name}</span>}</label>
        <div className="border-t border-slate-100 pt-4"><h2 className="font-bold text-[#10243A]">Organiser details</h2></div>
        <label className="block text-sm font-semibold">Organiser name<input required maxLength={120} className={inputClass} value={form.organizerName} onChange={(e)=>update("organizerName",e.target.value)} /></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold">Contact number<input required type="tel" minLength={8} maxLength={20} className={inputClass} value={form.phone} onChange={(e)=>update("phone",e.target.value)} /></label><label className="block text-sm font-semibold">Email (optional)<input type="email" className={inputClass} value={form.email} onChange={(e)=>update("email",e.target.value)} /></label></div>
        {error&&<p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
        <button disabled={busy} type="submit" className="min-h-12 w-full rounded-xl bg-amber-400 px-5 font-extrabold text-[#10243A] hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60">{busy?"Uploading & submitting...":"Submit for Admin Approval"}</button>
        <p className="text-xs leading-5 text-slate-500">Your event will remain pending until approved by NAREN REALTY. You can update available seats after publishing. Seats will not decrease automatically because online booking is not enabled.</p>
      </form>
    </section>
  </main>;
}
