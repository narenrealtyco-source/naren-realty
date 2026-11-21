"use client";

import { useActionState } from "react";
import { deleteAdminProperty, type DeleteRejectedPropertyState } from "./delete-actions";

const initialState: DeleteRejectedPropertyState = { status: "idle", message: "" };

export default function DeleteRejectedPropertyButton({ id, retry }: { id: string; retry: boolean }) {
  const [state, action, pending] = useActionState(deleteAdminProperty, initialState);
  return <form action={action} onSubmit={(event) => {
    const message = retry
      ? "Retry photo cleanup and permanently delete this listing?"
      : "Permanently delete this listing and its unshared public photos? Linked enquiries, visits, referral and brokerage records will block deletion; approved customer submissions and their private photos will be preserved.";
    if (!window.confirm(message)) event.preventDefault();
  }} className="mt-3">
    <input type="hidden" name="property_id" value={id} />
    <button type="submit" disabled={pending} className="rounded-md bg-rose-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
      {pending ? "Cleaning photos..." : retry ? "Retry cleanup & delete" : "Delete listing"}
    </button>
    {state.message && <p role={state.status === "error" ? "alert" : "status"} className="mt-2 text-sm">{state.message}</p>}
  </form>;
}
