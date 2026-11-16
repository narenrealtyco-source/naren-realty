"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import AdminLogoutButton from "../components/AdminLogoutButton";
import { loadAdminDashboardStats } from "./actions";
import type { AdminDashboardSection, AdminDashboardStats } from "../lib/admin-supabase-data";

type Tone = "navy" | "amber" | "green" | "red";
type DashboardMetric = { label: string; value: number; href: string; tone: Tone };
type TaskKey = "properties" | "addProperty" | "visits" | "enquiries" | "managers" | "submissions" | "serviceRequests" | "vendors" | "requirements" | "googleLeads" | "loans" | "matches" | "referrals" | "policies";
type TaskItem = { key: TaskKey; label: string; count?: number; href?: string };

const toneStyles: Record<Tone, string> = {
  navy: "border-l-[#10243A] bg-slate-50",
  amber: "border-l-amber-500 bg-amber-50/70",
  green: "border-l-emerald-600 bg-emerald-50/70",
  red: "border-l-rose-600 bg-rose-50/70",
};

function MetricCard({ label, value, href, tone }: DashboardMetric) {
  return (
    <Link href={href} className={`group flex min-h-24 items-center justify-between gap-3 rounded-xl border border-slate-200 border-l-4 ${toneStyles[tone]} px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500`}>
      <span className="text-sm font-semibold leading-5 text-slate-600">{label}</span>
      <span className="flex shrink-0 items-center gap-3">
        <strong className="text-2xl tabular-nums text-[#10243A]">{value.toLocaleString("en-IN")}</strong>
        <span className="text-xs font-semibold text-amber-800 group-hover:underline">View</span>
      </span>
    </Link>
  );
}

function MetricGrid({ section, metrics, emptyMessage }: {
  section: AdminDashboardSection<unknown>;
  metrics: DashboardMetric[];
  emptyMessage: string;
}) {
  if (section.state !== "available") {
    return <p role={section.state === "error" ? "alert" : "status"} className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{section.message}</p>;
  }
  const activeMetrics = metrics.filter((item) => item.value > 0);
  if (!activeMetrics.length) return <p role="status" className="text-sm text-slate-500">{emptyMessage}</p>;
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{activeMetrics.map((item) => <MetricCard key={item.label} {...item} />)}</div>;
}

function SectionHeading({ children, href }: { children: ReactNode; href: string }) {
  return <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-bold text-[#10243A]">{children}</h3><Link href={href} className="text-sm font-semibold text-amber-800 hover:underline">View All</Link></div>;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [selectedTask, setSelectedTask] = useState<TaskKey | null>(null);

  useEffect(() => {
    let active = true;
    loadAdminDashboardStats()
      .then((nextStats) => { if (active) { setStats(nextStats); setError(""); } })
      .catch((loadError: unknown) => { if (active) setError(loadError instanceof Error ? loadError.message : "Dashboard data could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retryKey]);

  const tasks: TaskItem[] = [
    { key: "properties", label: "Properties", count: stats?.properties.state === "available" ? stats.properties.metrics.totalProperties : undefined },
    { key: "addProperty", label: "Add Property", href: "/admin/properties/new" },
    { key: "enquiries", label: "Enquiries", count: stats?.enquiries.state === "available" ? stats.enquiries.metrics.totalEnquiries : undefined },
    { key: "visits", label: "Visit Requests", count: stats?.visits.state === "available" ? stats.visits.metrics.totalVisits : undefined },
    { key: "managers", label: "Managers", href: "/admin/managers" },
    { key: "submissions", label: "Submissions", count: stats?.submissions.state === "available" ? stats.submissions.metrics.totalSubmissions : undefined },
    { key: "serviceRequests", label: "Service Requests", count: stats?.serviceRequests.state === "available" ? stats.serviceRequests.metrics.totalRequests : undefined },
    { key: "vendors", label: "Vendor Management", count: stats?.vendors.state === "available" ? stats.vendors.metrics.totalVendors : undefined },
    { key: "requirements", label: "Requirements", count: stats?.requirements.state === "available" ? stats.requirements.metrics.totalRequirements : undefined },
    { key: "googleLeads", label: "Google Form Leads", href: "/admin/google-form-requirements" },
    { key: "loans", label: "Loan Requests", href: undefined },
    { key: "matches", label: "Matches", href: undefined },
    { key: "referrals", label: "Referrals", href: undefined },
    { key: "policies", label: "Policies", href: "/admin/policies" },
  ];

  useEffect(() => {
    if (!selectedTask) setSelectedTask("properties");
  }, [selectedTask]);

  function retryDashboard() {
    setError("");
    setLoading(true);
    setRetryKey((current) => current + 1);
  }

  const propertyMetrics = stats?.properties.state === "available" ? [
    { label: "Total Properties", value: stats.properties.metrics.totalProperties, href: "/admin/properties", tone: "navy" as const },
    { label: "Pending Approvals", value: stats.properties.metrics.pendingProperties, href: "/admin/properties?status=pending", tone: "amber" as const },
    { label: "Approved Properties", value: stats.properties.metrics.approvedProperties, href: "/admin/properties?status=approved", tone: "green" as const },
    { label: "Rejected Properties", value: stats.properties.metrics.rejectedProperties, href: "/admin/properties?status=rejected", tone: "red" as const },
  ] : [];
  const visitMetrics = stats?.visits.state === "available" ? [
    { label: "Total Visits", value: stats.visits.metrics.totalVisits, href: "/admin/visits", tone: "navy" as const },
    { label: "Pending Visits", value: stats.visits.metrics.pendingVisits, href: "/admin/visits?status=pending", tone: "amber" as const },
    { label: "Confirmed Visits", value: stats.visits.metrics.confirmedVisits, href: "/admin/visits?status=confirmed", tone: "green" as const },
    { label: "Completed Visits", value: stats.visits.metrics.completedVisits, href: "/admin/visits?status=completed", tone: "green" as const },
    { label: "Cancelled Visits", value: stats.visits.metrics.cancelledVisits, href: "/admin/visits?status=cancelled", tone: "red" as const },
    { label: "Today's Visits", value: stats.visits.metrics.todaysVisits, href: "/admin/visits", tone: "navy" as const },
  ] : [];
  const enquiryMetrics = stats?.enquiries.state === "available" ? [
    { label: "Total Enquiries", value: stats.enquiries.metrics.totalEnquiries, href: "/admin/enquiries", tone: "navy" as const },
    { label: "New Enquiries", value: stats.enquiries.metrics.newEnquiries, href: "/admin/enquiries?status=New", tone: "amber" as const },
    { label: "In Progress", value: stats.enquiries.metrics.inProgressEnquiries, href: "/admin/enquiries", tone: "amber" as const },
    { label: "Deals Closed", value: stats.enquiries.metrics.dealClosedEnquiries, href: "/admin/enquiries?status=Deal%20Closed", tone: "green" as const },
  ] : [];
  const requestMetrics = stats?.serviceRequests.state === "available" ? [
    { label: "Service Requests", value: stats.serviceRequests.metrics.totalRequests, href: "/admin/services", tone: "navy" as const },
    { label: "Pending Requests", value: stats.serviceRequests.metrics.pendingRequests, href: "/admin/services?status=pending", tone: "amber" as const },
    { label: "In Progress", value: stats.serviceRequests.metrics.inProgressRequests, href: "/admin/services?status=contacted", tone: "amber" as const },
    { label: "Completed", value: stats.serviceRequests.metrics.completedRequests, href: "/admin/services?status=completed", tone: "green" as const },
  ] : [];
  const vendorMetrics = stats?.vendors.state === "available" ? [
    { label: "Total Vendors", value: stats.vendors.metrics.totalVendors, href: "/admin/services/vendors", tone: "navy" as const },
    { label: "Pending Approvals", value: stats.vendors.metrics.pendingVendors, href: "/admin/services/vendors?status=pending", tone: "amber" as const },
    { label: "Approved Vendors", value: stats.vendors.metrics.approvedVendors, href: "/admin/services/vendors?status=approved", tone: "green" as const },
    { label: "Rejected Vendors", value: stats.vendors.metrics.rejectedVendors, href: "/admin/services/vendors?status=rejected", tone: "red" as const },
  ] : [];
  const requirementMetrics = stats?.requirements.state === "available" ? [
    { label: "Total Requirements", value: stats.requirements.metrics.totalRequirements, href: "/admin/requirements", tone: "navy" as const },
    { label: "New Requirements", value: stats.requirements.metrics.newRequirements, href: "/admin/requirements?status=New", tone: "amber" as const },
    { label: "Pending Requirements", value: stats.requirements.metrics.pendingRequirements, href: "/admin/requirements", tone: "amber" as const },
  ] : [];
  const submissionMetrics = stats?.submissions.state === "available" ? [
    { label: "Total Submissions", value: stats.submissions.metrics.totalSubmissions, href: "/admin/submissions", tone: "navy" as const },
    { label: "Pending Review", value: stats.submissions.metrics.pendingSubmissions, href: "/admin/submissions?status=pending", tone: "amber" as const },
    { label: "Approved", value: stats.submissions.metrics.approvedSubmissions, href: "/admin/submissions?status=approved", tone: "green" as const },
    { label: "Rejected", value: stats.submissions.metrics.rejectedSubmissions, href: "/admin/submissions?status=rejected", tone: "red" as const },
  ] : [];

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 pb-[env(safe-area-inset-bottom)] text-slate-900">
      <header className="bg-[#10243A] text-white shadow-sm">
        <div className="mx-auto flex max-w-[88rem] flex-wrap items-center justify-between gap-3 px-3 py-3 sm:px-6 sm:py-4">
          <div><p className="text-xs font-bold tracking-[0.18em] text-amber-400">NAREN REALTY</p><h1 className="mt-1 text-xl font-bold">Admin Dashboard</h1></div>
          <div className="flex items-center gap-2"><Link href="/" className="rounded-lg border border-white/25 px-3 py-2 text-xs font-semibold hover:bg-white/10">Website</Link><AdminLogoutButton className="rounded-lg border border-white/25 px-3 py-2 text-xs font-semibold hover:bg-white/10" /></div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[88rem] px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-4">
          <div><p className="text-xs font-bold tracking-[0.18em] text-amber-700">OPERATIONS OVERVIEW</p><h2 className="mt-1 text-2xl font-bold text-[#10243A]">Dashboard</h2><p className="mt-1 text-sm text-slate-600">Live record counts from the authenticated Supabase session.</p></div>
          <button type="button" onClick={retryDashboard} disabled={loading} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-[#10243A] hover:border-amber-500 disabled:opacity-60">{loading ? "Loading..." : "Refresh metrics"}</button>
        </div>

        {loading && <p role="status" className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">Loading dashboard metrics...</p>}
        {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}

        {!loading && !error && stats && (
          <div className="grid min-w-0 gap-4 md:gap-5 md:grid-cols-[220px_minmax(0,1fr)] lg:grid-cols-[250px_minmax(0,1fr)]">
            <div className="md:hidden">
              <label htmlFor="admin-task-select" className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Open admin module</label>
              <select
                id="admin-task-select"
                value={selectedTask ?? "properties"}
                onChange={(event) => setSelectedTask(event.target.value as TaskKey)}
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base font-semibold text-[#10243A] shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
              >
                {tasks.map((task) => <option key={task.key} value={task.key}>{task.label}{typeof task.count === "number" ? ` · ${task.count}` : ""}</option>)}
              </select>
            </div>

            <aside className="hidden h-fit rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:block">
              <p className="px-2 pb-2 text-[10px] font-bold tracking-[0.16em] text-slate-400">TASKS</p>
              <nav aria-label="Dashboard tasks" className="flex flex-col gap-1.5">
                {tasks.map((task) => <button key={task.key} type="button" onClick={() => setSelectedTask(task.key)} aria-pressed={selectedTask === task.key} className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold transition ${selectedTask === task.key ? "bg-[#10243A] text-white shadow-sm" : "text-slate-600 hover:bg-amber-50 hover:text-[#10243A]"}`}>
                  <span>{task.label}</span>{typeof task.count === "number" && <span className={`rounded-full px-2 py-0.5 text-[11px] tabular-nums ${selectedTask === task.key ? "bg-amber-400 text-[#10243A]" : "bg-slate-100 text-slate-600"}`}>{task.count}</span>}
                </button>)}
              </nav>
            </aside>

            <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              {selectedTask === "properties" && <><SectionHeading href="/admin/properties">Property Listings</SectionHeading><MetricGrid section={stats.properties} metrics={propertyMetrics} emptyMessage="No property records yet." /></>}
              {selectedTask === "addProperty" && <><SectionHeading href="/admin/properties/new">Add Property</SectionHeading><Link href="/admin/properties/new" className="inline-flex rounded-lg bg-[#FBBF24] px-5 py-3 text-sm font-bold text-[#10243A] hover:bg-amber-300">Open Property Form</Link></>}
              {selectedTask === "visits" && <><SectionHeading href="/admin/visits">Visit Requests</SectionHeading><MetricGrid section={stats.visits} metrics={visitMetrics} emptyMessage="No visit records yet." /></>}
              {selectedTask === "enquiries" && <><SectionHeading href="/admin/enquiries">Customer Enquiries</SectionHeading><MetricGrid section={stats.enquiries} metrics={enquiryMetrics} emptyMessage="No enquiry records yet." /></>}
              {selectedTask === "managers" && <><SectionHeading href="/admin/managers">Managers</SectionHeading><Link href="/admin/managers" className="inline-flex rounded-lg bg-[#FBBF24] px-5 py-3 text-sm font-bold text-[#10243A] hover:bg-amber-300">Open Manager Management</Link></>}
              {selectedTask === "submissions" && <><SectionHeading href="/admin/submissions">Property Submissions</SectionHeading><MetricGrid section={stats.submissions} metrics={submissionMetrics} emptyMessage="No submission records yet." /></>}
              {selectedTask === "serviceRequests" && <><SectionHeading href="/admin/services">Service Requests</SectionHeading><MetricGrid section={stats.serviceRequests} metrics={requestMetrics} emptyMessage="No service requests yet." /></>}
              {selectedTask === "vendors" && <><SectionHeading href="/admin/services/vendors">Vendor Management</SectionHeading><MetricGrid section={stats.vendors} metrics={vendorMetrics} emptyMessage="No vendors registered yet." /></>}
              {selectedTask === "requirements" && <><SectionHeading href="/admin/requirements">Customer Requirements</SectionHeading><MetricGrid section={stats.requirements} metrics={requirementMetrics} emptyMessage="No requirements submitted yet." /></>}
              {selectedTask === "googleLeads" && <><SectionHeading href="/admin/google-form-requirements">Google Form Leads</SectionHeading><Link href="/admin/google-form-requirements" className="inline-flex rounded-lg bg-[#FBBF24] px-5 py-3 text-sm font-bold text-[#10243A] hover:bg-amber-300">Open Google Form Leads</Link></>}
              {selectedTask === "loans" && <><h3 className="text-lg font-bold text-[#10243A]">Loan Requests</h3><p className="mt-2 text-sm text-slate-600">Admin monitoring screen is not connected yet. This module is listed here so it remains visible; loan request data and review actions still need to be integrated.</p></>}
              {selectedTask === "matches" && <><h3 className="text-lg font-bold text-[#10243A]">Matches</h3><p className="mt-2 text-sm text-slate-600">Admin monitoring screen is not connected yet. Matching activity and requirement oversight still need to be integrated here.</p></>}
              {selectedTask === "referrals" && <><h3 className="text-lg font-bold text-[#10243A]">Referrals</h3><p className="mt-2 text-sm text-slate-600">Admin monitoring screen is not connected yet. Referral tracking, reward verification and payout status still need to be integrated here.</p></>}
              {selectedTask === "policies" && <><SectionHeading href="/admin/policies">Policies</SectionHeading><Link href="/admin/policies" className="inline-flex rounded-lg bg-[#FBBF24] px-5 py-3 text-sm font-bold text-[#10243A] hover:bg-amber-300">Open Policy Management</Link></>}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
