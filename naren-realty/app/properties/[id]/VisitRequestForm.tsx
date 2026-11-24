"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { POLICY_DOCUMENTS } from "../../lib/policies";
import { requestVisit, type VisitResult } from "../visit-actions";
import { indiaCalendarDate } from "../../lib/property-marketing";
import { visitSlots } from "../../lib/visit-requests";

const initial: VisitResult = { status: "idle", message: "" };
const input = "mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 focus:border-amber-500";

export default function VisitRequestForm({ propertyId, title, onClose }: { propertyId: string; title: string; onClose: () => void }) {
  const [state, action, pending] = useActionState(requestVisit, initial);
  const [slot, setSlot] = useState("");
  useEffect(() => {
    function dismiss(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) onClose();
    }
    document.addEventListener("keydown", dismiss);
    return () => document.removeEventListener("keydown", dismiss);
  }, [onClose, pending]);
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="visit-heading" className="max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
      <div className="flex items-start justify-between gap-4 bg-[#10243A] p-6 text-white">
        <div className="min-w-0"><p className="text-xs font-bold tracking-widest text-amber-400">NAREN REALTY</p><h2 id="visit-heading" className="mt-2 text-2xl font-bold">Plan your visit</h2><p className="mt-1 break-words text-sm text-slate-200">{title}</p></div>
        <button type="button" onClick={onClose} disabled={pending} aria-label="Close visit request" className="flex size-11 shrink-0 items-center justify-center rounded-md text-2xl hover:bg-white/10">&times;</button>
      </div>
      {state.status === "success" ? <div role="status" className="p-6"><h3 className="text-xl font-bold text-[#10243A]">Request received</h3><p className="mt-3 text-slate-700">{state.message}</p><button type="button" onClick={onClose} className="mt-6 rounded-lg bg-[#10243A] px-5 py-3 font-semibold text-white">Done</button></div> :
      <form action={action} className="space-y-5 p-6">
        <input type="hidden" name="property_id" value={propertyId} />
        <p className="text-sm text-slate-600">Choose a preferred date and time. Our team will check availability and confirm; submitting does not book a slot.</p>
        <label className="block text-sm font-semibold">Visit date<input className={input} name="date" type="date" min={indiaCalendarDate()} required /></label>
        <fieldset><legend className="text-sm font-semibold">Preferred time <span className="font-normal text-slate-500">(subject to confirmation)</span></legend>
          <div className="mt-2 grid grid-cols-2 gap-2 min-[375px]:grid-cols-3 sm:grid-cols-4">{visitSlots.map((time) => <label key={time} className={`flex min-h-11 cursor-pointer items-center justify-center rounded-lg border px-2 py-2 text-center text-sm font-semibold ${slot === time ? "border-[#10243A] bg-[#10243A] text-white" : "border-slate-300 text-slate-800"}`}><input className="sr-only" type="radio" name="time" value={time} required checked={slot === time} onChange={() => setSlot(time)} />{time}</label>)}</div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Your name<input className={input} name="name" autoComplete="name" maxLength={120} required /></label><label className="text-sm font-semibold">Mobile number<input className={input} name="mobile" type="tel" autoComplete="tel" required /></label></div>
        <label className="block text-sm font-semibold">Message <span className="font-normal text-slate-500">(optional)</span><textarea name="message" rows={3} maxLength={1000} className={input} /></label>
        <label className="flex items-start gap-3 text-sm leading-6 text-slate-700">
          <input type="checkbox" name="policy_acknowledged" value="on" required className="mt-1 size-4 shrink-0 accent-amber-500" />
          <span>I have read and agree to the <Link href="/site-visit-policy" target="_blank" className="font-semibold underline">Enquiry & Site Visit Policy</Link>, <Link href="/customer-terms" target="_blank" className="font-semibold underline">Customer Terms</Link> and <Link href="/privacy-policy" target="_blank" className="font-semibold underline">Privacy Policy</Link>. I understand this is only a visit request, not a confirmed appointment or property reservation.
            <span className="block text-xs text-slate-500">Current versions: Site Visit {POLICY_DOCUMENTS.find((item) => item.type === "site_visit_policy")?.version}, Customer Terms {POLICY_DOCUMENTS.find((item) => item.type === "customer_terms")?.version}, Privacy {POLICY_DOCUMENTS.find((item) => item.type === "privacy_policy")?.version}</span>
          </span>
        </label>
        <p className="text-sm text-slate-600">A customer account is required. <Link className="underline" href="/account#login">Sign in</Link></p>
        {state.status === "error" && <p role="alert" className="text-sm text-rose-700">{state.message}</p>}
        <button disabled={pending} className="w-full rounded-lg bg-amber-400 px-5 py-3 font-bold text-slate-950 disabled:opacity-50">{pending ? "Sending request..." : "Confirm Visit Request"}</button>
      </form>}
    </section>
  </div>;
}
