"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "../../lib/supabase-browser";
const supabase = createSupabaseBrowserClient();

const field = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900";

export default function EventOrganiserPaymentPanel({eventId,eventTitle,initialUpi,initialPayee}:{eventId:string;eventTitle:string;initialUpi:string|null;initialPayee:string|null}) {
  const [upi,setUpi]=useState(initialUpi??"");
  const [payee,setPayee]=useState(initialPayee??"");
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState("");
  useEffect(()=>{setUpi(initialUpi??"");setPayee(initialPayee??"");},[eventId,initialUpi,initialPayee]);

  async function save(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    setSaving(true);setMessage("");
    const {error}=await supabase.rpc("update_own_event_payment_details",{p_event_id:eventId,p_organiser_upi_id:upi.trim(),p_organiser_payee_name:payee.trim()||null,p_organiser_qr_image_url:null});
    if(error)setMessage(error.message==="Enter a valid UPI ID"?"Enter a valid UPI ID (example: name@okaxis).":"Payment details could not be saved. Please check the UPI ID and try again.");
    else setMessage("Payment details saved. They will appear publicly only after admin approval of the event.");
    setSaving(false);
  }

  return <form id="payment-settings" onSubmit={save} className="mt-5 scroll-mt-6 rounded-xl border border-slate-200 p-4">
    <div><h3 className="font-bold text-[#10243A]">Attendee Payment Settings</h3><p className="mt-1 text-xs text-slate-600">Add the UPI account where attendees should pay for {eventTitle}. These are your own payment details, separate from NAREN REALTY's 10% commission UPI.</p></div>
    <label className="mt-4 block text-sm font-semibold">Organiser UPI ID<input required maxLength={255} className={field} value={upi} onChange={e=>setUpi(e.target.value)} placeholder="name@okaxis"/></label>
    <label className="mt-3 block text-sm font-semibold">UPI Payee Name (optional)<input maxLength={120} className={field} value={payee} onChange={e=>setPayee(e.target.value)} placeholder="Name shown in UPI app"/></label>
    <p className="mt-3 rounded-lg bg-blue-50 p-3 text-xs leading-5 text-blue-800">Attendees will pay using the UPI app buttons on checkout. No QR upload is required.</p>
    <button disabled={saving} className="mt-4 min-h-10 rounded-lg bg-[#10243A] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving?"Saving...":"Save payment details"}</button>
    {message&&<p role="status" className="mt-3 text-sm text-slate-700">{message}</p>}
  </form>;
}
