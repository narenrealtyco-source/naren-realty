"use client";

import {useEffect,useMemo,useState} from "react";

type TimelineItem={title:string;tatHours:number|null;tatLabel?:string|null;kind:"package"|"test"};
function duration(ms:number){const total=Math.floor(Math.abs(ms)/1000);const d=Math.floor(total/86400),h=Math.floor((total%86400)/3600),m=Math.floor((total%3600)/60),s=total%60;return d?d+"d "+h+"h "+m+"m":h+"h "+m+"m "+s+"s";}
function state(due:number|null,now:number,complete:boolean){if(complete)return "completed";if(due===null)return "unconfigured";return due<now?"overdue":due-now<=2*60*60*1000?"due_soon":"on_track";}
export default function LabTatTimeline({receivedAt,items,reportSubmittedAt}:{receivedAt:string|null;items:TimelineItem[];reportSubmittedAt:string|null}){
 const [now,setNow]=useState(()=>Date.now());
 useEffect(()=>{const id=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(id)},[]);
 const start=receivedAt?new Date(receivedAt).getTime():null;
 const rows=useMemo(()=>items.map((item)=>{const due=start!==null&&item.tatHours!==null?start+item.tatHours*3600000:null;const status=state(due,now,!!reportSubmittedAt);return {...item,due,status,remaining:due===null?null:due-now}}).sort((a,b)=>{const rank:any={overdue:0,due_soon:1,on_track:2,unconfigured:3,completed:4};return rank[a.status]-rank[b.status]||((a.due??Infinity)-(b.due??Infinity))}),[items,start,now,reportSubmittedAt]);
 const overall=rows.some(x=>x.status==="overdue")?"overdue":rows.some(x=>x.status==="due_soon")?"due_soon":rows.every(x=>x.status==="completed")?"completed":"on_track";
 const label=(s:string)=>({overdue:"OVERDUE",due_soon:"DUE SOON",on_track:"ON TRACK",unconfigured:"TAT NOT CONFIGURED",completed:"COMPLETED"} as any)[s]||s;
 const color=(s:string)=>({overdue:"border-red-200 bg-red-50 text-red-800",due_soon:"border-amber-200 bg-amber-50 text-amber-800",on_track:"border-emerald-200 bg-emerald-50 text-emerald-800",unconfigured:"border-slate-200 bg-slate-50 text-slate-600",completed:"border-teal-200 bg-teal-50 text-teal-800"} as any)[s];
 return <section className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
  <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Live TAT timeline</p><p className="mt-1 text-xs text-slate-500">Countdown starts when MFIT Lab receives the sample.</p></div><span className={"rounded-full border px-3 py-1 text-[10px] font-extrabold "+color(overall)}>{label(overall)}</span></div>
  {!receivedAt?<p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs font-semibold text-amber-800">Confirm sample receipt to start all TAT countdowns.</p>:<div className="mt-3 space-y-2">{rows.map((x,i)=><div key={x.kind+"-"+x.title+"-"+i} className="rounded-lg border border-slate-100 p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{x.kind==="package"?"Package TAT":"Individual test TAT"}</p><p className="mt-0.5 text-sm font-bold text-slate-800">{x.title}</p></div><span className={"shrink-0 rounded-full border px-2 py-1 text-[9px] font-extrabold "+color(x.status)}>{label(x.status)}</span></div><div className="mt-2 flex flex-wrap justify-between gap-2 text-xs"><span className="font-semibold text-slate-700">{x.status==="completed"?"Included in combined PDF":x.due===null?"TAT needs configuration":x.remaining!>=0?"Time left: "+duration(x.remaining!):"Delayed by: "+duration(x.remaining!)}</span><span className="text-slate-500">{x.due===null?"": "Deadline: "+new Date(x.due).toLocaleString("en-IN",{timeZone:"Asia/Kolkata"})}</span></div></div>)}</div>}
  <p className="mt-3 text-[11px] text-slate-500">One combined PDF completes this booking's package and included test timelines after Lab Team submission.</p>
 </section>;
}
