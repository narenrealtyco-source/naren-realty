"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminLogoutButton from "../../components/AdminLogoutButton";
import { loadAdminEnquiries, updateAdminEnquiryDetails, updateAdminEnquiryStatus } from "./actions";
import {
  ENQUIRY_STATUSES,
  type EnquiryRecord,
  type EnquiryStatus,
} from "../../lib/enquiries";
import { areBrokerageAcknowledgementsComplete, createBrokerageAcknowledgements, getTransactionBrokerageAcknowledgements, type BrokerageAcknowledgement } from "../../lib/policies";
import { getAllListings } from "../../lib/properties";

function formatSubmissionDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unknown date"
    : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default function AdminEnquiriesPage() {
  const [enquiries, setEnquiries] = useState<EnquiryRecord[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<EnquiryStatus | "All">("All");
  const [requirementFilter, setRequirementFilter] = useState("All");
  const [localityFilter, setLocalityFilter] = useState("All");
  const [adminDetails, setAdminDetails] = useState<Record<string, { adminCallNotes: string; nextFollowUpDate: string }>>({});
  const [brokerageAcknowledgements, setBrokerageAcknowledgements] = useState<BrokerageAcknowledgement[]>([]);
  const [storageError, setStorageError] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function refreshEnquiries() {
      try {
        setLoading(true);
        const records = await loadAdminEnquiries();
        setEnquiries(records);
        setBrokerageAcknowledgements(records.flatMap((enquiry) => getTransactionBrokerageAcknowledgements(enquiry.id)));
        setAdminDetails(Object.fromEntries(records.map((enquiry) => [enquiry.id, {
          adminCallNotes: enquiry.adminCallNotes ?? "",
          nextFollowUpDate: enquiry.nextFollowUpDate ?? "",
        }])));
        setStorageError("");
      } catch (error) {
        setStorageError(error instanceof Error ? error.message : "Enquiries could not be loaded from Supabase.");
      } finally {
        setLoading(false);
      }
    }

    void refreshEnquiries();
  }, []);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const requestedStatus = new URLSearchParams(window.location.search).get("status");
      if (requestedStatus && ENQUIRY_STATUSES.includes(requestedStatus as EnquiryStatus)) {
        setStatusFilter(requestedStatus as EnquiryStatus);
      }
    });
    return () => { active = false; };
  }, []);

  const query = search.trim().toLowerCase();
  const localities = Array.from(new Set(enquiries.map((enquiry) => enquiry.locality).filter(Boolean))).sort();
  const filteredEnquiries = enquiries.filter((enquiry) =>
    (statusFilter === "All" || enquiry.status === statusFilter) &&
    (requirementFilter === "All" || enquiry.requirement === requirementFilter) &&
    (localityFilter === "All" || enquiry.locality === localityFilter) &&
    [enquiry.fullName, enquiry.mobileNumber, enquiry.propertyName, enquiry.locality].some((value) => value.toLowerCase().includes(query)),
  );

  async function updateStatus(id: string, status: EnquiryStatus) {
    if ((status === "Negotiation" || status === "Deal Closed") && !areBrokerageAcknowledgementsComplete(id)) {
      setStorageError("Complete every required brokerage acknowledgement before moving an enquiry to Negotiation or Deal Closed.");
      return;
    }
    setSavingId(id);
    setStorageError("");
    setSuccess("");
    try {
      await updateAdminEnquiryStatus(id, status);
      setEnquiries((current) => current.map((enquiry) => enquiry.id === id ? { ...enquiry, status } : enquiry));
      setSuccess("Enquiry status updated.");
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : "The enquiry status could not be saved.");
    } finally {
      setSavingId(null);
    }
  }

  async function saveAdminDetails(enquiry: EnquiryRecord) {
    setSavingId(enquiry.id);
    setStorageError("");
    setSuccess("");
    try {
      const details = adminDetails[enquiry.id] ?? {
        adminCallNotes: "",
        nextFollowUpDate: "",
      };
      await updateAdminEnquiryDetails(enquiry.id, details);
      setEnquiries((current) => current.map((record) => record.id === enquiry.id
        ? { ...record, adminCallNotes: details.adminCallNotes, nextFollowUpDate: details.nextFollowUpDate || undefined }
        : record));
      setSuccess("Admin follow-up details saved.");
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : "Admin follow-up details could not be saved.");
    } finally {
      setSavingId(null);
    }
  }

  function prepareBrokerage(enquiry: EnquiryRecord) {
    if (!enquiry.customerId || !enquiry.listingId) {
      setStorageError("Brokerage acknowledgements need a signed-in customer enquiry linked to an owner listing. Guest enquiries remain available but cannot provide account-bound acknowledgement records.");
      return;
    }
    const listing = getAllListings().find((item) => item.id === enquiry.listingId);
    if (!listing) {
      setStorageError("The owner listing linked to this enquiry could not be found.");
      return;
    }
    try {
      createBrokerageAcknowledgements({ enquiryId: enquiry.id, listing, customerId: enquiry.customerId });
      setBrokerageAcknowledgements(enquiries.flatMap((record) => getTransactionBrokerageAcknowledgements(record.id)));
      setStorageError("");
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : "Brokerage acknowledgements could not be prepared.");
    }
  }

  function updateAdminDetail(
    id: string,
    field: "adminCallNotes" | "nextFollowUpDate",
    value: string,
  ) {
    setAdminDetails((current) => {
      const currentDetails = current[id] ?? { adminCallNotes: "", nextFollowUpDate: "" };
      return { ...current, [id]: { ...currentDetails, [field]: value } };
    });
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-[#10243A] text-white">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-4 px-4 py-5 sm:px-6 md:flex-row md:items-center md:justify-between">
          <Link href="/" className="min-w-0">
            <span className="block text-xl font-bold tracking-widest">NAREN <span className="text-amber-400">REALTY</span></span>
            <span className="mt-1 block text-xs tracking-widest text-slate-300">ADMIN ENQUIRIES</span>
          </Link>
          <nav aria-label="Admin navigation" className="flex w-full flex-wrap gap-2 md:w-auto">
            <Link href="/admin" className="rounded-lg border border-white/30 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10 sm:px-4">
              Dashboard
            </Link>
            <Link href="/admin/properties" className="rounded-lg border border-amber-400 px-3 py-2 text-sm font-semibold text-amber-400 hover:bg-amber-400 hover:text-slate-950 sm:px-4">
              Review Listings
            </Link>
            <Link href="/admin/policies" className="rounded-lg border border-white/30 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10 sm:px-4">
              Policies
            </Link>
            <Link href="/" className="rounded-lg border border-white/30 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10 sm:px-4">
              Website
            </Link>
            <AdminLogoutButton />
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-9 sm:px-6 sm:py-12">
        <div className="flex flex-col gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold tracking-[0.16em] text-amber-700">ENQUIRY MANAGEMENT</p>
            <h1 className="mt-2 text-3xl font-bold text-[#10243A]">Admin Enquiries</h1>
            <p className="mt-2 text-sm text-slate-600">
              {filteredEnquiries.length} of {enquiries.length} enquiries
            </p>
          </div>
          <div className="grid w-full min-w-0 gap-3 sm:grid-cols-2 lg:max-w-4xl lg:grid-cols-4">
            <label htmlFor="enquiry-search" className="mb-1.5 block text-sm font-semibold text-slate-800">
              Search customer
            <input
              id="enquiry-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name, mobile, property"
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
            />
            </label>
            <label className="block text-sm font-semibold text-slate-800">Status
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as EnquiryStatus | "All")} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm">
                <option value="All">All statuses</option>
                {ENQUIRY_STATUSES.map((status) => <option key={status}>{status}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold text-slate-800">Requirement
              <select value={requirementFilter} onChange={(event) => setRequirementFilter(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm">
                <option value="All">All requirements</option><option>Rental</option><option>Resale</option><option>PG</option><option>Airbnb</option>
              </select>
            </label>
            <label className="block text-sm font-semibold text-slate-800">Locality
              <select value={localityFilter} onChange={(event) => setLocalityFilter(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm">
                <option value="All">All localities</option>{localities.map((locality) => <option key={locality}>{locality}</option>)}
              </select>
            </label>
          </div>
        </div>

        {loading && (
          <p role="status" className="mt-5 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            Loading enquiries...
          </p>
        )}
        {storageError && (
          <p role="alert" className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {storageError}
          </p>
        )}
        {success && (
          <p role="status" className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {success}
          </p>
        )}

        {!loading && (filteredEnquiries.length > 0 ? (
          <div className="mt-6 space-y-4">
            {filteredEnquiries.map((enquiry) => (
              <article key={enquiry.id} className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Customer</p>
                    <h2 className="mt-1 break-words text-lg font-bold text-[#10243A]">{enquiry.fullName}</h2>
                    <p className="mt-1 text-sm text-slate-700">{enquiry.mobileNumber}</p>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="sm:text-right">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Submitted</p>
                      <p className="mt-1 text-sm text-slate-700">{formatSubmissionDate(enquiry.createdAt)}</p>
                    </div>
                  </div>
                </div>

                <dl className="grid gap-x-6 gap-y-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="min-w-0">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Property</dt>
                    <dd className="mt-1 break-words font-semibold text-slate-800">{enquiry.propertyName}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Locality</dt>
                    <dd className="mt-1 break-words text-slate-800">{enquiry.locality}, Pune</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Requirement</dt>
                    <dd className="mt-1 break-words text-slate-800">{enquiry.requirement || "Not specified"}</dd>
                  </div>
                  <div className="sm:col-span-2 lg:col-span-1">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Message</dt>
                    <dd className="mt-1 whitespace-pre-wrap break-words text-slate-800">{enquiry.message || "-"}</dd>
                  </div>
                </dl>

                <div className="border-t border-slate-100 pt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</p>
                  <div className="flex flex-wrap gap-2">
                    {ENQUIRY_STATUSES.map((status) => (
                      <button
                        key={status}
                        type="button"
                        aria-pressed={enquiry.status === status}
                        onClick={() => void updateStatus(enquiry.id, status)}
                        disabled={savingId === enquiry.id}
                        className={`rounded-md border px-3 py-2 text-xs font-semibold transition-colors sm:text-sm ${
                          enquiry.status === status
                            ? "border-[#10243A] bg-[#10243A] text-white"
                            : "border-slate-300 bg-white text-slate-700 hover:border-amber-500 hover:text-[#10243A]"
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4 border-t border-slate-100 pt-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Brokerage Acknowledgements</p>
                  {brokerageAcknowledgements.filter((acknowledgement) => acknowledgement.transactionReference === enquiry.id).length ? <div className="space-y-3">{brokerageAcknowledgements.filter((acknowledgement) => acknowledgement.transactionReference === enquiry.id).map((acknowledgement) => <div key={acknowledgement.id} className="rounded-md border border-slate-200 bg-slate-50 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-bold text-[#10243A]">{acknowledgement.party} · {acknowledgement.userRole}</p><span className={`rounded px-2 py-1 text-xs font-semibold ${acknowledgement.acknowledgedAt ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>{acknowledgement.acknowledgedAt ? "Acknowledged" : "Pending"}</span></div><p className="mt-2 text-sm leading-6 text-slate-700">{acknowledgement.statement}</p><p className="mt-2 break-all text-xs text-slate-500">User ID {acknowledgement.userId} · Policy {acknowledgement.policyVersion} · Created {formatSubmissionDate(acknowledgement.createdAt)}{acknowledgement.acknowledgedAt ? ` · Accepted ${formatSubmissionDate(acknowledgement.acknowledgedAt)}` : ""}</p></div>)}{!areBrokerageAcknowledgementsComplete(enquiry.id) && <button type="button" onClick={() => prepareBrokerage(enquiry)} className="rounded-md border border-[#10243A] px-3 py-2 text-sm font-semibold text-[#10243A]">Prepare Current-Policy Acknowledgements</button>}</div> : <div><p className="text-sm text-slate-500">No brokerage acknowledgement records.</p><button type="button" onClick={() => prepareBrokerage(enquiry)} className="mt-2 rounded-md border border-[#10243A] px-3 py-2 text-sm font-semibold text-[#10243A]">Prepare Brokerage Acknowledgements</button></div>}
                </div>

                <div className="mt-4 border-t border-slate-100 pt-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Admin follow-up</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm font-semibold text-slate-800">Admin call notes
                      <textarea rows={3} value={adminDetails[enquiry.id]?.adminCallNotes ?? ""} onChange={(event) => updateAdminDetail(enquiry.id, "adminCallNotes", event.target.value)} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-amber-500" />
                    </label>
                    <label className="text-sm font-semibold text-slate-800">Next follow-up date
                      <input type="date" value={adminDetails[enquiry.id]?.nextFollowUpDate ?? ""} onChange={(event) => updateAdminDetail(enquiry.id, "nextFollowUpDate", event.target.value)} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-amber-500" />
                    </label>
                  </div>
                  <button type="button" disabled={savingId === enquiry.id} onClick={() => void saveAdminDetails(enquiry)} className="mt-3 rounded-md border border-[#10243A] px-4 py-2 text-sm font-semibold text-[#10243A] hover:bg-slate-50 disabled:opacity-60">Save Admin Notes</button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-8 border-y border-slate-200 py-14 text-center">
            <h2 className="text-lg font-bold text-[#10243A]">{enquiries.length ? "No matching enquiries" : "No enquiries yet"}</h2>
            <p className="mt-2 text-sm text-slate-600">
              {enquiries.length ? "Try a different name or mobile number." : "Submitted property enquiries will appear here."}
            </p>
          </div>
        ))}
      </section>
    </main>
  );
}
