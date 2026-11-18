"use client";

import { useMemo, useState } from "react";

type Card = { label: string; value: string; filter: string };
type EventRow = { id: number; visitor: string; event: string; page: string; data: Record<string, unknown> | null; time: string };

export default function AnalyticsInteractions({ cards, recent }: { cards: Card[]; recent: EventRow[] }) {
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<number | null>(null);
  const [showTasks, setShowTasks] = useState(false);
  const rows = useMemo(() => filter === "all" ? recent : recent.filter((row) => row.event === filter), [filter, recent]);

  function choose(card: Card) {
    if (card.filter === "tasks") { setShowTasks(true); return; }
    setShowTasks(false);
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
        <div><h2 className="font-bold text-[#10243A]">Recent visitor activity</h2><p className="mt-1 text-xs text-slate-500">Select any row to inspect its recorded event details.</p></div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => { setFilter("all"); setShowTasks(false); }} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${filter === "all" && !showTasks ? "border-[#10243A] bg-[#10243A] text-white" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}>All events</button>
          <button type="button" onClick={() => { setFilter("search"); setShowTasks(false); }} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${filter === "search" ? "border-[#10243A] bg-[#10243A] text-white" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}>Searches</button>
          <button type="button" onClick={() => { setFilter("page_exit"); setShowTasks(false); }} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${filter === "page_exit" ? "border-[#10243A] bg-[#10243A] text-white" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}>Page exits</button>
        </div>
      </div>
      {showTasks ? <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>Pending task management is not active yet.</strong><p className="mt-1">The database counter is available, but task creation, assignment and status actions have not been implemented.</p></div> : rows.length ? <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs text-slate-500"><th className="py-2 pr-3">Time (IST)</th><th className="py-2 pr-3">Visitor</th><th className="py-2 pr-3">Event</th><th className="py-2">Page</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-b border-slate-100"><td colSpan={4} className="p-0"><button type="button" onClick={() => setSelected(selected === row.id ? null : row.id)} aria-expanded={selected === row.id} className="grid w-full grid-cols-[minmax(145px,1fr)_minmax(90px,.8fr)_minmax(90px,.7fr)_minmax(120px,1.2fr)] gap-3 px-1 py-3 text-left transition hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500"><span className="whitespace-nowrap">{row.time}</span><span className="font-mono text-xs">{row.visitor.slice(0, 12)}</span><span>{row.event}</span><span className="break-all">{row.page}</span></button>{selected === row.id && <div className="border-t border-amber-100 bg-amber-50/60 px-4 py-3 text-xs"><p><strong>Full visitor ID:</strong> <span className="font-mono">{row.visitor}</span></p><p className="mt-1"><strong>Recorded event data:</strong></p><pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-white p-3">{JSON.stringify(row.data ?? {}, null, 2)}</pre></div>}</td></tr>)}</tbody></table></div> : <p className="mt-4 text-sm text-slate-500">No events match this filter.</p>}
    </section>
  </>;
}
