"use client";
import { useState } from "react";
import { setCustomerAccountAccess } from "../admin/accounts/actions";

export default function AccountAccessButton({ id, banned }: { id: string; banned: boolean }) {
  const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  async function change() {
    const action=banned?"reactivate":"deactivate";
    if(!window.confirm(banned?"Reactivate this account?":"Deactivate this account? The user will no longer be able to sign in, but linked records will be preserved.")) return;
    setBusy(true);setError("");
    try { await setCustomerAccountAccess(id,action); window.location.reload(); }
    catch(e){setError(e instanceof Error?e.message:"Could not update account.");}
    finally{setBusy(false);}
  }
  return <div className="mt-3"><button type="button" disabled={busy} onClick={()=>void change()} className={banned?"rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800":"rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700"}>{busy?"Saving…":banned?"Reactivate account":"Deactivate account"}</button>{error&&<p role="alert" className="mt-2 text-xs text-rose-700">{error}</p>}</div>;
}
