"use client";

import { useActionState } from "react";
import { approveSubmission, rejectSubmission, type ReviewState } from "./actions";

const initialState: ReviewState = { status: "idle", message: "" };

export default function ReviewForms({ id }: { id: string }) {
  const [approval, approve, approving] = useActionState(approveSubmission, initialState);
  const [rejection, reject, rejecting] = useActionState(rejectSubmission, initialState);
  const busy = approving || rejecting;

  return <div className="mt-4 space-y-4 border-t border-slate-200 pt-4">
    <form action={approve}>
      <input type="hidden" name="submission_id" value={id} />
      <button disabled={busy} className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{approving ? "Publishing..." : "Approve and publish"}</button>
      {approval.message && <p role={approval.status === "error" ? "alert" : "status"} className="mt-2 text-sm">{approval.message}</p>}
    </form>
    <form action={reject}>
      <input type="hidden" name="submission_id" value={id} />
      <label className="block text-sm font-semibold">Rejection reason
        <textarea name="reason" required maxLength={2000} className="mt-1 block w-full rounded-md border border-slate-300 p-2 font-normal" />
      </label>
      <button disabled={busy} className="mt-2 rounded-md bg-rose-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{rejecting ? "Rejecting..." : "Reject submission"}</button>
      {rejection.message && <p role={rejection.status === "error" ? "alert" : "status"} className="mt-2 text-sm">{rejection.message}</p>}
    </form>
  </div>;
}
