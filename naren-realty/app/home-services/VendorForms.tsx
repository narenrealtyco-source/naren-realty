"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import LocalityAutocomplete from "../components/LocalityAutocomplete";
import type { MarketplaceCategory } from "../lib/vendor-marketplace";
import { applyAsVendor, enquireVendor, type VendorState } from "./vendor-actions";

const initial: VendorState = { status: "idle", message: "" };
const input = "mt-2 w-full min-w-0 rounded-xl border border-[#D9DDE3] bg-[#FCFCFD] px-4 py-3.5 text-sm text-[#182B40] outline-none transition placeholder:text-[#98A2AE] focus:border-[#B9955B] focus:bg-white focus:ring-4 focus:ring-[#B9955B]/10";
const label = "block text-sm font-semibold tracking-[0.01em] text-[#26394D]";
const button = "min-h-12 w-full rounded-xl bg-[#10243A] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:bg-[#1a3552] disabled:cursor-not-allowed disabled:opacity-50";
const serviceCatalog: Record<string, string[]> = {
  plumbing: ["Tap and faucet repair", "Pipe leakage repair", "Bathroom fitting", "Drain and blockage cleaning", "Water tank cleaning", "Water pump repair", "Geyser installation and repair"],
  electrical: ["Wiring and rewiring", "Switch and socket repair", "Fan and light installation", "MCB and distribution board", "Inverter installation", "Electrical fault finding"],
  cleaning: ["Home deep cleaning", "Bathroom cleaning", "Kitchen cleaning", "Sofa and carpet cleaning", "Move-in / move-out cleaning", "Water tank cleaning"],
  painting: ["Interior painting", "Exterior painting", "Waterproofing", "Texture painting", "Wall putty and polishing"],
  carpentry: ["Furniture repair", "Door and lock repair", "Modular furniture", "Wardrobe installation", "Curtain and blind fitting"],
  appliance: ["AC installation", "AC servicing and repair", "Refrigerator repair", "Washing machine repair", "RO service", "TV repair"],
  pest: ["General pest control", "Cockroach treatment", "Termite treatment", "Mosquito control", "Rodent control"],
  packers: ["House shifting", "Office shifting", "Packing and unpacking", "Loading and unloading", "Furniture dismantling / assembly"],
  security: ["CCTV installation", "Video door phone", "Smart lock installation", "Alarm system installation"],
  default: ["Installation", "Repair and maintenance", "Inspection / consultation", "Cleaning / servicing", "Emergency service", "Annual maintenance contract"],
};
function servicesFor(categoryName: string) {
  const key = categoryName.toLowerCase();
  const match = Object.keys(serviceCatalog).find((item) => item !== "default" && key.includes(item));
  return serviceCatalog[match ?? "default"];
}

export function VendorApplicationForm({ categories, ready }: { categories: MarketplaceCategory[]; ready: boolean }) {
  const [state, action, pending] = useActionState(applyAsVendor, initial);
  const [categoryId, setCategoryId] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [otherService, setOtherService] = useState("");
  const [locality, setLocality] = useState("");
  const activeCategory = categories.find((category) => category.id === categoryId);
  const serviceOptions = useMemo(() => servicesFor(activeCategory?.name ?? ""), [activeCategory?.name]);
  const servicesValue = [...selectedServices, ...(otherService.trim() ? [otherService.trim()] : [])].join(", ");

  function toggleService(service: string) {
    setSelectedServices((current) => current.includes(service) ? current.filter((item) => item !== service) : [...current, service]);
  }

  return <form action={action} className="overflow-hidden rounded-[28px] border border-[#E8E1D6] bg-white shadow-[0_24px_70px_-38px_rgba(16,36,58,0.42)]">
    <div className="bg-gradient-to-br from-[#10243A] via-[#17334D] to-[#244A63] px-5 py-7 text-white sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#C9A96E]">NAREN REALTY  |  SERVICE PARTNER REGISTRATION</p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Register Your Business</h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-200">Join the NAREN REALTY service network. Submit your business information and select the services you provide.</p>
      <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-100">
        <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5">VERIFIED PARTNERS</span>
        <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5">LOCAL SERVICE NETWORK</span>
        <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5">PRIVACY PROTECTED</span>
      </div>
    </div>

    <div className="space-y-7 p-5 sm:p-8">
      <section>
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F3EBDD] text-sm font-bold text-[#9A7744]">01</span>
          <div><h3 className="font-bold text-[#10243A]">Business Information</h3><p className="text-xs text-slate-500">Tell us about your business and primary contact.</p></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={label}>Vendor Name<input name="public_name" className={input} maxLength={120} placeholder="e.g. Rahul Sharma" required /><span className="mt-1 block text-xs font-normal text-slate-500">This name will appear on your public vendor profile.</span></label>
          <label className={label}>Business / Shop Name<input name="business_name" className={input} maxLength={120} placeholder="e.g. Sharma Plumbing Services" required /></label>
          <label className={label}>Primary Contact Person<input name="contact_person" className={input} maxLength={120} autoComplete="name" placeholder="Person we should contact" required /></label>
          <label className={label}>Business Contact Number<input name="mobile" className={input} type="tel" autoComplete="tel" maxLength={13} placeholder="10-digit mobile number" required /></label>
          <label className={label}>Email <span className="font-normal text-slate-400">(optional)</span><input name="email" className={input} type="email" autoComplete="email" maxLength={254} placeholder="you@example.com" /></label>
          <div><label className={label}>Operating City<input name="city" className={input} maxLength={100} defaultValue="Pune" required /></label></div>
        </div>
      </section>

      <section className="border-t border-slate-100 pt-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F5F0E7] text-sm font-bold text-[#8A6A37]">02</span>
          <div><h3 className="font-bold text-[#10243A]">Services & Specialisations</h3><p className="text-xs text-slate-500">Choose your primary category and the services you offer.</p></div>
        </div>
        <label className={label}>Primary Service Category<select name="category_id" className={input} required value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setSelectedServices([]); setOtherService(""); }}><option value="" disabled>Select a category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        {activeCategory ? <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <p className="mb-3 text-sm font-semibold text-slate-700">Services Offered <span className="font-normal text-slate-500">(Select all that apply)</span></p>
          <div className="grid gap-2 sm:grid-cols-2">
            {serviceOptions.map((service) => <label key={service} className={`flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition ${selectedServices.includes(service) ? "border-[#B9955B] bg-[#FBF8F2] text-[#10243A]" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}>
              <input type="checkbox" checked={selectedServices.includes(service)} onChange={() => toggleService(service)} className="mt-0.5 accent-[#10243A]" />
              <span>{service}</span>
            </label>)}
          </div>
          <label className={`${label} mt-4`}>Additional Service <span className="font-normal text-slate-400">(optional)</span><input value={otherService} onChange={(event) => setOtherService(event.target.value)} className={input} maxLength={200} placeholder="Enter another service" /></label>
          <input type="hidden" name="services" value={servicesValue} />
          <p className="mt-2 text-xs text-slate-500">{selectedServices.length + (otherService.trim() ? 1 : 0)} service(s) selected</p>
        </div> : <p className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">Choose a category to see relevant services.</p>}
        <label className={`${label} mt-4`}>Business Overview<textarea name="description" className={input} maxLength={2000} rows={4} placeholder="Describe your experience, specialisations, operating hours and service coverage." required /></label>
      </section>

      <section className="border-t border-slate-100 pt-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F5F0E7] text-sm font-bold text-[#8A6A37]">03</span>
          <div><h3 className="font-bold text-[#10243A]">Service Area</h3><p className="text-xs text-slate-500">Set the area where you provide services.</p></div>
        </div>
        <label className={label}>Locality<LocalityAutocomplete name="locality" className={input} maxLength={100} placeholder="Search locality, e.g. Baner or Wakad" value={locality} onChange={(event) => setLocality(event.target.value)} required />
        <input type="hidden" name="address" value={locality} /></label>
        <p className="mt-2 rounded-xl bg-[#F8F6F1] px-4 py-3 text-xs leading-5 text-slate-600"><strong className="text-[#10243A]">Public Listing:</strong> Only your locality will be displayed to customers. Your full street address is not requested or shown.</p>
      </section>

      <section className="border-t border-slate-100 pt-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F5F0E7] text-sm font-bold text-[#8A6A37]">04</span>
          <div><h3 className="font-bold text-[#10243A]">Partnership Information</h3><p className="text-xs text-slate-500">Optional commercial terms for review by NAREN REALTY.</p></div>
        </div>
        <label className={label}>Proposed Commission / Partnership Terms <span className="font-normal text-slate-400">(optional)</span><textarea name="commission_terms" className={input} maxLength={1000} rows={3} placeholder="Enter your proposed commission or partnership terms." /></label>
      </section>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-[#10243A]">Application Review Process</p>
        <p className="mt-1 text-xs leading-5 text-slate-600">Our team will review your application and verify your business details. Approved partners will be listed on the NAREN REALTY platform.</p>
        <p className="mt-3 text-xs text-slate-500">Portfolio uploads are not currently available. Customer account sign-in: <Link className="font-semibold text-[#10243A] underline underline-offset-2" href="/account#login">Sign in</Link></p>
      </div>
      {!ready && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Online applications are temporarily unavailable while the secure vendor database is being configured. Your information will not be submitted or stored.</p>}
      {state.message && <p role={state.status === "error" ? "alert" : "status"} className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">{state.message}</p>}
      <button disabled={!ready || pending || state.status === "success" || !servicesValue.trim() || !locality.trim()} className={button}>{pending ? "Submitting application..." : "Submit Application"}</button>
      <p className="text-center text-[11px] text-slate-400">By submitting this form, you authorise NAREN REALTY to contact you for business verification and onboarding.</p>
    </div>
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
