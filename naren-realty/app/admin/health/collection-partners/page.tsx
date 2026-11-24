import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "../../../lib/supabase-server";
import ResendLoginForm from "./resend-login-form";
import {
  approveCollectionPartnerApplication,
  rejectCollectionPartnerApplication,
  setCollectionPartnerActive,
} from "./actions";

export const metadata = { title: "Collection Partners | MFIT Healthcare Admin" };

async function CollectionPartnersContent() {
  await connection();
  try { await requireAdmin(); } catch { redirect("/admin/login"); }
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!key || !url) throw new Error("MFIT admin service is not configured.");
  const db = createClient(url, key, { auth: { persistSession: false } });

  const [{ data: applications, error: appError }, { data: partners, error: partnerError }] = await Promise.all([
    db.from("health_collection_partner_applications")
      .select("id,business_name,contact_name,phone,email,address,service_areas,gstin,pan,notes,status,review_note,created_at,created_partner_id")
      .order("created_at", { ascending: false }),
    db.from("health_collection_partners")
      .select("id,display_name,contact_name,phone,email,service_areas,is_active,verified_at,created_at,public_slug")
      .order("created_at", { ascending: false }),
  ]);
  if (appError || partnerError) throw new Error("Collection partner records could not be loaded.");

  const apps = applications || [];
  const activePartners = partners || [];
  const pending = apps.filter((item) => item.status === "pending_review").length;
  const approved = apps.filter((item) => item.status === "approved").length;
  const rejected = apps.filter((item) => item.status === "rejected").length;
  const date = (value: string | null) => value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";

  return <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900">
    <div className="mx-auto max-w-6xl">
      <Link href="/admin/health" className="text-sm font-semibold text-slate-600">‹ Back to MFIT Diagnostic Operations</Link>
      <header className="mt-4 rounded-3xl bg-[#0b7778] p-6 text-white">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-teal-100">MFIT Healthcare</p>
        <h1 className="mt-2 text-2xl font-extrabold">Collection Partners</h1>
        <p className="mt-2 max-w-3xl text-sm text-teal-50">Review independent collection partner applications and manage their separate partner login access. This module is separate from MFIT Lab Partners and the internal Lab Team.</p>
      </header>

      <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Pending Review", pending],
          ["Approved Applications", approved],
          ["Rejected Applications", rejected],
          ["Registered Partners", activePartners.length],
        ].map(([label, value]) => <div key={String(label)} className="rounded-2xl border bg-white p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-extrabold">{value}</p></div>)}
      </section>

      <section className="mt-7">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><h2 className="text-lg font-extrabold">Partner Applications</h2><p className="text-sm text-slate-500">Verify details before approving. A secure password setup email is sent after approval.</p></div>
          <Link href="/collection-partner/apply" target="_blank" className="rounded-lg border border-teal-700 px-3 py-2 text-xs font-bold text-teal-800">Open application form ↗</Link>
        </div>
        <div className="mt-3 space-y-3">
          {apps.length === 0 && <div className="rounded-xl border bg-white p-5 text-sm text-slate-500">No applications received yet.</div>}
          {apps.map((app) => <article key={app.id} className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h3 className="font-extrabold">{app.business_name || app.contact_name}</h3><p className="mt-1 text-sm text-slate-600">{app.contact_name} · {app.phone}</p><p className="text-sm text-slate-600">{app.email}</p></div>
              <span className={"rounded-full px-3 py-1 text-xs font-bold " + (app.status === "pending_review" ? "bg-amber-100 text-amber-800" : app.status === "approved" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800")}>{app.status === "pending_review" ? "Pending Review" : app.status === "approved" ? "Approved" : "Rejected"}</span>
            </div>
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div><p className="text-xs font-semibold uppercase text-slate-400">Address</p><p>{app.address}</p></div>
              <div><p className="text-xs font-semibold uppercase text-slate-400">Service areas</p><p>{(app.service_areas || []).join(", ") || "—"}</p></div>
              <div><p className="text-xs font-semibold uppercase text-slate-400">GSTIN / PAN</p><p>{app.gstin || "—"} / {app.pan || "—"}</p></div>
              <div><p className="text-xs font-semibold uppercase text-slate-400">Submitted</p><p>{date(app.created_at)}</p></div>
            </div>
            {app.notes && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm"><b>Applicant notes:</b> {app.notes}</p>}
            {app.review_note && <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm"><b>Review note:</b> {app.review_note}</p>}
            {app.status === "approved" && app.created_partner_id && <ResendLoginForm applicationId={app.id} />}
            {app.status === "pending_review" && <div className="mt-4 flex flex-wrap items-end gap-3 border-t pt-4">
              <form action={approveCollectionPartnerApplication}><input type="hidden" name="application_id" value={app.id}/><button className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white">Approve & Send Password Setup</button></form>
              <form action={rejectCollectionPartnerApplication} className="flex min-w-0 flex-1 flex-wrap items-end gap-2"><input type="hidden" name="application_id" value={app.id}/><label className="min-w-48 flex-1 text-xs font-semibold text-slate-500">Rejection / verification note<input name="review_note" maxLength={1000} placeholder="Optional reason" className="mt-1 w-full rounded-lg border p-2 text-sm font-normal"/></label><button className="rounded-lg border border-rose-300 px-4 py-2 text-sm font-bold text-rose-700">Reject</button></form>
            </div>}
          </article>)}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-extrabold">Registered Collection Partners</h2>
        <p className="text-sm text-slate-500">Suspend or restore partner portal access without changing customer or lab-team roles.</p>
        <div className="mt-3 space-y-3">
          {activePartners.length === 0 && <div className="rounded-xl border bg-white p-5 text-sm text-slate-500">No registered collection partners yet.</div>}
          {activePartners.map((partner) => <article key={partner.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white p-5">
            <div className="min-w-0"><h3 className="font-extrabold">{partner.display_name}</h3><p className="mt-1 text-sm text-slate-600">{partner.contact_name || "—"} · {partner.phone || "—"}</p><p className="text-sm text-slate-600">{partner.email || "—"}</p><p className="mt-1 text-xs text-slate-500">Areas: {(partner.service_areas || []).join(", ") || "—"} · Slug: {partner.public_slug}</p></div>
            <div className="flex items-center gap-3"><span className={"rounded-full px-3 py-1 text-xs font-bold " + (partner.is_active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700")}>{partner.is_active ? "Active" : "Suspended"}</span><form action={setCollectionPartnerActive} className="flex items-center gap-2"><input type="hidden" name="partner_id" value={partner.id}/><label className="flex items-center gap-2 text-xs"><input type="checkbox" name="is_active" defaultChecked={partner.is_active}/> Active</label><button className="rounded-lg border px-3 py-2 text-xs font-bold">Save</button></form></div>
          </article>)}
        </div>
      </section>
    </div>
  </main>;
}

export default function CollectionPartnersPage() {
  return <Suspense fallback={<main className="min-h-screen bg-slate-50 p-8 text-center text-sm text-slate-500">Loading collection partners…</main>}><CollectionPartnersContent/></Suspense>;
}
