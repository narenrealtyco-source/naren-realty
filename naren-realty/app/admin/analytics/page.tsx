import { connection } from "next/server";
import { requireAdmin } from "../../lib/supabase-server";
import AnalyticsInteractions from "./AnalyticsInteractions";

export const instant = false;

export default async function AnalyticsDashboard() {
  await connection();
  const { supabase } = await requireAdmin();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [visitors, active, events, searches, exits, formStarts, formSubmits, tasks, recent] = await Promise.all([
    supabase.from("visitor_sessions").select("id", { count: "exact", head: true }).gte("started_at", since),
    supabase.from("visitor_sessions").select("id", { count: "exact", head: true }).gte("last_seen_at", new Date(Date.now() - 5 * 60 * 1000).toISOString()),
    supabase.from("visitor_events").select("id", { count: "exact", head: true }).gte("created_at", since),
    supabase.from("visitor_events").select("id", { count: "exact", head: true }).eq("event_name", "search").gte("created_at", since),
    supabase.from("visitor_events").select("id", { count: "exact", head: true }).eq("event_name", "page_exit").gte("created_at", since),
    supabase.from("visitor_events").select("id", { count: "exact", head: true }).eq("event_name", "form_start").gte("created_at", since),
    supabase.from("visitor_events").select("id", { count: "exact", head: true }).eq("event_name", "form_submit").gte("created_at", since),
    supabase.from("pending_tasks").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("visitor_events").select("id,visitor_key,session_key,user_id,event_name,page_path,event_data,created_at").order("created_at", { ascending: false }).limit(40),
  ]);

  // A session may become linked to a registered account after the visitor signs in.
  // Resolve identity from the event first, then from its session, without exposing contact data.
  const recentRows = recent.data ?? [];
  const sessionKeys = [...new Set(recentRows.map((row) => row.session_key).filter((key): key is string => Boolean(key)))];
  const sessionUsers = sessionKeys.length
    ? await supabase.from("visitor_sessions").select("session_key,user_id").in("session_key", sessionKeys)
    : { data: [] as { session_key: string; user_id: string | null }[] };
  const userIdBySession = new Map((sessionUsers.data ?? []).filter((row) => row.user_id).map((row) => [row.session_key, row.user_id as string]));
  const userIds = [...new Set(recentRows.map((row) => row.user_id ?? (row.session_key ? userIdBySession.get(row.session_key) : null)).filter((id): id is string => Boolean(id)))];
  const profiles = userIds.length
    ? await supabase.from("profiles").select("id,full_name").in("id", userIds)
    : { data: [] as { id: string; full_name: string | null }[] };
  const profileNames = new Map((profiles.data ?? []).map((profile) => [profile.id, profile.full_name?.trim() || "Registered client"]));

  const metric = (n: number | null) => (n ?? 0).toLocaleString("en-IN");
  const formatIndiaTime = (value: string) => new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }).format(new Date(value));
  const cards = [
    { label: "Visitors · 24h", value: metric(visitors.count), filter: "all" },
    { label: "Active · 5 min", value: metric(active.count), filter: "all" },
    { label: "Tracked events · 24h", value: metric(events.count), filter: "all" },
    { label: "Searches · 24h", value: metric(searches.count), filter: "search" },
    { label: "Page exits · 24h", value: metric(exits.count), filter: "page_exit" },
    { label: "Form starts · 24h", value: metric(formStarts.count), filter: "form_start" },
    { label: "Form submits · 24h", value: metric(formSubmits.count), filter: "form_submit" },
    { label: "Open pending tasks", value: metric(tasks.count), filter: "tasks" },
  ];
  const cityRows = await supabase.from("visitor_sessions").select("city,region,country").not("city", "is", null).gte("started_at", since).limit(500);
  const cityCounts = new Map<string, number>();
  for (const row of cityRows.data ?? []) {
    const label = [row.city, row.region, row.country].filter(Boolean).join(", ");
    cityCounts.set(label, (cityCounts.get(label) ?? 0) + 1);
  }
  const cities = [...cityCounts.entries()].sort((a,b) => b[1]-a[1]).slice(0,8);
  const recentActivity = recentRows.map((row) => {
    const userId = row.user_id ?? (row.session_key ? userIdBySession.get(row.session_key) : null);
    const name = userId ? profileNames.get(userId) : null;
    const registrationStatus: "Registered client" | "Not registered" = name ? "Registered client" : "Not registered";
    return {
      id: row.id,
      visitor: row.visitor_key,
      clientName: name ?? "New visitor",
      registrationStatus,
      event: row.event_name,
      page: row.page_path,
      data: row.event_data,
      time: formatIndiaTime(row.created_at),
    };
  });

  return <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-8">
    <div className="mx-auto max-w-7xl">
      <a href="/admin" className="text-sm font-semibold text-amber-800 hover:underline">← Admin Dashboard</a>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold tracking-widest text-amber-700">NAREN REALTY</p><h1 className="mt-1 text-3xl font-bold text-[#10243A]">Analytics & Engagement</h1><p className="mt-1 text-sm text-slate-500">Visitor activity, approximate location, searches and privacy-safe form funnel events</p></div><div className="flex flex-wrap items-center gap-2"><a href="/admin/analytics/reports" className="rounded-lg bg-[#10243A] px-4 py-2 text-xs font-bold text-white hover:bg-slate-700">Conversion Reports →</a><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">Live data · auto-refresh on reload</span></div></div>
      <AnalyticsInteractions cards={cards} recent={recentActivity.map((row) => ({ ...row, time: row.time }))} />
      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <section className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-1"><h2 className="font-bold text-[#10243A]">Visitor locations</h2><p className="mt-1 text-xs text-slate-500">Approximate city from Vercel request headers; may be unavailable or inaccurate.</p>{cities.length ? <ul className="mt-4 space-y-3">{cities.map(([city,count]) => <li key={city} className="flex justify-between gap-2 text-sm"><span>{city}</span><strong>{count}</strong></li>)}</ul> : <p className="mt-4 text-sm text-slate-500">No location data recorded yet.</p>}</section>
      </div>
      <p className="mt-5 text-xs text-slate-500">Registered visitors are identified only when their analytics event or session is linked to an account. Visitors who have not registered remain labelled as new visitors. This module does not collect GPS coordinates or exact addresses. Form tracking records only anonymous progress counts, never field names or entered values.</p>
    </div>
  </main>;
}
