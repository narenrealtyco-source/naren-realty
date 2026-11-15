"use client";

import { useActionState } from "react";
import { updateServiceEnquiry, type ServiceReviewState } from "./actions";

const initial: ServiceReviewState = { status: "idle", message: "" };

export default function StatusForm({ id, status }: { id: string; status: string }) {
  const [state, action, pending] = useActionState(updateServiceEnquiry, initial);
  return <form action={action} className="mt-3 flex flex-wrap items-end gap-3">
    <input type="hidden" name="id" value={id} />
    <label className="text-sm font-semibold">Status<select name="status" defaultValue={status} className="mt-1 block min-h-11 rounded border border-slate-300 bg-white px-3">{["pending", "contacted", "completed", "cancelled"].map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
    <button disabled={pending} className="min-h-11 rounded bg-[#10243A] px-4 font-semibold text-white disabled:opacity-50">{pending ? "Updating..." : "Update status"}</button>
    {state.message && <p role={state.status === "error" ? "alert" : "status"} className="w-full text-sm">{state.message}</p>}
  </form>;
}
