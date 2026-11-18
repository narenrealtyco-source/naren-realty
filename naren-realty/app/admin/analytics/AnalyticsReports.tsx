"use client";

import { useMemo, useState } from "react";

type EventRow = { sessionKey: string; event: string; page: string; time: string };

function rate(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

export default function AnalyticsReports({ events }: { events: EventRow[] }) {
  const [range, setRange] = useState<7 | 30>(30);
  const data = useMemo(() => {
    const cutoff = Date.now() - range * 24 * 60 * 60 * 1000;
    const filtered = events.filter((event) => new Date(event.time).getTime() >= cutoff);
    const sessionsFor = (predicate: (event: EventRow) => boolean) =>
      new Set(filtered.filter(predicate).map((event) => event.sessionKey).filter(Boolean));
    const visitors = sessionsFor((event) => event.event === "page_view");
    const propertyViews = sessionsFor((event) => event.event === "page_view" && /^\/properties\/[^/]+\/?$/.test(event.page));
    const formStarts = sessionsFor((event) => event.event === "form_start");
    const formSubmits = sessionsFor((event) => event.event === "form_submit");
    const propertyFormStarts = new Set([...propertyViews].filter((session) => formStarts.has(session)));
    const completedForms = new Set([...formStarts].filter((session) => formSubmits.has(session)));
    const pages = new Map<string, Set<string>>();
    for (const event of filtered) {
      if (event.event !== "page_view") continue;
      const set = pages.get(event.page) ?? new Set<string>();
      set.add(event.sessionKey);
      pages.set(event.page, set);
    }
    const topPages = [...pages.entries()].map(([path, sessions]) => ({ path, visitors: sessions.size }))
      .sort((a, b) => b.visitors - a.visitors).slice(0, 8);
    return {
      visitors: visitors.size,
      propertyViews: propertyViews.size,
      formStarts: formStarts.size,
      formSubmits: formSubmits.size,
      completedForms: completedForms.size,
      propertyDropoff: Math.max(0, propertyViews.size - propertyFormStarts.size),
      propertyToFormRate: rate(propertyFormStarts.size, propertyViews.size),
      formCompletionRate: rate(completedForms.size, formStarts.size),
      visitorToSubmitRate: rate(formSubmits.size, visitors.size),
      topPages,
      eventCount: filtered.length,
    };
  }, [events, range]);

  const stages = [
    { label: "Website visitors", value: data.visitors, percent: 100 },
    { label: "Property detail viewers", value: data.propertyViews, percent: rate(data.propertyViews, data.visitors) },
    { label: "Started a form", value: data.formStarts, percent: rate(data.formStarts, data.visitors) },
    { label: "Submitted a form", value: data.formSubmits, percent: rate(data.formSubmits, data.visitors) },
  ];
  const maxPage = Math.max(1, ...data.topPages.map((page) => page.visitors));

  return <section className="mt-6 space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-xs font-bold tracking-widest text-amber-700">CONVERSION INSIGHTS</p><h2 className="mt-1 text-xl font-bold text-[#10243A]">Visitor-to-enquiry funnel</h2><p className="mt-1 text-xs text-slate-500">Based on privacy-consented, anonymous website sessions.</p></div>
      <div className="flex gap-2" aria-label="Report date range">
        <button type="button" onClick={() => setRange(7)} aria-pressed={range === 7} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${range === 7 ? "border-[#10243A] bg-[#10243A] text-white" : "border-slate-200 bg-white text-slate-700"}`}>7 days</button>
        <button type="button" onClick={() => setRange(30)} aria-pressed={range === 30} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${range === 30 ? "border-[#10243A] bg-[#10243A] text-white" : "border-slate-200 bg-white text-slate-700"}`}>30 days</button>
      </div>
    </div>
    <div className="grid gap-3 sm:grid-cols-3">
      <article className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Property view → form start</p><strong className="mt-2 block text-2xl text-[#10243A]">{data.propertyToFormRate}%</strong><p className="mt-1 text-xs text-slate-500">{data.propertyDropoff} property-viewing sessions did not start a form</p></article>
      <article className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Form completion rate</p><strong className="mt-2 block text-2xl text-[#10243A]">{data.formCompletionRate}%</strong><p className="mt-1 text-xs text-slate-500">{data.completedForms} started sessions later submitted · {data.formStarts} started</p></article>
      <article className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Visitor → form submit</p><strong className="mt-2 block text-2xl text-[#10243A]">{data.visitorToSubmitRate}%</strong><p className="mt-1 text-xs text-slate-500">{data.eventCount.toLocaleString("en-IN")} recorded events in this period</p></article>
    </div>
    <div className="grid gap-5 lg:grid-cols-2">
      <article className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="font-bold text-[#10243A]">Conversion funnel</h3>
        <div className="mt-4 space-y-4">{stages.map((stage) => <div key={stage.label}>
          <div className="mb-1 flex justify-between gap-3 text-sm"><span className="text-slate-700">{stage.label}</span><strong className="tabular-nums text-[#10243A]">{stage.value.toLocaleString("en-IN")} <span className="text-xs font-normal text-slate-500">({stage.percent}%)</span></strong></div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.min(100, stage.percent)}%` }} /></div>
        </div>)}</div>
      </article>
      <article className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="font-bold text-[#10243A]">Most viewed pages</h3>
        {data.topPages.length ? <div className="mt-4 space-y-3">{data.topPages.map((page) => <div key={page.path}>
          <div className="mb-1 flex justify-between gap-3 text-xs"><span className="break-all text-slate-700">{page.path}</span><strong className="shrink-0 text-[#10243A]">{page.visitors}</strong></div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-500" style={{ width: `${(page.visitors / maxPage) * 100}%` }} /></div>
        </div>)}</div> : <p className="mt-4 text-sm text-slate-500">No page views recorded in this period.</p>}
      </article>
    </div>
    <p className="text-xs leading-5 text-slate-500">Important: these are anonymous session-level funnel estimates, not verified CRM enquiry attribution. A form submission event means a website form submitted; it is not matched to a customer record. Only sessions that accepted optional analytics are included. Older sessions before this report was added may not have complete form-progress events.</p>
  </section>;
}
