"use client";

import { useState } from "react";
import { deleteAdminRecord, type AdminDeleteKind } from "../admin/delete-actions";

export default function AdminRecordDeleteButton({ kind, id, label = "Delete" }: { kind: AdminDeleteKind; id: string; label?: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function remove() {
    if (!window.confirm("Permanently delete this record? This action cannot be undone.")) return;
    setBusy(true); setMessage("");
    try {
      const result = await deleteAdminRecord(kind, id);
      setMessage(result.message);
      if (result.ok) window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Delete failed.");
    } finally { setBusy(false); }
  }
  return <div className="mt-3">
    <button type="button" onClick={() => void remove()} disabled={busy} className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50">{busy ? "Deleting…" : label}</button>
    {message && <p role="status" className="mt-2 text-xs text-slate-600">{message}</p>}
  </div>;
}
