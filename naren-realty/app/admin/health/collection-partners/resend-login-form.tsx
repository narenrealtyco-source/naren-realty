"use client";

import { useActionState } from "react";
import { resendCollectionPartnerLogin } from "./actions";

type ResendState = { status: "success" | "error"; message: string } | null;

export default function ResendLoginForm({ applicationId }: { applicationId: string }) {
  const [state, formAction, pending] = useActionState<ResendState, FormData>(
    resendCollectionPartnerLogin,
    null
  );

  return (
    <form action={formAction} className="mt-4 border-t pt-4">
      <input type="hidden" name="application_id" value={applicationId} />
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="rounded-lg border border-teal-700 px-4 py-2 text-sm font-bold text-teal-800 hover:bg-teal-50 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Sending…" : "Resend Login Email"}
      </button>
      <p className="mt-1 text-xs text-slate-500">
        Sends a fresh, one-time secure login link to the approved email address.
      </p>
      {state && (
        <p
          role={state.status === "success" ? "status" : "alert"}
          aria-live="polite"
          className={`mt-3 rounded-lg px-3 py-2 text-sm ${state.status === "success" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}
        >
          {state.status === "success" ? "✓ " : "⚠ "}
          {state.message}
        </p>
      )}
    </form>
  );
}
