"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import Link from "next/link";
type CatalogItem={slug:string;item_type:"test"|"package";title:string;category:string;description?:string;price:number|null;is_active:boolean;provider_verified:boolean};
export default function HealthCatalogAutocomplete({placeholder="Search tests and packages...",className=""}:{placeholder?:string;className?:string}){
 const [items,setItems]=useState<CatalogItem[]>([]),[query,setQuery]=useState(""),[open,setOpen]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const root=useRef<HTMLDivElement>(null);
 useEffect(()=>{let live=true;fetch("/api/health-catalog",{cache:"no-store"}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||"Catalogue unavailable");if(live)setItems((d.items||[]).filter((x:CatalogItem)=>x.is_active));}).catch(e=>{if(live)setError(e.message||"Search unavailable");}).finally(()=>{if(live)setLoading(false);});return()=>{live=false};},[]);
 useEffect(()=>{const close=(event:MouseEvent)=>{if(root.current&&!root.current.contains(event.target as Node))setOpen(false)};document.addEventListener("mousedown",close);return()=>document.removeEventListener("mousedown",close)},[]);
 const matches=useMemo(()=>{const q=query.trim().toLocaleLowerCase();if(!q)return[];return items.filter(x=>(x.title+" "+(x.category||"")+" "+(x.description||"")).toLocaleLowerCase().includes(q)).sort((a,b)=>Number(b.title.toLocaleLowerCase().startsWith(q))-Number(a.title.toLocaleLowerCase().startsWith(q))||a.title.localeCompare(b.title)).slice(0,10)},[items,query]);
 const detail=(x:CatalogItem)=>x.item_type==="test"?"/health-checkup/test/"+encodeURIComponent(x.slug):"/health-checkup/package/"+encodeURIComponent(x.slug);
 const book=(x:CatalogItem)=>"/health-checkup/checkout?item="+encodeURIComponent(x.slug);
 return <div ref={root} className={"relative w-full "+className}>
  <label className="flex h-14 items-center gap-3 rounded-full border border-[#aab6c2] bg-white px-5 shadow-[0_4px_16px_rgba(15,40,55,0.04)] focus-within:border-[#08aeb1] focus-within:ring-2 focus-within:ring-[#08b8bb]/15">
   <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0 text-slate-600" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg>
   <input value={query} onFocus={()=>setOpen(true)} onChange={e=>{setQuery(e.target.value);setOpen(true)}} onKeyDown={e=>{if(e.key==="Enter"&&query.trim()){window.location.href="/health-checkup/search?q="+encodeURIComponent(query.trim())}if(e.key==="Escape")setOpen(false)}} placeholder={placeholder} aria-label="Search diagnostic tests and packages" aria-expanded={open&&!!query.trim()} aria-controls="mfit-catalog-suggestions" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500 sm:text-base"/>
  </label>
  {open&&query.trim()&&<div id="mfit-catalog-suggestions" role="listbox" className="absolute inset-x-0 top-[calc(100%+8px)] z-50 max-h-[min(70vh,440px)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_16px_40px_rgba(15,40,55,0.18)]">
   {loading?<p className="px-3 py-4 text-sm text-slate-500">Loading tests and packages…</p>:error?<p className="px-3 py-4 text-sm text-rose-700">{error}</p>:matches.length===0?<p className="px-3 py-4 text-sm text-slate-500">No test or package matches “{query.trim()}”.</p>:matches.map(x=><div key={x.slug} role="option" aria-selected="false" className="flex items-center justify-between gap-3 rounded-xl px-3 py-3 hover:bg-[#f0faf9]">
    <Link href={detail(x)} onClick={()=>setOpen(false)} className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-900">{x.title}</span><span className="mt-1 block text-[11px] text-slate-500">{x.item_type==="package"?"Package":"Individual test"} · {x.category}</span></Link>
    {x.is_active&&x.price!==null&&x.provider_verified?<Link href={book(x)} onClick={()=>setOpen(false)} className="shrink-0 rounded-lg bg-[#078b8d] px-3 py-2 text-xs font-extrabold text-white">Book</Link>:<Link href={detail(x)} onClick={()=>setOpen(false)} className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">Details</Link>}
   </div>)}
   {matches.length>0&&<Link href={"/health-checkup/search?q="+encodeURIComponent(query.trim())} onClick={()=>setOpen(false)} className="mt-1 block border-t border-slate-100 px-3 py-3 text-center text-xs font-bold text-[#078b8d]">View all matching results →</Link>}
  </div>}
 </div>;
}
