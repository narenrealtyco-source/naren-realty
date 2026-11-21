"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import AdminLogoutButton from "../../components/AdminLogoutButton";
import { getAllCustomerProfiles } from "../../lib/customers";
import { getAllOwners } from "../../lib/properties";
import {
  getBrokerageAcknowledgements,
  getCurrentPolicyDocuments,
  getPolicyAcceptances,
  updatePolicyVersion,
  type BrokerageAcknowledgement,
  type PolicyAcceptance,
  type PolicyDocument,
  type PolicyType,
} from "../../lib/policies";

export default function AdminPoliciesPage() {
  const [documents, setDocuments] = useState<PolicyDocument[]>([]);
  const [acceptances, setAcceptances] = useState<PolicyAcceptance[]>([]);
  const [acknowledgements, setAcknowledgements] = useState<BrokerageAcknowledgement[]>([]);
  const [people, setPeople] = useState<Record<string, { name: string; email: string }>>({});
  const [versionInputs, setVersionInputs] = useState<Partial<Record<PolicyType, string>>>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    function refresh() {
      queueMicrotask(() => {
        if (!active) return;
        try {
          const currentDocuments = getCurrentPolicyDocuments();
          setDocuments(currentDocuments);
          setVersionInputs((current) => Object.fromEntries(currentDocuments.map((document) => [document.type, current[document.type] ?? document.version])));
          setAcceptances(getPolicyAcceptances());
          setAcknowledgements(getBrokerageAcknowledgements());
          const customers = getAllCustomerProfiles().map((customer) => [customer.id, { name: customer.fullName, email: customer.email }] as const);
          const owners = getAllOwners().map((owner) => [owner.id, { name: owner.fullName, email: owner.email }] as const);
          setPeople(Object.fromEntries([...customers, ...owners]));
          setError("");
        } catch {
          setError("Policy records could not be loaded from this browser.");
        }
      });
    }
    refresh();
    window.addEventListener("storage", refresh);
    return () => { active = false; window.removeEventListener("storage", refresh); };
  }, []);

  function updateVersion(event: FormEvent<HTMLFormElement>, type: PolicyType) {
    event.preventDefault();
    try {
      const updatedDocuments = updatePolicyVersion(type, versionInputs[type] ?? "");
      setDocuments(updatedDocuments);
      setVersionInputs((current) => ({ ...current, [type]: updatedDocuments.find((document) => document.type === type)?.version }));
      setAcceptances(getPolicyAcceptances());
      setError("");
      setNotice("Policy version updated. Users will be prompted to accept the current version at their next account visit or login.");
    } catch (updateError) {
      setNotice("");
      setError(updateError instanceof Error ? updateError.message : "Policy version could not be updated.");
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-[#10243A] text-white"><div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 sm:px-6 md:flex-row md:items-center md:justify-between"><div><p className="text-xs font-bold tracking-[0.18em] text-amber-400">NAREN REALTY</p><h1 className="mt-1 text-xl font-bold">Policy Management</h1></div><nav className="flex flex-wrap gap-2 text-sm"><Link href="/admin" className="rounded-md border border-white/30 px-3 py-2 font-semibold">Dashboard</Link><Link href="/admin/properties" className="rounded-md border border-white/30 px-3 py-2 font-semibold">Properties</Link><Link href="/admin/enquiries" className="rounded-md border border-white/30 px-3 py-2 font-semibold">Enquiries</Link><AdminLogoutButton /></nav></div></header>
      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-6 sm:py-12">
        <div className="border-b border-slate-200 pb-6"><p className="text-xs font-bold tracking-[0.18em] text-amber-700">LEGAL POLICY RECORDS</p><h2 className="mt-2 text-3xl font-bold text-[#10243A]">Policies & acknowledgements</h2><p className="mt-2 text-sm text-slate-600">Review current document versions and the acceptance records available in this browser.</p></div>
        <p className="mt-5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950"><strong>Prototype access notice:</strong> Supabase Auth is not configured in this application. This browser-local Admin screen is not protected by server authentication, and Local Storage records are not permanent legal evidence. The included database migration describes the future authenticated Admin/RLS setup.</p>
        {notice && <p role="status" className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{notice}</p>}
        {error && <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}

        <section className="mt-8"><h3 className="text-xl font-bold text-[#10243A]">Policy Documents</h3><div className="mt-4 grid gap-4 lg:grid-cols-2">{documents.map((document) => <article key={document.type} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><h4 className="font-bold text-[#10243A]">{document.title}</h4><p className="mt-1 text-sm text-slate-600">Version {document.version} · Updated {document.lastUpdated}</p></div><Link href={document.path} className="text-sm font-semibold text-amber-800 underline underline-offset-2">View policy</Link></div><form onSubmit={(event) => updateVersion(event, document.type)} className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-end"><label className="flex-1 text-sm font-semibold">New version<input required pattern="[0-9]+\.[0-9]+" value={versionInputs[document.type] ?? document.version} onChange={(event) => setVersionInputs((current) => ({ ...current, [document.type]: event.target.value }))} placeholder="e.g. 1.1" className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2.5 font-normal" /></label><button className="rounded-md bg-[#10243A] px-4 py-2.5 text-sm font-semibold text-white">Update Version</button></form></article>)}</div></section>

        <section className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold text-[#10243A]">Policy Acceptance Records</h3>
              <p className="mt-1 text-sm text-slate-600">{acceptances.length} recorded acceptances</p>
            </div>
          </div>
          {acceptances.length === 0 ? (
            <p className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-600">No policy acceptances in this browser.</p>
          ) : (
            <>
              <ul aria-label="Policy acceptance records" className="mt-4 space-y-3 lg:hidden">
                {acceptances.map((record) => (
                  <li key={record.id} className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                      <h4 className="break-words font-semibold text-[#10243A]">{people[record.userId]?.name ?? "Unknown account"}</h4>
                      <p className="mt-1 break-all text-xs text-slate-500">{people[record.userId]?.email ?? record.userId}</p>
                      <dl className="mt-3 grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
                        <dt className="font-semibold text-slate-600">Role</dt><dd className="min-w-0 break-words capitalize">{record.userRole}</dd>
                        <dt className="font-semibold text-slate-600">Policy</dt><dd className="min-w-0 break-words">{documents.find((document) => document.type === record.policyType)?.title ?? record.policyType}</dd>
                        <dt className="font-semibold text-slate-600">Version</dt><dd>{record.policyVersion}</dd>
                        <dt className="font-semibold text-slate-600">Accepted</dt><dd className="min-w-0 break-words">{new Date(record.acceptedAt).toLocaleString("en-IN")}</dd>
                        <dt className="font-semibold text-slate-600">Category</dt><dd className="min-w-0 break-words">{record.brokerageCategory ?? "-"}</dd>
                        <dt className="font-semibold text-slate-600">Transaction</dt><dd className="min-w-0 break-all font-mono text-xs">{record.transactionReference ?? "-"}</dd>
                      </dl>
                  </li>
                ))}
              </ul>
              <div role="region" aria-label="Policy acceptance records table" tabIndex={0} className="mt-4 hidden rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 lg:block">
                <table className="w-full table-fixed text-left text-sm">
                  <thead className="bg-slate-100 text-xs uppercase tracking-wider text-slate-600"><tr><th className="w-[18%] px-4 py-3">Accepted By</th><th className="w-[9%] px-4 py-3">Role</th><th className="w-[18%] px-4 py-3">Policy</th><th className="w-[8%] px-4 py-3">Version</th><th className="w-[20%] px-4 py-3">Accepted At</th><th className="w-[10%] px-4 py-3">Category</th><th className="w-[17%] px-4 py-3">Transaction</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {acceptances.map((record) => (
                      <tr key={record.id}>
                        <td className="break-words px-4 py-3"><span className="block font-semibold">{people[record.userId]?.name ?? "Unknown account"}</span><span className="block break-all text-xs text-slate-500">{people[record.userId]?.email ?? record.userId}</span></td>
                        <td className="break-words px-4 py-3 capitalize">{record.userRole}</td>
                        <td className="break-words px-4 py-3">{documents.find((document) => document.type === record.policyType)?.title ?? record.policyType}</td>
                        <td className="px-4 py-3">{record.policyVersion}</td>
                        <td className="break-words px-4 py-3">{new Date(record.acceptedAt).toLocaleString("en-IN")}</td>
                        <td className="break-words px-4 py-3">{record.brokerageCategory ?? "-"}</td>
                        <td className="break-all px-4 py-3 font-mono text-xs">{record.transactionReference ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <section className="mt-10"><div><h3 className="text-xl font-bold text-[#10243A]">Brokerage Acknowledgements</h3><p className="mt-1 text-sm text-slate-600">{acknowledgements.length} acknowledgement records</p></div><div className="mt-4 space-y-3">{acknowledgements.map((record) => <article key={record.id} className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-2"><div><h4 className="font-bold text-[#10243A]">{record.category} · {record.party} ({record.userRole})</h4><p className="mt-1 text-xs text-slate-600">{people[record.userId]?.name ?? "Unknown account"} · {people[record.userId]?.email ?? record.userId}</p></div><span className={`rounded px-2.5 py-1 text-xs font-semibold ${record.acknowledgedAt ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>{record.acknowledgedAt ? "Acknowledged" : "Pending"}</span></div><p className="mt-2 text-sm leading-6 text-slate-700">{record.statement}</p><p className="mt-2 text-xs text-slate-500">Version {record.policyVersion} · Transaction {record.transactionReference} · Created {new Date(record.createdAt).toLocaleString("en-IN")}{record.acknowledgedAt ? ` · Accepted ${new Date(record.acknowledgedAt).toLocaleString("en-IN")}` : ""}</p></article>)}{acknowledgements.length === 0 && <p className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-600">No brokerage acknowledgement records in this browser.</p>}</div></section>
      </section>
    </main>
  );
}
