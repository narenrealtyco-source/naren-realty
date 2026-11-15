"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { MarketplaceCategory } from "../lib/vendor-marketplace";
import { applyAsVendor, enquireVendor, type VendorState } from "./vendor-actions";

const initial: VendorState = { status: "idle", message: "" };
const input = "mt-2 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-3 text-base";
const label = "block text-sm font-semibold";
const button = "min-h-11 w-full rounded-lg bg-[#10243A] px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50";

export function VendorApplicationForm({ categories, ready }: { categories: MarketplaceCategory[]; ready: boolean }) {
  const [state, action, pending] = useActionState(applyAsVendor, initial);
  return <form action={action} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
    <h2 className="text-xl font-bold text-[#10243A]">Apply as a service provider</h2>
    <p className="text-sm text-slate-600">Applications are reviewed by Naren Realty. Contact details and commission terms are not public.</p>
    <label className={label}>Business name<input name="business_name" className={input} maxLength={120} required /></label>
    <label className={label}>Public provider name<input name="public_name" className={input} maxLength={120} required /><span className="mt-1 block font-normal text-slate-600">Shown publicly if your application is approved.</span></label>
    <label className={label}>Contact person<input name="contact_person" className={input} maxLength={120} autoComplete="name" required /></label>
    <label className={label}>Mobile<input name="mobile" className={input} type="tel" autoComplete="tel" maxLength={13} required /></label>
    <label className={label}>Email (optional)<input name="email" className={input} type="email" autoComplete="email" maxLength={254} /></label>
    <label className={label}>Category<select name="category_id" className={input} required defaultValue=""><option value="" disabled>Choose a category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
    <label className={label}>Services offered<input name="services" className={input} maxLength={500} required /></label>
    <label className={label}>Description<textarea name="description" className={input} maxLength={2000} rows={4} required /></label>
    <label className={label}>City<input name="city" className={input} maxLength={100} required /></label>
    <label className={label}>Locality<input name="locality" className={input} maxLength={100} required /></label>
    <label className={label}>Business address<input name="address" className={input} maxLength={500} required /></label>
    <label className={label}>Proposed commission arrangement (optional)<textarea name="commission_terms" className={input} maxLength={1000} rows={3} /></label>
    <p className="text-sm text-slate-600">Portfolio uploads are not available yet. A customer account is required. <Link className="underline" href="/account#login">Sign in</Link></p>
    {!ready && <p role="status" className="text-sm text-amber-900">Applications are unavailable while secure database setup is pending. Nothing will be saved.</p>}
    {state.message && <p role={state.status === "error" ? "alert" : "status"} className="text-sm">{state.message}</p>}
    <button disabled={!ready || pending || state.status === "success"} className={button}>{pending ? "Sending..." : "Submit application"}</button>
  </form>;
}

export function VendorEnquiryForm({ vendorId, ready }: { vendorId: string; ready: boolean }) {
  const [state, action, pending] = useActionState(enquireVendor, initial);
  return <form action={action} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
    <h2 className="text-xl font-bold text-[#10243A]">Enquire about this provider</h2>
    <input type="hidden" name="vendor_id" value={vendorId} />
    <label className={label}>Your name<input name="customer_name" className={input} maxLength={120} autoComplete="name" required /></label>
    <label className={label}>Mobile<input name="mobile" className={input} type="tel" maxLength={13} autoComplete="tel" required /></label>
    <label className={label}>Your requirements<textarea name="message" className={input} maxLength={2000} rows={4} required /></label>
    <p className="text-sm text-slate-600">A customer account is required. <Link href="/account#login" className="underline">Sign in</Link></p>
    {state.message && <p role={state.status === "error" ? "alert" : "status"}>{state.message}</p>}
    <button disabled={!ready || pending || state.status === "success"} className={button}>{pending ? "Sending..." : "Send enquiry"}</button>
  </form>;
}
