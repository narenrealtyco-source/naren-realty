"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminLogoutButton from "../../components/AdminLogoutButton";
import {
  loadAdminReferrals,
  loadAdminReferralRegister,
  reviewAdminReferral,
  type AdminReferral,
  type ApprovedReferralProperty,
  type ReferralRegisterRow,
  type ReferralRegisterType,
} from "./actions";

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

function dateLabel(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function dateOnly(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-IN", { dateStyle: "medium" });
}

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function exportRegister(type: ReferralRegisterType, rows: ReferralRegisterRow[]) {
  const headers = type === "tenant"
    ? ["Referral ID", "Referrer", "Referrer Phone", "Referred Tenant", "Tenant Phone", "Referral Code", "Referral Date", "Requirement Type", "Requirement Submitted", "Requirement Location", "Budget", "Enquiry Date", "Visit Date", "Reward", "Status"]
    : ["Referral ID", "Referrer", "Referrer Phone", "Referred Owner", "Owner Phone", "Referral Code", "Referral Date", "Property / Submission", "Property Listed Date", "Listing Approval Date", "Location", "Listing Status", "Reward", "Status"];
  const lines = rows.map(({ referral: r, referralCode, properties, submissions, requirements, googleRequirements, enquiries, visits }) => {
    const person = r.referred?.full_name ?? "Referred user";
    const common = [r.id, r.referrer?.full_name ?? "", r.referrer?.phone ?? "", person, r.referred?.phone ?? "", referralCode ?? "", dateLabel(r.created_at)];
    if (type === "tenant") {
      const req = [...requirements, ...googleRequirements].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
      const enquiry = enquiries[0];
      const visit = visits[0];
      return [...common, req?.requirement_type ?? "", req ? dateLabel(req.created_at) : "—", req?.preferred_location ?? "", req ? [req.min_budget, req.max_budget].filter(Boolean).join(" - ") : "", dateLabel(enquiry?.created_at), dateLabel(visit?.created_at), r.reward_amount, r.status];
    }
    const submission = submissions[0];
    const property = properties[0];
    return [...common, submission?.title ?? property?.title ?? "", dateLabel(submission?.created_at ?? property?.created_at), dateLabel(submission?.reviewed_at), submission?.locality ?? property?.locality ?? "", submission?.status ?? property?.status ?? "", r.reward_amount, r.status];
  });
  const csv = [headers, ...lines].map((line) => line.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob(["\\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `naren-realty-${type}-referrals.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function AdminReferralsPage() {
  const [selectedType, setSelectedType] = useState<ReferralRegisterType | null>(null);
  const [registerRows, setRegisterRows] = useState<ReferralRegisterRow[]>([]);
  const [properties, setProperties] = useState<ApprovedReferralProperty[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function refresh(type = selectedType) {
    if (!type) return;
    setLoading(true);
    try {
      const [register, review] = await Promise.all([
        loadAdminReferralRegister(type),
        loadAdminReferrals(),
      ]);
      const typedReview = review.referrals.filter((row) => row.referral_type === type);
      setRegisterRows(register);
      setProperties(review.properties);
      setDrafts(Object.fromEntries(typedReview.map((row) => [row.id, toDraft(row)])));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Referral records could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (selectedType) void refresh(selectedType); }, [selectedType]);

  const filtered = useMemo(() => registerRows.filter(({ referral: row }) => {
    const statusMatch = filter === "all" || row.status === filter;
    const needle = search.trim().toLowerCase();
    const searchMatch = !needle || [
      row.referrer?.full_name, row.referrer?.phone, row.referred?.full_name,
      row.referred?.phone, row.id,
    ].some((value) => String(value ?? "").toLowerCase().includes(needle));
    return statusMatch && searchMatch;
  }), [registerRows, filter, search]);

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
        id: row.id, status, propertyId: draft.propertyId || null,
        transactionType: draft.transactionType || null, dealSource: draft.dealSource || null,
        dealCompletedAt: draft.dealCompletedAt || null,
        rentalAgreementExecuted: draft.rentalAgreementExecuted,
        evidenceNotes: draft.evidenceNotes, adminNotes: draft.adminNotes,
        paymentReference: draft.paymentReference,
      });
      setNotice(`Referral ${row.id.slice(0, 8)} updated: ${status}.`);
      await refresh(selectedType);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Referral could not be updated.");
    } finally {
      setSaving(null);
    }
  }

  const tenantCount = registerRows.filter((r) => r.referral.referral_type === "tenant").length;
  const ownerCount = registerRows.filter((r) => r.referral.referral_type === "owner").length;

  return <main className="min-h-screen bg-slate-50 text-slate-900">
    <header className="bg-[#10243A] text-white">
      <div className="mx-auto flex max-w-[96rem] flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-6">
        <div><p className="text-xs font-bold tracking-[0.18em] text-amber-400">NAREN REALTY</p><h1 className="mt-1 text-xl font-bold">Referral Management</h1></div>
        <nav className="flex flex-wrap gap-2"><Link href="/admin" className="rounded-lg border border-white/30 px-3 py-2 text-sm font-semibold">Dashboard</Link><Link href="/referral-policy" className="rounded-lg border border-white/30 px-3 py-2 text-sm font-semibold">Referral Policy</Link><Link href="/admin/referral-rewards" className="rounded-lg border border-amber-300 px-3 py-2 text-sm font-semibold text-amber-300">Approved / Waiting Rewards</Link><AdminLogoutButton /></nav>
      </div>
    </header>
    <section className="mx-auto max-w-[96rem] px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-5">
        <div><p className="text-xs font-bold tracking-[0.16em] text-amber-700">ADMIN CONTROL</p><h2 className="mt-2 text-2xl font-bold text-[#10243A] sm:text-3xl">Referral Register</h2><p className="mt-2 text-sm text-slate-600">Choose a referral register to view the referrer, referred person and their activity timeline in a spreadsheet-style register.</p></div>
        {selectedType && <button onClick={() => { setSelectedType(null); setRegisterRows([]); setFilter("all"); setSearch(""); setExpandedId(null); }} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold">← All referral types</button>}
      </div>
      {error && <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {notice && <p role="status" className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

      {!selectedType ? <div className="mt-7 grid gap-5 md:grid-cols-2">
        <button type="button" onClick={() => setSelectedType("tenant")} className="group rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-amber-400 hover:shadow-md sm:p-8">
          <div className="flex items-start justify-between"><span className="rounded-xl bg-sky-50 p-3 text-2xl">🏠</span><span className="text-sm font-bold text-amber-800 group-hover:underline">Open Register →</span></div>
          <h3 className="mt-5 text-xl font-bold text-[#10243A]">Tenant Referral</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">Who referred the tenant, when the tenant registered, when they submitted a property requirement, and their enquiries and visits.</p>
          <p className="mt-5 text-sm font-semibold text-slate-500">Tenant reward: ₹1,000 per approved qualifying referral</p>
        </button>
        <button type="button" onClick={() => setSelectedType("owner")} className="group rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-amber-400 hover:shadow-md sm:p-8">
          <div className="flex items-start justify-between"><span className="rounded-xl bg-amber-50 p-3 text-2xl">🏢</span><span className="text-sm font-bold text-amber-800 group-hover:underline">Open Register →</span></div>
          <h3 className="mt-5 text-xl font-bold text-[#10243A]">Owner Referral</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">Who referred the owner, when the owner registered, when they submitted/listed a property, and listing approval details.</p>
          <p className="mt-5 text-sm font-semibold text-slate-500">Owner reward: ₹2,000 per approved qualifying referral</p>
        </button>
      </div> : <>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div><h3 className="text-xl font-bold text-[#10243A]">{selectedType === "tenant" ? "Tenant Referral Register" : "Owner Referral Register"}</h3><p className="mt-1 text-sm text-slate-500">Spreadsheet view · {filtered.length.toLocaleString("en-IN")} records shown</p></div>
          <button type="button" onClick={() => exportRegister(selectedType, filtered)} disabled={!filtered.length} className="rounded-lg bg-[#10243A] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40">↓ Export Excel / CSV</button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, phone or referral ID" className="min-w-[220px] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm" />
          <select aria-label="Filter referrals by status" value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="all">All statuses</option><option value="pending">Pending</option><option value="eligible">Eligible</option><option value="approved">Approved</option><option value="paid">Paid</option><option value="rejected">Rejected</option></select>
          <button type="button" onClick={() => void refresh()} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold">Refresh</button>
        </div>
        {loading ? <p className="mt-5 rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">Loading referral register...</p> : <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1450px] w-full border-collapse text-left text-xs">
              <thead className="bg-[#10243A] text-white"><tr>
                <th className="sticky left-0 z-10 bg-[#10243A] px-3 py-3"># / Referral ID</th><th className="px-3 py-3">Referred By</th><th className="px-3 py-3">Referred Person</th><th className="px-3 py-3">Referral Code</th><th className="px-3 py-3">Referral Date</th>
                {selectedType === "tenant" ? <><th className="px-3 py-3">Requirement Filled</th><th className="px-3 py-3">Requirement Details</th><th className="px-3 py-3">Enquiry Date</th><th className="px-3 py-3">Visit Date</th></> : <><th className="px-3 py-3">Property Submitted / Listed</th><th className="px-3 py-3">Property / Location</th><th className="px-3 py-3">Listing Approval</th><th className="px-3 py-3">Listing Status</th></>}
                <th className="px-3 py-3">Reward</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Action</th>
              </tr></thead>
              <tbody>
                {filtered.map(({ referral: row, referralCode, properties: ownerProperties, submissions, requirements, googleRequirements, enquiries, visits }, index) => {
                  const req = [...requirements, ...googleRequirements].sort((a,b) => b.created_at.localeCompare(a.created_at))[0];
                  const submission = submissions[0];
                  const property = ownerProperties[0];
                  const isOpen = expandedId === row.id;
                  return <Fragment key={row.id}>
                    <tr className="border-t border-slate-200 align-top hover:bg-amber-50/40">
                      <td className="sticky left-0 z-[1] bg-white px-3 py-3 font-mono text-[10px] text-slate-500">{index + 1}<br />{row.id.slice(0, 8)}</td>
                      <td className="px-3 py-3"><strong className="block text-slate-800">{row.referrer?.full_name ?? "—"}</strong><span className="text-slate-500">{row.referrer?.phone ?? "—"}</span></td>
                      <td className="px-3 py-3"><strong className="block text-slate-800">{row.referred?.full_name ?? "—"}</strong><span className="text-slate-500">{row.referred?.phone ?? "—"}</span></td>
                      <td className="px-3 py-3">{referralCode ?? "—"}</td>
                      <td className="px-3 py-3 whitespace-nowrap">{dateLabel(row.created_at)}</td>
                      {selectedType === "tenant" ? <>
                        <td className="px-3 py-3 whitespace-nowrap">{dateLabel(req?.created_at)}</td>
                        <td className="max-w-[220px] px-3 py-3"><strong>{req?.requirement_type ?? "No requirement"}</strong><span className="block text-slate-500">{req?.property_category ?? ""} · {req?.preferred_location ?? "—"}</span><span className="block text-slate-500">{req ? `₹${req.min_budget ?? "—"} - ₹${req.max_budget ?? "—"}` : ""}</span></td>
                        <td className="px-3 py-3 whitespace-nowrap">{dateLabel(enquiries[0]?.created_at)}</td><td className="px-3 py-3 whitespace-nowrap">{dateLabel(visits[0]?.created_at)}</td>
                      </> : <>
                        <td className="px-3 py-3 whitespace-nowrap">{dateLabel(submission?.created_at ?? property?.created_at)}</td>
                        <td className="max-w-[220px] px-3 py-3"><strong>{submission?.title ?? property?.title ?? "No listing submitted"}</strong><span className="block text-slate-500">{submission?.locality ?? property?.locality ?? "—"}</span><span className="block font-mono text-[10px] text-slate-400">{submission?.id?.slice(0,8) ?? property?.id?.slice(0,8) ?? ""}</span></td>
                        <td className="px-3 py-3 whitespace-nowrap">{dateLabel(submission?.reviewed_at)}</td><td className="px-3 py-3 capitalize">{submission?.status ?? property?.status ?? "—"}</td>
                      </>}
                      <td className="px-3 py-3 font-semibold">₹{row.reward_amount.toLocaleString("en-IN")}</td><td className="px-3 py-3"><span className="rounded-full bg-slate-100 px-2 py-1 font-semibold capitalize">{row.status}</span></td>
                      <td className="px-3 py-3"><button type="button" onClick={() => setExpandedId(isOpen ? null : row.id)} className="whitespace-nowrap rounded-md border border-slate-300 px-3 py-2 font-semibold text-[#10243A]">{isOpen ? "Close" : "Review / Details"}</button></td>
                    </tr>
                    {isOpen && <tr className="border-t border-amber-200 bg-amber-50/40"><td colSpan={selectedType === "tenant" ? 13 : 13} className="p-4 sm:p-5">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h4 className="font-bold text-[#10243A]">Referral verification · {row.id.slice(0,8)}</h4><span className="text-xs text-slate-500">Full timeline and reward controls</span></div>
                      <div className="mb-4 grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-lg border border-slate-200 bg-white p-3"><strong>All requirement records</strong>{requirements.concat([]).map((r) => <p key={r.id} className="mt-1">{dateLabel(r.created_at)} · {r.requirement_type} · {r.preferred_location}</p>)}{googleRequirements.map((r) => <p key={r.id} className="mt-1">{dateLabel(r.created_at)} · Google Form · {r.preferred_location}</p>)}{!requirements.length && !googleRequirements.length && <p className="mt-1 text-slate-500">No requirement record found</p>}</div>
                        <div className="rounded-lg border border-slate-200 bg-white p-3"><strong>Property / listing records</strong>{ownerProperties.map((p) => <p key={p.id} className="mt-1">{p.title} · {dateLabel(p.created_at)} · {p.status}</p>)}{submissions.map((s) => <p key={s.id} className="mt-1">{s.title} · Submitted {dateLabel(s.created_at)} · Reviewed {dateLabel(s.reviewed_at)} · {s.status}</p>)}{!ownerProperties.length && !submissions.length && <p className="mt-1 text-slate-500">No listing record found</p>}</div>
                        <div className="rounded-lg border border-slate-200 bg-white p-3"><strong>Enquiries &amp; visits</strong>{enquiries.map((e) => <p key={e.id} className="mt-1">Enquiry {dateLabel(e.created_at)} · {e.status}</p>)}{visits.map((v) => <p key={v.id} className="mt-1">Visit {dateLabel(v.created_at)} · {v.status}</p>)}{!enquiries.length && !visits.length && <p className="mt-1 text-slate-500">No enquiry or visit record found</p>}</div>
                        <div className="rounded-lg border border-slate-200 bg-white p-3"><strong>Referral trail</strong><p className="mt-1">Referred by: {row.referrer?.full_name ?? "—"}</p><p>Registered: {dateLabel(row.created_at)}</p><p>Verified: {dateLabel(row.verified_at)}</p><p>Paid: {dateLabel(row.paid_at)}</p><p>Payment ref: {row.payment_reference ?? "—"}</p></div>
                      </div>
                      {(() => {
                        const draft = drafts[row.id] ?? toDraft(row);
                        const ownerOptions = properties.filter((p) => selectedType !== "owner" || p.owner_id === row.referred_user_id);
                        const external = draft.dealSource !== "naren_realty";
                        return <>
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            <label className="text-xs font-semibold text-slate-700">Transaction source<select value={draft.dealSource} onChange={(e) => changeDraft(row.id,{dealSource:e.target.value as Draft["dealSource"]})} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"><option value="">Select source</option><option value="naren_realty">NAREN REALTY platform</option><option value="direct_owner">Direct owner / customer</option><option value="other_broker">Other broker / agent</option><option value="market">Open market / external</option></select></label>
                            <label className="text-xs font-semibold text-slate-700">Transaction type<select value={draft.transactionType} onChange={(e) => changeDraft(row.id,{transactionType:e.target.value as Draft["transactionType"]})} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"><option value="">Select type</option><option value="rental">Rental</option><option value="resale">Resale</option></select></label>
                            <label className="text-xs font-semibold text-slate-700">Linked approved property<select value={draft.propertyId} onChange={(e) => changeDraft(row.id,{propertyId:e.target.value})} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"><option value="">Select property</option>{ownerOptions.map((p) => <option key={p.id} value={p.id}>{p.title} · {p.locality ?? "—"}</option>)}</select></label>
                            <label className="text-xs font-semibold text-slate-700">Deal completion date<input type="date" value={draft.dealCompletedAt} onChange={(e) => changeDraft(row.id,{dealCompletedAt:e.target.value})} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5" /></label>
                            {selectedType === "tenant" && <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-3 text-xs font-semibold"><input type="checkbox" checked={draft.rentalAgreementExecuted} onChange={(e) => changeDraft(row.id,{rentalAgreementExecuted:e.target.checked})} /> Rent / Leave &amp; License Agreement executed</label>}
                            <label className="text-xs font-semibold text-slate-700">Payment reference<input value={draft.paymentReference} onChange={(e) => changeDraft(row.id,{paymentReference:e.target.value})} placeholder="UPI / bank UTR" className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5" /></label>
                            <label className="text-xs font-semibold text-slate-700 sm:col-span-2">Evidence notes<textarea value={draft.evidenceNotes} onChange={(e) => changeDraft(row.id,{evidenceNotes:e.target.value})} rows={2} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal" placeholder="Enquiry/visit reference, communication trail and confirmation..." /></label>
                            <label className="text-xs font-semibold text-slate-700 sm:col-span-2">Admin notes<textarea value={draft.adminNotes} onChange={(e) => changeDraft(row.id,{adminNotes:e.target.value})} rows={2} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal" /></label>
                          </div>
                          {external && draft.dealSource && <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">External / direct transaction: no referral reward eligibility.</p>}
                          <div className="mt-4 flex flex-wrap gap-2">
                            <button disabled={saving===row.id} onClick={() => void save(row,"pending")} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold">Save pending</button>
                            <button disabled={saving===row.id || external} onClick={() => void save(row,"eligible")} className="rounded-lg bg-[#10243A] px-3 py-2 text-xs font-bold text-white disabled:opacity-40">Verify eligible</button>
                            <button disabled={saving===row.id || row.status!=="eligible" || external} onClick={() => void save(row,"approved")} className="rounded-lg border border-emerald-700 bg-white px-3 py-2 text-xs font-bold text-emerald-800 disabled:opacity-40">Approve reward</button>
                            <button disabled={saving===row.id || row.status!=="approved" || !draft.paymentReference.trim()} onClick={() => void save(row,"paid")} className="rounded-lg border border-emerald-700 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 disabled:opacity-40">Mark paid</button>
                            <button disabled={saving===row.id || row.status==="paid"} onClick={() => void save(row,"rejected")} className="rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs font-bold text-rose-800">Reject / No reward</button>
                            {saving===row.id && <span className="self-center text-xs text-slate-500">Saving...</span>}
                          </div>
                          <p className="mt-3 text-[11px] text-slate-500">Reward approval requires NAREN REALTY sourced transaction and verifiable evidence. Tenant reward additionally requires rental agreement execution and same-property enquiry/visit. Registration or listing alone does not qualify.</p>
                        </>;
                      })()}
                    </td></tr>}
                  </Fragment>;
                })}
                {!filtered.length && <tr><td colSpan={13} className="px-4 py-10 text-center text-sm text-slate-500">No referral records found for this register.</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-[11px] text-slate-500">Dates and activity shown are fetched from the current NAREN REALTY database. Google Form requirements are matched using the referred tenant's registered phone number; unmatched external records are not assumed to be referrals.</p>
        </div>}
      </>}
    </section>
  </main>;
}
