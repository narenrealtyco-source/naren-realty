"use client";

import {useEffect,useRef,useState} from "react";

type Props={requestId:string;reference:string;action:(formData:FormData)=>void|Promise<void>};

export default function LabReceiptConfirm({requestId,reference,action}:Props){
 const videoRef=useRef<HTMLVideoElement>(null);
 const streamRef=useRef<MediaStream|null>(null);
 const detectorRef=useRef<any>(null);
 const [mode,setMode]=useState<"scan"|"manual">("scan");
 const [value,setValue]=useState("");
 const [camera,setCamera]=useState<"idle"|"starting"|"active"|"unsupported"|"error">("idle");
 const [message,setMessage]=useState("");
 const stop=()=>{streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null;if(videoRef.current)videoRef.current.srcObject=null;setCamera("idle");};
 useEffect(()=>()=>{streamRef.current?.getTracks().forEach(t=>t.stop());},[]);
 async function start(){
  setMessage("");
  if(!("BarcodeDetector" in window)){setCamera("unsupported");setMode("manual");setMessage("Is browser mein camera barcode scanning supported nahi hai. Manual backup use karein.");return;}
  try{
   setCamera("starting");
   const Detector=(window as any).BarcodeDetector;
   const supported=await Detector.getSupportedFormats();
   const formats=["qr_code","code_128","code_39","ean_13","ean_8","upc_a","upc_e","itf","codabar"].filter(x=>supported.includes(x));
   detectorRef.current=new Detector({formats});
   const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false});
   streamRef.current=stream;
   if(videoRef.current){videoRef.current.srcObject=stream;await videoRef.current.play();}
   setCamera("active");
   const scan=async()=>{
    if(!streamRef.current||!videoRef.current||!detectorRef.current)return;
    try{
     const codes=await detectorRef.current.detect(videoRef.current);
     if(codes?.length&&codes[0].rawValue){setValue(String(codes[0].rawValue).trim());setMessage("Code scan ho gaya. Booking match confirm karne ke liye submit karein.");stop();return;}
    }catch{}
    if(streamRef.current)window.setTimeout(scan,250);
   };
   window.setTimeout(scan,250);
  }catch{stop();setCamera("error");setMode("manual");setMessage("Camera permission ya device unavailable. Manual booking ID enter karein.");}
 }
 return <form action={action} className="space-y-2 rounded-lg border border-teal-100 bg-teal-50/40 p-3">
  <input type="hidden" name="request_id" value={requestId}/>
  <input type="hidden" name="sample_status" value="received_at_lab"/>
  <input type="hidden" name="receipt_method" value={mode}/>
  <p className="text-xs font-extrabold text-slate-800">Lab receipt confirmation</p>
  <div className="flex flex-wrap gap-2">
   <button type="button" onClick={()=>{setMode("scan");start();}} className="rounded-md bg-teal-700 px-3 py-2 text-xs font-bold text-white">Scan QR / Barcode</button>
   <button type="button" onClick={()=>{stop();setMode("manual");setMessage("Manual backup selected.");}} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700">Manual backup</button>
  </div>
  {camera==="active"&&<div className="overflow-hidden rounded-lg bg-black"><video ref={videoRef} muted playsInline className="max-h-48 w-full object-cover"/></div>}
  {camera==="starting"&&<p className="text-[11px] text-slate-500">Camera start ho raha hai…</p>}
  {(camera==="unsupported"||camera==="error")&&<p className="text-[11px] text-amber-800">{message}</p>}
  <label className="block text-[10px] font-bold text-slate-600">{mode==="scan"?"Scanned code (manual entry bhi kar sakte hain)":"Booking ID / Barcode value"}
   <input name="receipt_code" required value={value} onChange={e=>setValue(e.target.value)} placeholder={reference} className="mt-1 w-full rounded-md border bg-white p-2 text-xs"/>
  </label>
  {message&&camera!=="unsupported"&&camera!=="error"&&<p className="text-[11px] text-slate-600">{message}</p>}
  <p className="text-[10px] text-slate-500">Expected booking: {reference}. Code must match this booking.</p>
  <button className="w-full rounded-md bg-slate-900 p-2 text-xs font-bold text-white">Verify & confirm lab receipt</button>
 </form>;
}
