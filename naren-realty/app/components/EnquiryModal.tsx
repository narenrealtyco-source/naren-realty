"use client";

import { useState, type FormEvent } from "react";
import { saveEnquiryLocally, type EnquiryRequirement } from "../lib/enquiries";
import { getCustomerSession } from "../lib/customers";
import { type PropertyListing } from "../lib/properties";
import { createBrokerageAcknowledgements } from "../lib/policies";

export default function EnquiryModal({
  propertyId,
  propertyName,
  locality,
  listing,
  onClose,
}: {
  propertyId: string;
  propertyName: string;
  locality: string;
  listing: PropertyListing;
  onClose: () => void;
}) {
  const [fullName, setFullName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [requirement, setRequirement] = useState<EnquiryRequirement | "">(listing.type);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!fullName.trim()) {
      setError("Enter your full name.");
      return;
    }

    const normalizedMobile = mobileNumber.trim().replace(/[\s()-]/g, "");
    const validMobile = /^(?:[6-9]\d{9}|\+91[6-9]\d{9})$/.test(normalizedMobile);
    if (!validMobile) {
      setError("Enter a valid Indian mobile number.");
      return;
    }

    try {
      const customer = await getCustomerSession();
      const customerId = customer?.id;
      const savedEnquiry = saveEnquiryLocally({
        fullName: fullName.trim(),
        mobileNumber: normalizedMobile,
        requirement,
        message: message.trim(),
        propertyName,
        locality,
        listingId: propertyId,
        customerId,
      });
      if (customerId) {
        createBrokerageAcknowledgements({ enquiryId: savedEnquiry.id, listing, customerId });
      }
      setError("");
      setSubmitted(true);
    } catch {
      setError("We could not save your enquiry. Please try again.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="property-enquiry-title" className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 bg-[#A71930] px-6 py-5 text-white sm:px-8">
          <div><p className="text-xs font-semibold tracking-[0.18em] text-white/80">NAREN REALTY</p><h2 id="property-enquiry-title" className="mt-2 text-2xl font-bold">Property Enquiry</h2></div>
          <button type="button" onClick={onClose} aria-label="Close enquiry form" className="rounded-md px-2 py-1 text-2xl leading-none text-white/80 hover:bg-white/10">&times;</button>
        </div>
        <div className="px-6 py-6 sm:px-8">
          <div className="mb-6 border-l-4 border-amber-400 bg-slate-50 px-4 py-3"><p className="font-semibold text-[#A71930]">{propertyName}</p><p className="mt-1 text-sm text-slate-600">{locality}, Pune</p></div>
          {submitted ? <div role="status" className="py-4"><p className="text-lg font-bold text-[#A71930]">Thank you</p><p className="mt-2 leading-6 text-slate-600">Your enquiry has been submitted. Naren Realty team will contact you shortly.</p><button type="button" onClick={onClose} className="mt-6 w-full rounded-lg bg-[#A71930] px-5 py-3 font-semibold text-white">Close</button></div> : <form onSubmit={submit}>
            <label htmlFor="owner-property-customer-name" className="mb-1.5 block text-sm font-semibold text-slate-800">Customer Full Name <span className="text-rose-700">*</span></label>
            <input id="owner-property-customer-name" required autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} className="mb-4 w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-[#A71930]" />
            <label htmlFor="owner-property-customer-mobile" className="mb-1.5 block text-sm font-semibold text-slate-800">Mobile Number <span className="text-rose-700">*</span></label>
            <input id="owner-property-customer-mobile" required type="tel" inputMode="tel" autoComplete="tel-national" placeholder="10-digit Indian mobile number" value={mobileNumber} onChange={(event) => setMobileNumber(event.target.value)} className="mb-4 w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-[#A71930]" />
            <label htmlFor="owner-property-requirement" className="mb-1.5 block text-sm font-semibold text-slate-800">Requirement</label>
            <select id="owner-property-requirement" value={requirement} onChange={(event) => setRequirement(event.target.value as EnquiryRequirement | "")} className="mb-4 w-full rounded-lg border border-slate-300 bg-white px-4 py-3"><option value="">Select requirement</option><option value="Rental">Rental</option><option value="Resale">Resale</option><option value="PG">PG</option><option value="Airbnb">Airbnb</option></select>
            <label htmlFor="owner-property-message" className="mb-1.5 block text-sm font-semibold text-slate-800">Message <span className="font-normal text-slate-500">(optional)</span></label>
            <textarea id="owner-property-message" rows={3} value={message} onChange={(event) => setMessage(event.target.value)} className="w-full resize-y rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-[#A71930]" />
            {error && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
            <button type="submit" className="mt-5 w-full rounded-lg bg-[#A71930] px-5 py-3 font-semibold text-white hover:bg-slate-700">Submit Enquiry</button>
          </form>}
        </div>
      </section>
    </div>
  );
}
