import { connection } from "next/server";
import Link from "next/link";
import { requireAdmin } from "../../../lib/supabase-server";
import AnalyticsReports from "../AnalyticsReports";

export const instant = false;

export default async function AnalyticsReportsPage() {
  await connection();
  const { supabase } = await requireAdmin();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("visitor_events")
    .select("session_key,event_name,page_path,created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(10000);
  if (error) throw new Error("Analytics reports could not be loaded.");
  const events = (data ?? []).map((row) => ({
    sessionKey: row.session_key,
    event: row.event_name,
    page: row.page_path,
    time: row.created_at,
  }));
  return <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-8">
    <div className="mx-auto max-w-7xl">
      <Link href="/admin/analytics" className="text-sm font-semibold text-amber-800 hover:underline">← Analytics Dashboard</Link>
      <header className="mt-4"><p className="text-xs font-bold tracking-widest text-amber-700">NAREN REALTY</p><h1 className="mt-1 text-3xl font-bold text-[#10243A]">Conversion Reports</h1><p className="mt-1 text-sm text-slate-500">Understand where visitors browse, start forms and leave the journey.</p></header>
      <AnalyticsReports events={events} />
    </div>
  </main>;
}
