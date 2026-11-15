"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { enquireVendor, type VendorState } from "./vendor-actions";
import LocalityAutocomplete from "../components/LocalityAutocomplete";
const initial: VendorState = { status: "idle", message: "" };
const input = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-emerald-600";
export function VendorEnquiryFlow({ vendorId, initialLocality }: { vendorId: string; initialLocality: string }) {
  const [state, action, pending] = useActionState(enquireVendor, initial);
  const [locality, setLocality] = useState(initialLocality);
  return <form action={action} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <h2 className="text-xl font-bold text-[#10243A]">Send request to this provider</h2>
    <input type="hidden" name="vendor_id" value={vendorId}/>
    <label className="block text-sm font-semibold">Your name<input name="customer_name" className={input} maxLength={120} autoComplete="name" required/></label>
    <label className="block text-sm font-semibold">Mobile number<input name="mobile" className={input} type="tel" maxLength={13} autoComplete="tel" required/></label>
    <label className="block text-sm font-semibold">Your locality<LocalityAutocomplete name="locality" className={input} maxLength={120} value={locality} onChange={e=>setLocality(e.target.value)} required/></label>
    <label className="block text-sm font-semibold">Full service address<textarea name="full_address" className={input} rows={2} maxLength={500} required/></label>
    <label className="block text-sm font-semibold">Requirement<textarea name="message" className={input} rows={4} maxLength={2000} required/></label>
    <label className="flex items-start gap-2 text-xs leading-5 text-slate-600"><input type="checkbox" name="contact_consent" required className="mt-1"/> I agree that NAREN REALTY may share my name, mobile number, address and requirement with this selected provider so they can respond.</label>
    {state.message && <p role={state.status==="error"?"alert":"status"} className="text-sm text-slate-700">{state.message}</p>}
    {state.enquiryId && <Link className="inline-flex rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white" href={`/home-services/request/${state.enquiryId}`}>Track response · 60 seconds</Link>}
    <button disabled={pending || state.status==="success"} className="w-full rounded-xl bg-[#10243A] px-4 py-3 font-semibold text-white disabled:opacity-50">{pending?"Sending request…":"Send request to selected provider"}</button>
  </form>;
}
