"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestHomeService, type ServiceState } from "./actions";

const initial: ServiceState = { status: "idle", message: "" };
const input = "mt-2 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-4 py-3 text-base";

export default function ServiceEnquiryForm({ service, ready }: { service: string; ready: boolean }) {
  const [state, action, pending] = useActionState(requestHomeService, initial);
  return <form action={action} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
    <h2 className="text-xl font-bold text-[#10243A]">Send an enquiry</h2>
    <input type="hidden" name="service" value={service} />
    <label className="block text-sm font-semibold">Your name<input className={input} name="name" autoComplete="name" maxLength={120} required /></label>
    <label className="block text-sm font-semibold">Mobile number<input className={input} name="mobile" type="tel" autoComplete="tel" required /></label>
    <label className="block text-sm font-semibold">Your locality<input className={input} name="locality" maxLength={120} placeholder="e.g. Wakad, Baner" required /></label>
    <label className="block text-sm font-semibold">Your requirements<textarea className={input} name="requirement" rows={4} maxLength={2000} required /></label>
    <label className="block text-sm font-semibold">Preferred contact time <span className="font-normal">(optional)</span><input className={input} name="preferred_time" maxLength={120} /></label>
    <label className="flex items-start gap-2 text-sm text-slate-600"><input type="checkbox" name="contact_consent" value="yes" required className="mt-1 accent-[#10243A]" /><span>I agree that NAREN REALTY may contact me about this service request and coordinate suitable service options.</span></label>
    <p className="text-sm text-slate-600">A customer account is required. <Link href="/account#login" className="underline">Sign in</Link></p>
    {!ready && <p role="status" className="text-sm text-amber-900">Service enquiries are not available yet. Nothing will be saved.</p>}
    {state.message && <p role={state.status === "error" ? "alert" : "status"} className="text-sm">{state.message}</p>}
    <button disabled={!ready || pending} className="min-h-11 w-full rounded-lg bg-[#10243A] px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{pending ? "Sending..." : "Send enquiry"}</button>
  </form>;
}
