"use client";

import { useActionState } from "react";
import { cleanupPrivateSubmissions } from "./cleanup-action";

export default function CleanupButton() {
  const [state, action, pending] = useActionState(cleanupPrivateSubmissions, { status: "success", message: "" });
  return <form action={action} className="mt-4">
    <button disabled={pending} className="rounded border border-slate-400 px-3 py-2 text-sm disabled:opacity-50">{pending ? "Reconciling..." : "Reconcile abandoned private uploads"}</button>
    {state.message && <p role={state.status === "error" ? "alert" : "status"} className="mt-2 text-sm">{state.message}</p>}
  </form>;
}
