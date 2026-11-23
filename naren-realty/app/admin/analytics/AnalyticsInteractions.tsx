"use client";

import { useMemo, useState } from "react";

type Card = { label: string; value: string; filter: string };
type EventRow = {
  id: number;
  visitor: string;
  clientName: string;
  registrationStatus: "Registered client" | "Not registered";
  event: string;
  page: string;
  data: Record<string, unknown> | null;
  time: string;
};

export default function AnalyticsInteractions({ cards, recent }: { cards: Card[]; recent: EventRow[] }) {
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<number | null>(null);
  const rows = useMemo(() => filter === "all" ? recent : recent.filter((row) => row.event === filter), [filter, recent]);

  function choose(card: Card) {
    if (card.filter === "tasks") { window.location.assign("/admin/tasks"); return; }
    setFilter(card.filter);
    document.getElementById("analytics-activity")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return <>
    <section aria-label="Analytics metrics" className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => <button key={card.label} type="button" onClick={() => choose(card)} className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-amber-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
        <span className="flex items-center justify-between gap-2 text-sm text-slate-500">{card.label}<span aria-hidden="true" className="text-amber-700">↗</span></span>
        <strong className="mt-2 block text-3xl font-bold text-[#10243A]">{card.value}</strong>
        <span className="mt-2 block text-xs font-semibold text-amber-800">Click to view details</span>
      </button>)}
    </section>
    <section id="analytics-activity" className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="font-bold text-[#10243A]">Recent visitor activity</h2><p className="mt-1 text-xs text-slate-500">Registered users show their account name; visitors without an account are marked as new visitors.</p></div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setFilter("all")} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${filter === "all" ? "border-[#10243A] bg-[#10243A] text-white" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}>All events</button>
          <button type="button" onClick={() => setFilter("search")} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${filter === "search" ? "border-[#10243A] bg-[#10243A] text-white" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}>Searches</button>
          <button type="button" onClick={() => setFilter("page_exit")} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${filter === "page_exit" ? "border-[#10243A] bg-[#10243A] text-white" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}>Page exits</button>
          <button type="button" onClick={() => setFilter("form_start")} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${filter === "form_start" ? "border-[#10243A] bg-[#10243A] text-white" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}>Form starts</button>
          <button type="button" onClick={() => setFilter("form_submit")} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${filter === "form_submit" ? "border-[#10243A] bg-[#10243A] text-white" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}>Form submits</button>
        </div>
      </div>
      {rows.length ? <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs text-slate-500"><th className="py-2 pr-3">Time (IST)</th><th className="py-2 pr-3">Visitor / Client</th><th className="py-2 pr-3">Event</th><th className="py-2">Page</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-b border-slate-100"><td colSpan={4} className="p-0"><button type="button" onClick={() => setSelected(selected === row.id ? null : row.id)} aria-expanded={selected === row.id} className="grid w-full grid-cols-[minmax(145px,1fr)_minmax(145px,1fr)_minmax(90px,.7fr)_minmax(120px,1.2fr)] gap-3 px-1 py-3 text-left transition hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500"><span className="whitespace-nowrap">{row.time}</span><span className="min-w-0"><strong className="block truncate font-semibold text-slate-900">{row.clientName}</strong><span className={`mt-0.5 block text-[11px] ${row.registrationStatus === "Registered client" ? "text-emerald-700" : "text-slate-500"}`}>{row.registrationStatus}</span></span><span>{row.event}</span><span className="break-all">{row.page}</span></button>{selected === row.id && <div className="border-t border-amber-100 bg-amber-50/60 px-4 py-3 text-xs"><p><strong>Visitor ID:</strong> <span className="font-mono">{row.visitor}</span></p><p className="mt-1"><strong>Account:</strong> {row.clientName} · {row.registrationStatus}</p><p className="mt-1"><strong>Recorded event data:</strong></p><pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-white p-3">{JSON.stringify(row.data ?? {}, null, 2)}</pre></div>}</td></tr>)}</tbody></table></div> : <p className="mt-4 text-sm text-slate-500">No events match this filter.</p>}
    </section>
  </>;
}
