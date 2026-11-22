"use client";
import {useMemo,useState} from "react";

type Item={slug:string;title:string;item_type:string;price:number|null;customerPrice:number|null;b2bPrice:number|null;configured:boolean};
export default function PartnerCatalogueSearch({items,preservedQuery=""}:{items:Item[];preservedQuery?:string}){
 const [query,setQuery]=useState("");
 const [open,setOpen]=useState(false);
 const matches=useMemo(()=>{
  const q=query.trim().toLocaleLowerCase();
  if(!q)return [];
  return items.filter(x=>x.title.toLocaleLowerCase().startsWith(q)).slice(0,10);
 },[items,query]);
 const href=(title:string)=>"/collection-partner/catalogue?"+(preservedQuery?"q="+encodeURIComponent(preservedQuery)+"&":"")+"rate_q="+encodeURIComponent(title);
 return <form method="get" action="/collection-partner/catalogue" className="relative mt-3 flex flex-wrap gap-2">
  <input type="hidden" name="tab" value="catalogue"/>
  {preservedQuery&&<input type="hidden" name="q" value={preservedQuery}/>}
  <div className="relative min-w-0 flex-1">
   <input type="search" name="rate_q" value={query} onChange={e=>{setQuery(e.target.value);setOpen(true)}} onFocus={()=>setOpen(true)} onBlur={()=>setTimeout(()=>setOpen(false),150)} onKeyDown={e=>{if(e.key==="Escape")setOpen(false)}} placeholder="Type test name (e.g. C)..." aria-label="Search test or package name" aria-expanded={open&&!!query.trim()} aria-controls="partner-catalogue-suggestions" autoComplete="off" className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-teal-600"/>
   {open&&query.trim()&&<div id="partner-catalogue-suggestions" role="listbox" className="absolute inset-x-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
    {matches.length?matches.map(item=><a key={item.slug} role="option" href={href(item.title)} className="flex items-center justify-between gap-3 rounded-lg px-3 py-3 hover:bg-teal-50">
      <span className="min-w-0"><span className="block truncate text-sm font-bold text-slate-900">{item.title}</span><span className="mt-1 block text-[11px] text-slate-500">{item.item_type==="package"?"Package":"Single test"} · Customer { "₹"+Number(item.customerPrice??item.price??0).toLocaleString("en-IN")} · MFIT B2B {item.configured?"₹"+Number(item.b2bPrice||0).toLocaleString("en-IN"):"Not configured"}</span></span>
      <span className="shrink-0 text-xs font-bold text-teal-700">View rates →</span>
     </a>):<p className="px-3 py-4 text-sm text-slate-500">No test or package starts with “{query.trim()}”. Try another name.</p>}
   </div>}
  </div>
  <button className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-bold text-white">Search catalogue</button>
  {query&&<a href={"/collection-partner/catalogue"+(preservedQuery?"?q="+encodeURIComponent(preservedQuery):"")} className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-600">Clear</a>}
 </form>;
}
