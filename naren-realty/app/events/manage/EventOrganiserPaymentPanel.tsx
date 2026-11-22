"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { supabase } from "../../lib/supabase";

const field = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900";

export default function EventOrganiserPaymentPanel({eventId,eventTitle,initialUpi,initialPayee,initialQr}:{eventId:string;eventTitle:string;initialUpi:string|null;initialPayee:string|null;initialQr:string|null}) {
  const [upi,setUpi]=useState(initialUpi??"");
  const [payee,setPayee]=useState(initialPayee??"");
  const [qr,setQr]=useState(initialQr??"");
  const [uploading,setUploading]=useState(false);
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState("");
  useEffect(()=>{setUpi(initialUpi??"");setPayee(initialPayee??"");setQr(initialQr??"");},[eventId,initialUpi,initialPayee,initialQr]);

  async function uploadQr(e:ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0];
    if(!file)return;
    if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>5*1024*1024){setMessage("Upload a JPG, PNG or WEBP image up to 5 MB.");e.target.value="";return;}
    setUploading(true);setMessage("");
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){setMessage("Please sign in again.");setUploading(false);return;}
    const ext=file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg";
    const path=user.id+"/payment-qr/"+eventId+"-"+crypto.randomUUID()+"."+ext;
    const {error}=await supabase.storage.from("event-images").upload(path,file,{contentType:file.type,upsert:false});
    if(error){setMessage("QR upload failed. Please try again.");setUploading(false);return;}
    setQr(supabase.storage.from("event-images").getPublicUrl(path).data.publicUrl);
    setMessage("QR uploaded. Save payment details to apply it.");
    setUploading(false);
    e.target.value="";
  }

  async function save(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    setSaving(true);setMessage("");
    const {error}=await supabase.rpc("update_own_event_payment_details",{p_event_id:eventId,p_organiser_upi_id:upi.trim(),p_organiser_payee_name:payee.trim()||null,p_organiser_qr_image_url:qr||null});
    if(error)setMessage(error.message==="Enter a valid UPI ID"?"Enter a valid UPI ID (example: name@okaxis).":"Payment details could not be saved. Please check the UPI ID and try again.");
    else setMessage("Payment details saved. They will appear publicly only after admin approval of the event.");
    setSaving(false);
  }

  return <form onSubmit={save} className="mt-5 rounded-xl border border-slate-200 p-4">
    <div><h3 className="font-bold text-[#10243A]">Attendee Payment Settings</h3><p className="mt-1 text-xs text-slate-600">Add the UPI account where attendees should pay for {eventTitle}. These are your own payment details, separate from NAREN REALTY's 10% commission UPI.</p></div>
    <label className="mt-4 block text-sm font-semibold">Organiser UPI ID<input required maxLength={255} className={field} value={upi} onChange={e=>setUpi(e.target.value)} placeholder="name@okaxis"/></label>
    <label className="mt-3 block text-sm font-semibold">UPI Payee Name (optional)<input maxLength={120} className={field} value={payee} onChange={e=>setPayee(e.target.value)} placeholder="Name shown in UPI app"/></label>
    <div className="mt-3"><label className="block text-sm font-semibold">Upload your UPI QR code (optional)<input className={field} type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadQr} disabled={uploading}/></label><p className="mt-1 text-xs text-slate-500">JPG, PNG or WEBP · Maximum 5 MB</p>{qr&&<div className="mt-3 flex items-start gap-3"><img src={qr} alt="Organiser UPI QR code preview" className="h-32 w-32 rounded-lg border bg-white object-contain p-2"/><button type="button" onClick={()=>setQr("")} className="text-xs font-semibold text-rose-700 underline">Remove QR</button></div>}</div>
    <button disabled={saving||uploading} className="mt-4 min-h-10 rounded-lg bg-[#10243A] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving?"Saving...":"Save payment details"}</button>
    {message&&<p role="status" className="mt-3 text-sm text-slate-700">{message}</p>}
  </form>;
}
