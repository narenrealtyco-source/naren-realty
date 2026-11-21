"use client";
export default function PartnerLinkActions({url,partnerName}:{url:string;partnerName:string}){
 const message="Book your health checkup with "+partnerName+": "+url;
 async function copy(){await navigator.clipboard.writeText(url);}
 return <div className="flex shrink-0 gap-2">
  <button type="button" onClick={copy} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700">Copy link</button>
  <a href={"https://wa.me/?text="+encodeURIComponent(message)} target="_blank" rel="noreferrer" className="rounded-lg bg-[#16834a] px-3 py-2 text-xs font-bold text-white">WhatsApp</a>
 </div>;
}
