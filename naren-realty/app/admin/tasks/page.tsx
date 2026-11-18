import Link from "next/link";
import { connection } from "next/server";
import { requireAdmin } from "../../lib/supabase-server";
import TaskActions from "./TaskActions";

export const instant = false;

function formatIndiaTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  }).format(new Date(value));
}

export default async function PendingTasksPage() {
  await connection();
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("pending_tasks")
    .select("id,task_type,page_path,resume_path,status,last_step,created_at,source_enquiry_id")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(200);

  return <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-8">
    <div className="mx-auto max-w-5xl">
      <Link href="/admin" className="text-sm font-semibold text-amber-800 hover:underline">← Admin Dashboard</Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-xs font-bold tracking-widest text-amber-700">NAREN REALTY</p><h1 className="mt-1 text-3xl font-bold text-[#10243A]">Pending Follow-ups</h1><p className="mt-1 text-sm text-slate-500">Internal admin tasks generated when a customer enquiry is submitted.</p></div>
        <Link href="/admin/enquiries" className="rounded-lg bg-[#10243A] px-4 py-2 text-sm font-semibold text-white">Open enquiries</Link>
      </div>
      {error ? <p role="alert" className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">Tasks could not be loaded. Please refresh.</p> : data?.length ? <div className="mt-6 space-y-3">
        {data.map((task) => <article key={task.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-xs font-semibold uppercase tracking-wide text-amber-700">New customer enquiry</p><h2 className="mt-1 font-bold text-[#10243A]">{task.last_step || "Follow up with customer"}</h2><p className="mt-1 text-xs text-slate-500">Created: {formatIndiaTime(task.created_at)} · Task: {task.id.slice(0, 8)}</p></div>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">Open</span>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><Link href="/admin/enquiries" className="text-sm font-semibold text-amber-800 hover:underline">Review enquiry details →</Link><TaskActions taskId={task.id} /></div>
        </article>)}
      </div> : <div className="mt-6 rounded-xl border border-slate-200 bg-white p-8 text-center"><h2 className="font-bold text-[#10243A]">No open follow-ups</h2><p className="mt-1 text-sm text-slate-500">New submitted enquiries will automatically appear here.</p></div>}
      <p className="mt-5 text-xs text-slate-500">These are internal admin reminders only. No WhatsApp, SMS, email or customer notification is sent. Customer contact is handled from the enquiry workflow and must follow the applicable consent and privacy policy.</p>
    </div>
  </main>;
}
