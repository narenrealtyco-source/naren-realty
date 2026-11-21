"use client";

import { useActionState } from "react";
import { deleteAdminSubmission, type DeleteRejectedState } from "./actions";

const initialState: DeleteRejectedState = { status: "idle", message: "" };

export default function DeleteRejectedButton({ id, retry, pendingSubmission = false }: { id: string; retry: boolean; pendingSubmission?: boolean }) {
  const [state, action, pending] = useActionState(deleteAdminSubmission, initialState);
  return <form action={action} onSubmit={(event) => {
    const message = retry
      ? "Retry private photo cleanup and permanently delete this submission?"
      : pendingSubmission
        ? "Reject and permanently delete this pending submission and its private photos? The customer will not be able to resubmit this record."
        : "Permanently delete this rejected submission and all its private photos? This cannot be undone.";
    if (!window.confirm(message)) event.preventDefault();
  }} className="mt-4 border-t border-slate-200 pt-4">
    <input type="hidden" name="submission_id" value={id} />
    <button type="submit" disabled={pending} className="rounded-md bg-rose-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
      {pending ? "Cleaning photos..." : retry ? "Retry photo cleanup & delete" : "Delete submission"}
    </button>
    {state.message && <p role={state.status === "error" ? "alert" : "status"} className="mt-2 text-sm">{state.message}</p>}
  </form>;
}
