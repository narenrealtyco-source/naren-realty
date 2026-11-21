"use client";

import { useState, type FormEvent } from "react";

export default function ApplyPartner() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());

    try {
      const response = await fetch("/api/collection-partner/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Application could not be submitted.");
      setConfirmation(
        result.email_sent
          ? "A confirmation email has been sent. Our team will review your details and contact you."
          : result.message || "Your application was received. Our team will review your details and contact you."
      );
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-900">
      <section className="mx-auto max-w-2xl rounded-2xl border bg-white p-6">
        <p className="text-xs font-bold tracking-widest text-teal-700">MFIT HEALTHCARE</p>
        <h1 className="mt-2 text-2xl font-extrabold">Become a Collection Partner</h1>
        {done ? (
          <div className="mt-6 rounded-xl bg-teal-50 p-5">
            <h2 className="font-bold">Application submitted successfully</h2>
            <p className="mt-2 text-sm">{confirmation}</p>
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm text-slate-600">
              Apply to join the independent sample collection partner network. Login access is issued only after verification and approval.
            </p>
            <form onSubmit={submit} className="mt-6 grid gap-3 sm:grid-cols-2">
              <input required name="business_name" placeholder="Business / centre name" className="rounded-lg border p-3 text-sm" />
              <input required name="contact_name" placeholder="Contact person full name" className="rounded-lg border p-3 text-sm" />
              <input required name="phone" inputMode="numeric" pattern="[6-9][0-9]{9}" placeholder="10-digit mobile number" className="rounded-lg border p-3 text-sm" />
              <input required name="email" type="email" placeholder="Email address" className="rounded-lg border p-3 text-sm" />
              <input required name="address" placeholder="Business address" className="rounded-lg border p-3 text-sm sm:col-span-2" />
              <input required name="service_areas" placeholder="Service areas (comma separated)" className="rounded-lg border p-3 text-sm sm:col-span-2" />
              <input name="gstin" placeholder="GSTIN (if applicable)" className="rounded-lg border p-3 text-sm" />
              <input name="pan" placeholder="PAN (optional)" className="rounded-lg border p-3 text-sm" />
              <textarea name="notes" placeholder="Experience / additional information (optional)" className="min-h-24 rounded-lg border p-3 text-sm sm:col-span-2" />
              {error && <p className="text-sm text-rose-700 sm:col-span-2">{error}</p>}
              <button disabled={busy} className="rounded-lg bg-teal-700 p-3 font-bold text-white sm:col-span-2">
                {busy ? "Submitting…" : "Submit application"}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}