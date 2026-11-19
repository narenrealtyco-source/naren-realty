"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const inputClass = "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100";

export default function SubmitEventPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ category: "meetups", title: "", venue: "", locality: "", startsAt: "", ticketPrice: "0", description: "", organizerName: "", phone: "", email: "", imageUrl: "" });

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.push("/account?next=/events/submit");
        return;
      }
      const { error: insertError } = await supabase.from("event_submissions").insert({
        submitted_by: user.id,
        category: form.category,
        title: form.title.trim(),
        venue: form.venue.trim(),
        locality: form.locality.trim(),
        starts_at: new Date(form.startsAt).toISOString(),
        ticket_price: Number(form.ticketPrice),
        description: form.description.trim(),
        organizer_name: form.organizerName.trim(),
        contact_phone: form.phone.trim(),
        contact_email: form.email.trim() || user.email || null,
        image_url: form.imageUrl.trim() || null,
        status: "pending",
      });
      if (insertError) throw insertError;
      router.push("/events/submitted");
    } catch (cause) {
      console.error("[events] Submission failed", { message: cause instanceof Error ? cause.message : "unknown" });
      setError("Event submit nahi ho paya. Please details check karke dobara try karein.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f7fc] text-slate-900">
      <header className="bg-[#10243A] px-4 py-4 text-white"><div className="mx-auto flex max-w-3xl items-center justify-between"><Link href="/" className="font-extrabold">NAREN <span className="text-amber-400">REALTY</span></Link><Link href="/events" className="text-sm font-semibold text-amber-300">← Events</Link></div></header>
      <section className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-xs font-bold uppercase tracking-widest text-amber-700">For organisers & vendors</p>
        <h1 className="mt-2 text-3xl font-extrabold text-[#10243A]">Post Your Event</h1>
        <p className="mt-2 text-sm text-slate-600">Event details submit karein. NAREN REALTY admin review aur approval ke baad event public listing mein dikhega.</p>
        <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
          <label className="block text-sm font-semibold">Event category<select required className={inputClass} value={form.category} onChange={(e) => update("category", e.target.value)}><option value="meetups">Meetups</option><option value="party">Party</option><option value="cultural">Cultural Events</option><option value="community">Community Events</option></select></label>
          <label className="block text-sm font-semibold">Event name<input required minLength={3} maxLength={120} className={inputClass} value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="e.g. Sunday Music Meetup" /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold">Venue<input required maxLength={180} className={inputClass} value={form.venue} onChange={(e) => update("venue", e.target.value)} placeholder="Venue / address" /></label>
            <label className="block text-sm font-semibold">City / locality<input required maxLength={120} className={inputClass} value={form.locality} onChange={(e) => update("locality", e.target.value)} placeholder="e.g. Baner, Pune" /></label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold">Event date & time<input required type="datetime-local" min={new Date().toISOString().slice(0,16)} className={inputClass} value={form.startsAt} onChange={(e) => update("startsAt", e.target.value)} /></label>
            <label className="block text-sm font-semibold">Ticket price (₹, 0 for free)<input required type="number" min="0" max="1000000" className={inputClass} value={form.ticketPrice} onChange={(e) => update("ticketPrice", e.target.value)} /></label>
          </div>
          <label className="block text-sm font-semibold">Event description<textarea required minLength={10} maxLength={3000} rows={4} className={inputClass} value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Tell people what to expect..." /></label>
          <div className="border-t border-slate-100 pt-4"><h2 className="font-bold text-[#10243A]">Organiser details</h2></div>
          <label className="block text-sm font-semibold">Organiser name<input required maxLength={120} className={inputClass} value={form.organizerName} onChange={(e) => update("organizerName", e.target.value)} /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold">Contact number<input required type="tel" minLength={8} maxLength={20} className={inputClass} value={form.phone} onChange={(e) => update("phone", e.target.value)} /></label>
            <label className="block text-sm font-semibold">Email (optional)<input type="email" className={inputClass} value={form.email} onChange={(e) => update("email", e.target.value)} /></label>
          </div>
          <label className="block text-sm font-semibold">Event image URL (optional)<input type="url" className={inputClass} value={form.imageUrl} onChange={(e) => update("imageUrl", e.target.value)} placeholder="https://..." /></label>
          {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
          <button disabled={busy} type="submit" className="min-h-12 w-full rounded-xl bg-amber-400 px-5 font-extrabold text-[#10243A] hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60">{busy ? "Submitting..." : "Submit for Admin Approval"}</button>
          <p className="text-xs leading-5 text-slate-500">Submitting an event does not publish it automatically. It will remain pending until approved by NAREN REALTY.</p>
        </form>
      </section>
    </main>
  );
}
