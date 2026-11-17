"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminLogoutButton from "../../components/AdminLogoutButton";
import { loadAdminReferrals, reviewAdminReferral, type AdminReferral, type ApprovedReferralProperty } from "./actions";

type Draft = {
  propertyId: string;
  transactionType: "rental" | "resale" | "";
  dealSource: "naren_realty" | "direct_owner" | "other_broker" | "market" | "";
  dealCompletedAt: string;
  rentalAgreementExecuted: boolean;
  evidenceNotes: string;
  adminNotes: string;
  paymentReference: string;
};

function toDraft(row: AdminReferral): Draft {
  return {
    propertyId: row.property_id ?? "",
    transactionType: row.transaction_type ?? "",
    dealSource: row.deal_source ?? "",
    dealCompletedAt: row.deal_completed_at ? row.deal_completed_at.slice(0, 10) : "",
    rentalAgreementExecuted: row.rental_agreement_executed,
    evidenceNotes: row.evidence_notes ?? "",
    adminNotes: row.admin_notes ?? "",
    paymentReference: row.payment_reference ?? "",
  };
}

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default function AdminReferralsPage() {
  const [referrals, setReferrals] = useState<AdminReferral[]>([]);
  const [properties, setProperties] = useState<ApprovedReferralProperty[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function refresh() {
    setLoading(true);
    try {
      const result = await loadAdminReferrals();
      setReferrals(result.referrals);
      setProperties(result.properties);
      setDrafts(Object.fromEntries(result.referrals.map((row) => [row.id, toDraft(row)])));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Referral records could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  const filtered = useMemo(() => referrals.filter((row) => filter === "all" || row.status === filter), [referrals, filter]);

  function changeDraft(id: string, patch: Partial<Draft>) {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  }

  async function save(row: AdminReferral, status: "pending" | "eligible" | "approved" | "paid" | "rejected") {
    const draft = drafts[row.id];
    if (!draft) return;
    setSaving(row.id);
    setError("");
    setNotice("");
    try {
      await reviewAdminReferral({
        id: row.id,
        status,
        propertyId: draft.propertyId || null,
        transactionType: draft.transactionType || null,
        dealSource: draft.dealSource || null,
        dealCompletedAt: draft.dealCompletedAt || null,
        rentalAgreementExecuted: draft.rentalAgreementExecuted,
        evidenceNotes: draft.evidenceNotes,
        adminNotes: draft.adminNotes,
        paymentReference: draft.paymentReference,
      });
      setNotice(`Referral ${row.id.slice(0, 8)} updated: ${status}.`);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Referral could not be updated.");
    } finally {
      setSaving(null);
    }
  }

  return <main className="min-h-screen bg-slate-50 text-slate-900">
    <header className="bg-[#10243A] text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-6">
        <div><p className="text-xs font-bold tracking-[0.18em] text-amber-400">NAREN REALTY</p><h1 className="mt-1 text-xl font-bold">Referral Review &amp; Rewards</h1></div>
        <nav className="flex flex-wrap gap-2"><Link href="/admin" className="rounded-lg border border-white/30 px-3 py-2 text-sm font-semibold">Dashboard</Link><Link href="/referral-policy" className="rounded-lg border border-white/30 px-3 py-2 text-sm font-semibold">Public Policy</Link><AdminLogoutButton /></nav>
      </div>
    </header>
    <section className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-5">
        <div><p className="text-xs font-bold tracking-[0.16em] text-amber-700">ADMIN CONTROL</p><h2 className="mt-2 text-3xl font-bold text-[#10243A]">Referral verification</h2><p className="mt-2 text-sm text-slate-600">Only NAREN REALTY sourced transactions can qualify. External, direct and market deals must be rejected.</p></div>
        <div className="flex gap-2"><select aria-label="Filter referrals" value={filter} onChange={(event) => setFilter(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="all">All statuses</option><option value="pending">Pending</option><option value="eligible">Eligible</option><option value="approved">Approved</option><option value="paid">Paid</option><option value="rejected">Rejected</option></select><button onClick={() => void refresh()} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Refresh</button></div>
      </div>
      {error && <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {notice && <p role="status" className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      {loading ? <p className="mt-6 rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">Loading referrals...</p> : filtered.length === 0 ? <p className="mt-6 rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">No referral records found.</p> : <div className="mt-6 space-y-5">
        {filtered.map((row) => {
          const draft = drafts[row.id] ?? toDraft(row);
          const ownerProperties = properties.filter((property) => row.referral_type !== "owner" || property.owner_id === row.referred_user_id);
          const isExternal = draft.dealSource !== "naren_realty";
          return <article key={row.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase text-slate-700">{row.referral_type} referral</span><h3 className="mt-2 text-lg font-bold text-[#10243A]">{row.referrer?.full_name ?? "Referrer"} → {row.referred?.full_name ?? "Referred user"}</h3><p className="mt-1 text-sm text-slate-600">Referrer: {row.referrer?.phone ?? "No phone"} · Referred: {row.referred?.phone ?? "No phone"}</p><p className="mt-1 text-xs text-slate-500">Registered {dateLabel(row.created_at)} · Reward ₹{row.reward_amount.toLocaleString("en-IN")} · ID {row.id}</p></div>
              <span className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize ${row.status === "paid" ? "bg-emerald-100 text-emerald-800" : row.status === "rejected" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-900"}`}>{row.status}</span>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-sm font-semibold text-slate-700">Transaction source<select value={draft.dealSource} onChange={(event) => changeDraft(row.id, { dealSource: event.target.value as Draft["dealSource"] })} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-3"><option value="">Select source</option><option value="naren_realty">NAREN REALTY platform</option><option value="direct_owner">Direct owner / customer</option><option value="other_broker">Other broker / agent</option><option value="market">Open market / external channel</option></select></label>
              <label className="text-sm font-semibold text-slate-700">Transaction type<select value={draft.transactionType} onChange={(event) => changeDraft(row.id, { transactionType: event.target.value as Draft["transactionType"] })} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-3"><option value="">Select type</option><option value="rental">Rental</option><option value="resale">Resale</option></select></label>
              <label className="text-sm font-semibold text-slate-700">Linked property<select value={draft.propertyId} onChange={(event) => changeDraft(row.id, { propertyId: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-3"><option value="">Select approved property</option>{ownerProperties.map((property) => <option key={property.id} value={property.id}>{property.title} · {property.locality ?? "Location unavailable"} · {property.id.slice(0, 8)}</option>)}</select></label>
              <label className="text-sm font-semibold text-slate-700">Deal completion date<input type="date" value={draft.dealCompletedAt} onChange={(event) => changeDraft(row.id, { dealCompletedAt: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-3" /></label>
              {row.referral_type === "tenant" && <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm font-semibold text-slate-700 sm:col-span-2"><input type="checkbox" checked={draft.rentalAgreementExecuted} onChange={(event) => changeDraft(row.id, { rentalAgreementExecuted: event.target.checked })} /> Rent / Leave &amp; License Agreement executed (Admin confirms)</label>}
              <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Evidence notes<textarea value={draft.evidenceNotes} onChange={(event) => changeDraft(row.id, { evidenceNotes: event.target.value })} rows={2} maxLength={3000} placeholder="NAREN REALTY enquiry/visit reference, communication trail, confirmation details..." className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 font-normal" /></label>
              <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Admin notes<textarea value={draft.adminNotes} onChange={(event) => changeDraft(row.id, { adminNotes: event.target.value })} rows={2} maxLength={3000} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 font-normal" /></label>
              {row.status === "approved" && <label className="text-sm font-semibold text-slate-700">Payment reference<input value={draft.paymentReference} onChange={(event) => changeDraft(row.id, { paymentReference: event.target.value })} maxLength={200} placeholder="UPI / bank UTR" className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 font-normal" /></label>}
            </div>
            {isExternal && draft.dealSource && <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800">No reward: this source is outside NAREN REALTY. Reject this referral claim.</p>}
            <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              <button disabled={saving === row.id} onClick={() => void save(row, "pending")} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold">Save pending</button>
              <button disabled={saving === row.id || isExternal} onClick={() => void save(row, "eligible")} className="rounded-lg bg-[#10243A] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40">Verify eligible</button>
              <button disabled={saving === row.id || row.status !== "eligible" || isExternal} onClick={() => void save(row, "approved")} className="rounded-lg border border-emerald-700 px-4 py-2.5 text-sm font-bold text-emerald-800 disabled:opacity-40">Approve reward</button>
              <button disabled={saving === row.id || row.status !== "approved" || !draft.paymentReference.trim()} onClick={() => void save(row, "paid")} className="rounded-lg border border-emerald-700 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-800 disabled:opacity-40">Mark paid</button>
              <button disabled={saving === row.id || row.status === "paid"} onClick={() => void save(row, "rejected")} className="rounded-lg border border-rose-300 px-4 py-2.5 text-sm font-bold text-rose-800 disabled:opacity-40">Reject / No reward</button>
              {saving === row.id && <span className="self-center text-sm text-slate-500">Saving...</span>}
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">Approval requires platform source, exact linked property, completion date and evidence checks. Tenant reward additionally requires rental + agreement executed + same-property enquiry/visit. Paid status requires payment reference.</p>
          </article>;
        })}
      </div>}
    </section>
  </main>;
}
