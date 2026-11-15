"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import AdminLogoutButton from "../components/AdminLogoutButton";
import { loadAdminDashboardStats } from "./actions";
import type {
  AdminDashboardSection,
  AdminDashboardStats,
} from "../lib/admin-supabase-data";

type IconName = "building" | "clock" | "check" | "x" | "calendar" | "message" | "activity" | "wrench" | "store" | "search" | "file";

type DashboardMetric = {
  label: string;
  value: number;
  href: string;
  tone: "navy" | "amber" | "green" | "red";
  icon: IconName;
  prominent?: boolean;
};

const toneStyles = {
  navy: { border: "border-l-[#10243A]", icon: "bg-slate-100 text-[#10243A]" },
  amber: { border: "border-l-amber-500", icon: "bg-amber-50 text-amber-700" },
  green: { border: "border-l-emerald-600", icon: "bg-emerald-50 text-emerald-700" },
  red: { border: "border-l-rose-600", icon: "bg-rose-50 text-rose-700" },
};

function MetricIcon({ name }: { name: IconName }) {
  let shape: ReactNode;
  switch (name) {
    case "building":
      shape = <><path d="M4 20V4h10v16" /><path d="M14 9h6v11" /><path d="M7 7h1M10 7h1M7 10h1M10 10h1M7 13h1M10 13h1M17 12h1M17 15h1" /></>;
      break;
    case "clock":
      shape = <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>;
      break;
    case "check":
      shape = <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></>;
      break;
    case "x":
      shape = <><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6m0-6-6 6" /></>;
      break;
    case "calendar":
      shape = <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>;
      break;
    case "message":
      shape = <><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2v-6a7.5 7.5 0 1 1 17-3.5Z" /><path d="M8 11h8M8 14h5" /></>;
      break;
    case "activity":
      shape = <><path d="M3 12h4l3-8 4 16 3-8h4" /></>;
      break;
    case "wrench":
      shape = <><path d="M14.7 6.3a5 5 0 0 0-6.4 6.4L3 18l3 3 5.3-5.3a5 5 0 0 0 6.4-6.4L14 12l-2-2 2.7-3.7Z" /></>;
      break;
    case "store":
      shape = <><path d="M4 10v10h16V10M3 10l2-6h14l2 6" /><path d="M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M9 20v-6h6v6" /></>;
      break;
    case "search":
      shape = <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5M8 10h5M10.5 8v5" /></>;
      break;
    case "file":
      shape = <><path d="M6 3h8l5 5v13H6z" /><path d="M14 3v5h5M9 13h7M9 17h7" /></>;
      break;
  }

  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-5">{shape}</svg>;
}

function MetricCard({ label, value, href, tone, icon, prominent }: DashboardMetric) {
  const styles = toneStyles[tone];
  return (
    <Link
      href={href}
      aria-label={`${label}: ${value}. View related admin records.`}
      className={`group flex min-h-32 min-w-0 flex-col justify-between rounded-xl border border-slate-200 border-l-4 ${styles.border} ${prominent ? "bg-amber-50/70 ring-1 ring-amber-200" : "bg-white"} p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 sm:p-5`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="min-h-10 text-sm font-semibold leading-5 text-slate-600">{label}</span>
        <span className={`inline-flex size-9 shrink-0 items-center justify-center rounded-lg ${styles.icon}`}>
          <MetricIcon name={icon} />
        </span>
      </div>
      <div className="mt-4 flex items-end justify-between gap-2">
        <span className="text-3xl font-bold tabular-nums text-[#10243A]">{value.toLocaleString("en-IN")}</span>
        <span className="pb-1 text-xs font-semibold text-slate-400 group-hover:text-amber-700">View</span>
      </div>
    </Link>
  );
}

function MetricsGrid({
  section,
  metrics,
  emptyMessage,
  columns = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
}: {
  section: AdminDashboardSection<unknown>;
  metrics: DashboardMetric[];
  emptyMessage: string;
  columns?: string;
}) {
  if (section.state !== "available") {
    return (
      <p role={section.state === "error" ? "alert" : "status"} className={`mt-4 rounded-lg border px-4 py-3 text-sm ${section.state === "error" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
        {section.message}
      </p>
    );
  }

  return (
    <>
      <div className={`mt-4 grid ${columns} gap-3`}>
        {metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}
      </div>
      {metrics.every((metric) => metric.value === 0) && (
        <p role="status" className="mt-3 text-sm text-slate-500">{emptyMessage}</p>
      )}
    </>
  );
}

function DashboardSection({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-[#10243A] sm:text-2xl">{title}</h2>
        <Link href={href} className="shrink-0 text-sm font-semibold text-amber-800 underline-offset-4 hover:underline">
          View All
        </Link>
      </div>
      {children}
    </section>
  );
}

function metric(
  label: string,
  value: number,
  href: string,
  tone: DashboardMetric["tone"],
  icon: IconName,
  prominent = false,
): DashboardMetric {
  return { label, value, href, tone, icon, prominent };
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    loadAdminDashboardStats()
      .then((nextStats) => {
        if (active) {
          setStats(nextStats);
          setError("");
        }
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Dashboard data could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [retryKey]);

  function retryDashboard() {
    setError("");
    setLoading(true);
    setRetryKey((current) => current + 1);
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-[#10243A] text-white">
        <div className="mx-auto flex max-w-[88rem] flex-col gap-4 px-4 py-5 sm:px-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="shrink-0">
            <p className="text-xs font-bold tracking-[0.18em] text-amber-400">NAREN REALTY</p>
            <h1 className="mt-1 text-xl font-bold">Admin Dashboard</h1>
          </div>
          <nav aria-label="Admin navigation" className="flex w-full min-w-0 flex-nowrap items-center gap-2 overflow-x-auto pb-2 text-sm [scrollbar-width:thin] xl:flex-1 xl:justify-end">
            <Link href="/admin/properties/new" className="inline-flex h-10 shrink-0 items-center rounded-lg bg-amber-400 px-3 font-bold text-slate-950 transition hover:bg-amber-300">Add Property</Link>
            <Link href="/admin/properties" className="inline-flex h-10 shrink-0 items-center rounded-lg border border-white/25 px-3 font-semibold text-white transition hover:bg-white/10">Properties</Link>
            <Link href="/admin/enquiries" className="inline-flex h-10 shrink-0 items-center rounded-lg border border-white/25 px-3 font-semibold text-white transition hover:bg-white/10">Enquiries</Link>
            <Link href="/admin/visits" className="inline-flex h-10 shrink-0 items-center rounded-lg border border-white/25 px-3 font-semibold text-white transition hover:bg-white/10">Visit Requests</Link>
            <Link href="/admin/submissions" className="inline-flex h-10 shrink-0 items-center rounded-lg border border-white/25 px-3 font-semibold text-white transition hover:bg-white/10">Submissions</Link>
            <Link href="/admin/services" className="inline-flex h-10 shrink-0 items-center rounded-lg border border-white/25 px-3 font-semibold text-white transition hover:bg-white/10">Home Services</Link>
            <Link href="/admin/requirements" className="inline-flex h-10 shrink-0 items-center rounded-lg border border-white/25 px-3 font-semibold text-white transition hover:bg-white/10">Requirements</Link>
            <Link href="/admin/google-form-requirements" className="inline-flex h-10 shrink-0 items-center rounded-lg border border-amber-300/50 bg-amber-400/10 px-3 font-semibold text-amber-200 transition hover:bg-amber-400/20">Google Form Leads</Link>
            <Link href="/admin/loans" className="inline-flex h-10 shrink-0 items-center rounded-lg border border-white/25 px-3 font-semibold text-white transition hover:bg-white/10">Loan Requests</Link>
            <Link href="/admin/policies" className="inline-flex h-10 shrink-0 items-center rounded-lg border border-white/25 px-3 font-semibold text-white transition hover:bg-white/10">Policies</Link>
            <Link href="/" className="inline-flex h-10 shrink-0 items-center rounded-lg border border-white/25 px-3 font-semibold text-white transition hover:bg-white/10">Website</Link>
            <AdminLogoutButton className="inline-flex h-10 shrink-0 items-center rounded-lg border border-white/25 px-3 font-semibold text-white transition hover:bg-white/10 hover:text-white" />
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-5 px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-amber-700">OPERATIONS OVERVIEW</p>
            <h2 className="mt-2 text-3xl font-bold text-[#10243A]">Dashboard</h2>
            <p className="mt-2 text-sm text-slate-600">Live record counts from the authenticated Supabase session.</p>
          </div>
          <button type="button" onClick={retryDashboard} disabled={loading} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#10243A] transition hover:border-amber-500 disabled:cursor-wait disabled:opacity-60">
            {loading ? "Loading..." : "Refresh metrics"}
          </button>
        </div>

        {loading && <p role="status" className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">Loading dashboard metrics...</p>}
        {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}

        {!loading && !error && stats && (
          <>
            <DashboardSection title="A. Property Listings" href="/admin/properties">
              <MetricsGrid
                section={stats.properties}
                emptyMessage="No property listings have been recorded yet."
                metrics={stats.properties.state === "available" ? [
                  metric("Total Properties", stats.properties.metrics.totalProperties, "/admin/properties", "navy", "building"),
                  metric("Pending Approvals", stats.properties.metrics.pendingProperties, "/admin/properties?status=pending", "amber", "clock"),
                  metric("Approved Properties", stats.properties.metrics.approvedProperties, "/admin/properties?status=approved", "green", "check"),
                  metric("Rejected Properties", stats.properties.metrics.rejectedProperties, "/admin/properties?status=rejected", "red", "x"),
                ] : []}
              />
            </DashboardSection>

            <DashboardSection title="B. Property Visits" href="/admin/visits">
              <MetricsGrid
                section={stats.visits}
                emptyMessage="No property visits have been recorded yet."
                metrics={stats.visits.state === "available" ? [
                  metric("Total Visits", stats.visits.metrics.totalVisits, "/admin/visits", "navy", "calendar"),
                  metric("Pending Visits", stats.visits.metrics.pendingVisits, "/admin/visits", "amber", "clock", true),
                  metric("Confirmed Visits", stats.visits.metrics.confirmedVisits, "/admin/visits", "green", "check"),
                  metric("Completed Visits", stats.visits.metrics.completedVisits, "/admin/visits", "green", "check"),
                  metric("Cancelled Visits", stats.visits.metrics.cancelledVisits, "/admin/visits", "red", "x"),
                  metric("Today's Visits", stats.visits.metrics.todaysVisits, "/admin/visits", "navy", "calendar"),
                ] : []}
              />
            </DashboardSection>

            <DashboardSection title="C. Customer Enquiries" href="/admin/enquiries">
              <MetricsGrid
                section={stats.enquiries}
                emptyMessage="No customer enquiries have been recorded yet."
                metrics={stats.enquiries.state === "available" ? [
                  metric("Total Enquiries", stats.enquiries.metrics.totalEnquiries, "/admin/enquiries", "navy", "message"),
                  metric("New Enquiries", stats.enquiries.metrics.newEnquiries, "/admin/enquiries?status=New", "amber", "clock"),
                  metric("In Progress", stats.enquiries.metrics.inProgressEnquiries, "/admin/enquiries", "amber", "activity"),
                  metric("Deals Closed", stats.enquiries.metrics.dealClosedEnquiries, "/admin/enquiries?status=Deal%20Closed", "green", "check"),
                ] : []}
              />
            </DashboardSection>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <h2 className="text-xl font-bold text-[#10243A] sm:text-2xl">D. Home Services</h2>
              <div className="mt-5 grid gap-6 xl:grid-cols-2">
                <section className="min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-lg font-bold text-[#10243A]">Service Requests</h3>
                    <Link href="/admin/services" className="text-sm font-semibold text-amber-800 underline-offset-4 hover:underline">View All</Link>
                  </div>
                  <MetricsGrid
                    section={stats.serviceRequests}
                    emptyMessage="No home service requests have been recorded yet."
                    columns="grid-cols-2 gap-3"
                    metrics={stats.serviceRequests.state === "available" ? [
                      metric("Total Requests", stats.serviceRequests.metrics.totalRequests, "/admin/services", "navy", "wrench"),
                      metric("Pending", stats.serviceRequests.metrics.pendingRequests, "/admin/services", "amber", "clock"),
                      metric("In Progress", stats.serviceRequests.metrics.inProgressRequests, "/admin/services", "amber", "activity"),
                      metric("Completed", stats.serviceRequests.metrics.completedRequests, "/admin/services", "green", "check"),
                    ] : []}
                  />
                </section>
                <section className="min-w-0 border-t border-slate-200 pt-5 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-lg font-bold text-[#10243A]">Vendor Management</h3>
                    <Link href="/admin/services/vendors" className="text-sm font-semibold text-amber-800 underline-offset-4 hover:underline">View All</Link>
                  </div>
                  <MetricsGrid
                    section={stats.vendors}
                    emptyMessage="No vendor records have been recorded yet."
                    columns="grid-cols-2 gap-3"
                    metrics={stats.vendors.state === "available" ? [
                      metric("Total Vendors", stats.vendors.metrics.totalVendors, "/admin/services/vendors", "navy", "store"),
                      metric("Pending Approvals", stats.vendors.metrics.pendingVendors, "/admin/services/vendors", "amber", "clock"),
                      metric("Approved Vendors", stats.vendors.metrics.approvedVendors, "/admin/services/vendors", "green", "check"),
                      metric("Rejected Vendors", stats.vendors.metrics.rejectedVendors, "/admin/services/vendors", "red", "x"),
                    ] : []}
                  />
                </section>
              </div>
            </section>

            <DashboardSection title="E. Customer Requirements" href="/admin/requirements">
              <MetricsGrid
                section={stats.requirements}
                emptyMessage="No customer requirements have been recorded yet."
                metrics={stats.requirements.state === "available" ? [
                  metric("Total Requirements", stats.requirements.metrics.totalRequirements, "/admin/requirements", "navy", "search"),
                  metric("New Requirements", stats.requirements.metrics.newRequirements, "/admin/requirements", "amber", "clock"),
                  metric("Pending Requirements", stats.requirements.metrics.pendingRequirements, "/admin/requirements", "amber", "activity"),
                ] : []}
              />
            </DashboardSection>

            <DashboardSection title="F. Property Submissions" href="/admin/submissions">
              <MetricsGrid
                section={stats.submissions}
                emptyMessage="No customer submissions have been recorded yet."
                metrics={stats.submissions.state === "available" ? [
                  metric("Total Submissions", stats.submissions.metrics.totalSubmissions, "/admin/submissions", "navy", "file"),
                  metric("Pending Review", stats.submissions.metrics.pendingSubmissions, "/admin/submissions", "amber", "clock"),
                  metric("Approved", stats.submissions.metrics.approvedSubmissions, "/admin/submissions", "green", "check"),
                  metric("Rejected", stats.submissions.metrics.rejectedSubmissions, "/admin/submissions", "red", "x"),
                ] : []}
              />
            </DashboardSection>
          </>
        )}
      </div>
    </main>
  );
}
