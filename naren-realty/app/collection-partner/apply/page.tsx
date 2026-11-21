"use client";

import { useState, type FormEvent } from "react";

export default function CollectionPartnerApplyPage() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());
    body.service_areas = String(body.service_areas || "").split(",").map((v) => v.trim()).filter(Boolean).join(",");
    try {
      const response = await fetch("/api/collection-partner/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Application could not be submitted.");
      setMessage(result.email_sent ? "Confirmation email sent. Our team will review your details and contact you." : result.message || "Your application has been received.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
      <section className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-bold tracking-[0.2em] text-teal-700">MFIT HEALTHCARE</p>
        <h1 className="mt-2 text-2xl font-extrabold">Become a Collection Partner</h1>
        {done ? (
          <div className="mt-6 rounded-xl bg-teal-50 p-5">
            <h2 className="font-bold text-teal-900">Application submitted successfully</h2>
            <p className="mt-2 text-sm text-teal-800">{message}</p>
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm text-slate-600">Apply to join the MFIT Healthcare sample collection partner network. Login access is issued only after verification and approval.</p>
            <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-medium sm:col-span-2">Contact person full name<input required name="contact_name" autoComplete="name" className="rounded-lg border p-3 font-normal" /></label>
              <label className="grid gap-1 text-sm font-medium">Mobile number<input required name="phone" inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength={10} placeholder="10-digit mobile" className="rounded-lg border p-3 font-normal" /></label>
              <label className="grid gap-1 text-sm font-medium">Email address<input required name="email" type="email" autoComplete="email" className="rounded-lg border p-3 font-normal" /></label>
              <label className="grid gap-1 text-sm font-medium sm:col-span-2">Full address<textarea required name="address" minLength={8} autoComplete="street-address" className="rounded-lg border p-3 font-normal" /></label>
              <label className="grid gap-1 text-sm font-medium sm:col-span-2">Service areas (comma-separated)<input required name="service_areas" placeholder="Wakad, Hinjewadi, Baner" className="rounded-lg border p-3 font-normal" /><span className="text-xs font-normal text-slate-500">Enter all localities or cities where you can collect samples.</span></label>
              <label className="grid gap-1 text-sm font-medium">GSTIN (if applicable)<input name="gstin" className="rounded-lg border p-3 font-normal" /></label>
              <label className="grid gap-1 text-sm font-medium">PAN (optional)<input name="pan" className="rounded-lg border p-3 font-normal" /></label>
              <label className="grid gap-1 text-sm font-medium sm:col-span-2">Experience / additional information<textarea name="notes" className="rounded-lg border p-3 font-normal" /></label>
              {error && <p role="alert" className="text-sm text-rose-700 sm:col-span-2">{error}</p>}
              <button disabled={busy} className="rounded-lg bg-teal-700 p-3 font-bold text-white disabled:opacity-60 sm:col-span-2">{busy ? "Submitting…" : "Submit application"}</button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
