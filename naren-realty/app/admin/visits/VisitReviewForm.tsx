"use client";

import { useActionState } from "react";
import { updateVisit, type AdminVisitResult } from "./actions";
import { visitSlots } from "../../lib/visit-requests";
import { indiaCalendarDate } from "../../lib/property-marketing";

const initial: AdminVisitResult = { status: "idle", message: "" };

export default function VisitReviewForm({ id, status, date, time }: { id: string; status: string; date: string; time: string }) {
  const [state, action, pending] = useActionState(updateVisit, initial);
  return <form action={action} className="mt-4 grid gap-3 border-t border-slate-200 pt-4 sm:grid-cols-2">
    <input type="hidden" name="id" value={id} /><input type="hidden" name="expected_status" value={status} />
    <input type="hidden" name="expected_date" value={date} /><input type="hidden" name="expected_time" value={time} />
    <label className="text-sm font-semibold">Review status<select name="status" defaultValue="" required className="mt-1 w-full rounded border border-slate-300 bg-white p-2"><option value="" disabled>Choose action</option><option value="confirmed">Confirmed</option><option value="rescheduled">Rescheduled</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></label>
    <div className="text-sm text-slate-600 sm:col-span-2">For rescheduling, select the new date and time below. Inform the customer separately.</div>
    <label className="text-sm font-semibold">New visit date<input name="date" type="date" min={indiaCalendarDate()} defaultValue={date} className="mt-1 w-full rounded border border-slate-300 p-2" /></label>
    <label className="text-sm font-semibold">New time<select name="time" defaultValue={time.slice(0, 5)} className="mt-1 w-full rounded border border-slate-300 bg-white p-2">{visitSlots.map((slot) => <option key={slot} value={slot}>{slot}</option>)}</select></label>
    <button disabled={pending} className="rounded bg-[#10243A] px-4 py-2 font-semibold text-white disabled:opacity-50">{pending ? "Saving..." : "Update request"}</button>
    {state.message && <p role={state.status === "error" ? "alert" : "status"} className={state.status === "error" ? "text-sm text-rose-700" : "text-sm text-emerald-700"}>{state.message}</p>}
  </form>;
}
