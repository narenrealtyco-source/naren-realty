"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "../lib/supabase-browser";

const supabase = createSupabaseBrowserClient();

type AcknowledgementRow = {
  id: string;
  enquiry_id: string;
  property_id: string;
  party: string;
  category: string;
  policy_version: string;
  statement: string;
  created_at: string;
  acknowledged_at: string | null;
  properties: { title: string | null; locality: string | null } | { title: string | null; locality: string | null }[] | null;
};

function propertyDetails(row: AcknowledgementRow) {
  return Array.isArray(row.properties) ? row.properties[0] ?? null : row.properties;
}

export default function BrokerageAcknowledgementPanel({ userId }: { userId: string }) {
  const [records, setRecords] = useState<AcknowledgementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error: queryError } = await supabase
      .from("property_brokerage_acknowledgements")
      .select("id,enquiry_id,property_id,party,category,policy_version,statement,created_at,acknowledged_at,properties(title,locality)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (queryError) {
      setError("Brokerage acknowledgement requests could not be loaded.");
    } else {
      setRecords((data ?? []) as AcknowledgementRow[]);
      setError("");
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function acknowledge(id: string) {
    setSavingId(id);
    setError("");
    const { data, error: updateError } = await supabase
      .from("property_brokerage_acknowledgements")
      .update({ acknowledged_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId)
      .is("acknowledged_at", null)
      .select("id,acknowledged_at")
      .maybeSingle();
    if (updateError || !data) {
      setError("Your acknowledgement could not be saved. Please refresh and try again.");
    } else {
      setRecords((current) => current.map((record) => record.id === id
        ? { ...record, acknowledged_at: data.acknowledged_at }
        : record));
    }
    setSavingId(null);
  }

  if (loading && records.length === 0) {
    return <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5"><p className="text-sm text-slate-600">Loading brokerage acknowledgements…</p></section>;
  }
  if (!loading && records.length === 0 && !error) return null;

  return (
    <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby="brokerage-acknowledgements-heading">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-[#A71930]">Transaction terms</p>
        <h2 id="brokerage-acknowledgements-heading" className="mt-1 text-xl font-bold text-[#10243A]">Brokerage Acknowledgements</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Review the brokerage terms assigned to your account. Acknowledgement records your acceptance of the stated policy only; it does not itself create a booking, demand payment, or replace the transaction-specific written fee confirmation.</p>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
      <div className="mt-4 space-y-3">
        {records.map((record) => {
          const property = propertyDetails(record);
          return <article key={record.id} className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><p className="font-bold text-[#10243A]">{record.party} · {record.category}</p><p className="mt-1 text-sm text-slate-600">{property?.title ?? "Property enquiry"}{property?.locality ? ` · ${property.locality}` : ""}</p></div>
              <span className={`rounded px-2 py-1 text-xs font-semibold ${record.acknowledged_at ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>{record.acknowledged_at ? "Acknowledged" : "Action required"}</span>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{record.statement}</p>
            <p className="mt-2 text-xs text-slate-500">Policy version {record.policy_version}{record.acknowledged_at ? ` · Accepted ${new Date(record.acknowledged_at).toLocaleString("en-IN")}` : ""}</p>
            {!record.acknowledged_at && <button type="button" onClick={() => void acknowledge(record.id)} disabled={savingId === record.id} className="mt-3 min-h-11 rounded-md bg-[#A71930] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{savingId === record.id ? "Saving…" : "I acknowledge these terms"}</button>}
          </article>;
        })}
      </div>
      {loading && <p role="status" className="mt-3 text-xs text-slate-500">Refreshing…</p>}
    </section>
  );
}
