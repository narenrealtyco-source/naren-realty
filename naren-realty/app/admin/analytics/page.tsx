import { connection } from "next/server";
import { requireAdmin } from "../../lib/supabase-server";

export default async function AnalyticsDashboard() {
  await connection();
  const { supabase } = await requireAdmin();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [visitors, active, events, searches, exits, tasks, recent] = await Promise.all([
    supabase.from("visitor_sessions").select("id", { count: "exact", head: true }).gte("started_at", since),
    supabase.from("visitor_sessions").select("id", { count: "exact", head: true }).gte("last_seen_at", new Date(Date.now() - 5 * 60 * 1000).toISOString()),
    supabase.from("visitor_events").select("id", { count: "exact", head: true }).gte("created_at", since),
    supabase.from("visitor_events").select("id", { count: "exact", head: true }).eq("event_name", "search").gte("created_at", since),
    supabase.from("visitor_events").select("id", { count: "exact", head: true }).eq("event_name", "page_exit").gte("created_at", since),
    supabase.from("pending_tasks").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("visitor_events").select("id,visitor_key,event_name,page_path,event_data,created_at").order("created_at", { ascending: false }).limit(40),
  ]);
  const metric = (n: number | null) => (n ?? 0).toLocaleString("en-IN");
  const cards = [
    ["Visitors · 24h", metric(visitors.count)],
    ["Active · 5 min", metric(active.count)],
    ["Tracked events · 24h", metric(events.count)],
    ["Searches · 24h", metric(searches.count)],
    ["Page exits · 24h", metric(exits.count)],
    ["Open pending tasks", metric(tasks.count)],
  ];
  const cityRows = await supabase.from("visitor_sessions").select("city,region,country").not("city", "is", null).gte("started_at", since).limit(500);
  const cityCounts = new Map<string, number>();
  for (const row of cityRows.data ?? []) {
    const label = [row.city, row.region, row.country].filter(Boolean).join(", ");
    cityCounts.set(label, (cityCounts.get(label) ?? 0) + 1);
  }
  const cities = [...cityCounts.entries()].sort((a,b) => b[1]-a[1]).slice(0,8);
  return <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-8">
    <div className="mx-auto max-w-7xl">
      <a href="/admin" className="text-sm font-semibold text-amber-800 hover:underline">← Admin Dashboard</a>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold tracking-widest text-amber-700">NAREN REALTY</p><h1 className="mt-1 text-3xl font-bold text-[#10243A]">Analytics & Engagement</h1><p className="mt-1 text-sm text-slate-500">Visitor activity, approximate location, searches and drop-off signals</p></div><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">Live data · auto-refresh on reload</span></div>
      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{cards.map(([label,value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold text-[#10243A]">{value}</p></div>)}</section>
      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <section className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-1"><h2 className="font-bold text-[#10243A]">Visitor locations</h2><p className="mt-1 text-xs text-slate-500">Approximate city from Vercel request headers; may be unavailable or inaccurate.</p>{cities.length ? <ul className="mt-4 space-y-3">{cities.map(([city,count]) => <li key={city} className="flex justify-between gap-2 text-sm"><span>{city}</span><strong>{count}</strong></li>)}</ul> : <p className="mt-4 text-sm text-slate-500">No location data recorded yet.</p>}</section>
        <section className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-2"><h2 className="font-bold text-[#10243A]">Recent visitor activity</h2>{recent.data?.length ? <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs text-slate-500"><th className="py-2 pr-3">Time</th><th className="py-2 pr-3">Visitor</th><th className="py-2 pr-3">Event</th><th className="py-2">Page</th></tr></thead><tbody>{recent.data.map(row => <tr key={row.id} className="border-b border-slate-100"><td className="py-2 pr-3 whitespace-nowrap">{new Date(row.created_at).toLocaleString("en-IN")}</td><td className="py-2 pr-3 font-mono text-xs">{row.visitor_key.slice(0,12)}</td><td className="py-2 pr-3">{row.event_name}</td><td className="py-2 break-all">{row.page_path}</td></tr>)}</tbody></table></div> : <p className="mt-4 text-sm text-slate-500">No visitor events yet. Events appear after visitors browse the website with tracking enabled.</p>}</section>
      </div>
      <p className="mt-5 text-xs text-slate-500">Guest visitors remain anonymous. This module does not collect GPS coordinates or exact addresses. No form field contents, passwords, OTPs, or payment details are intentionally recorded. Location is approximate and depends on hosting headers.</p>
    </div>
  </main>;
}
