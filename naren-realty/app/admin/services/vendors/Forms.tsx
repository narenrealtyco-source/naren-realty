"use client";

import { useActionState } from "react";
import { manageMarketplace } from "./actions";
import type { VendorState } from "../../../home-services/vendor-actions";

const initial: VendorState = { status: "idle", message: "" };
const input = "mt-1 w-full rounded-lg border border-slate-300 p-2 text-base";
const button = "min-h-11 rounded-lg bg-[#10243A] px-4 py-2 text-sm font-bold text-white disabled:opacity-50";
function Result({ state }: { state: VendorState }) {
  return state.message ? <p role={state.status === "error" ? "alert" : "status"} className="mt-2 text-sm">{state.message}</p> : null;
}
export function CategoryForm() {
  const [state, action, pending] = useActionState(manageMarketplace, initial);
  return <form action={action} className="space-y-2"><input type="hidden" name="action" value="add-category" />
    <label className="block text-sm">Name<input className={input} name="name" maxLength={100} required /></label>
    <label className="block text-sm">Slug (lowercase, hyphenated)<input className={input} name="slug" maxLength={100} pattern="[a-z0-9]+(-[a-z0-9]+)*" required /></label>
    <button disabled={pending} className={button}>Add category</button><Result state={state} />
  </form>;
}
export function CategoryToggle({ id, active, name }: { id: string; active: boolean; name: string }) {
  const [state, action, pending] = useActionState(manageMarketplace, initial);
  return <form action={action} className="flex flex-wrap items-end gap-2"><input type="hidden" name="id" value={id} /><label className="text-sm">Category name<input className={input} name="name" defaultValue={name} maxLength={100} required /></label><button name="action" value="rename-category" disabled={pending} className={button}>Rename</button><button name="action" value={active ? "disable-category" : "enable-category"} disabled={pending} className={button}>{active ? "Deactivate" : "Activate"}</button><button name="action" value="remove-category" disabled={pending} className={button}>Remove</button><Result state={state} /></form>;
}
export function ReviewForm({ id, status, notes }: { id: string; status: string; notes: string }) {
  const [state, action, pending] = useActionState(manageMarketplace, initial);
  return <form action={action} className="mt-4"><input type="hidden" name="id" value={id} />
    <label className="block text-sm font-semibold">Private admin review notes<textarea className={input} name="notes" maxLength={1000} defaultValue={notes} rows={2} /></label>
    <div className="mt-2 flex flex-wrap gap-2"><button name="action" value="approve" disabled={pending || status !== "pending"} className={button}>Approve</button><button name="action" value="reject" disabled={pending || status !== "pending"} className={button}>Reject</button></div><Result state={state} />
  </form>;
}
export function CategoryPriceForm({ id, price }: { id: string; price: number }) {
  const [state, action, pending] = useActionState(manageMarketplace, initial);
  return <form action={action} className="mt-2 flex flex-wrap items-end gap-2"><input type="hidden" name="id" value={id}/><input type="hidden" name="action" value="set-lead-price"/><label className="text-xs font-semibold">Lead unlock price (₹)<input className={input} name="lead_unlock_price" type="number" min="0" max="1000000" step="1" defaultValue={price}/></label><button disabled={pending} className={button}>Save price</button><Result state={state}/></form>;
}
export function MarkLeadPaidForm({ id, paymentStatus, reference }: { id: string; paymentStatus: string; reference: string | null }) {
  const [state, action, pending] = useActionState(manageMarketplace, initial);
  return <form action={action} className="mt-3 space-y-2"><input type="hidden" name="id" value={id} /><input type="hidden" name="action" value="mark-lead-paid" />
    <p className="text-sm">Payment: <strong>{paymentStatus}</strong>{reference ? ` · Ref: ${reference}` : ""}</p>
    {paymentStatus !== "paid" && <><label className="block text-sm">Payment reference (optional)<input name="payment_reference" className={input} maxLength={120} /></label><button disabled={pending} className={button}>Mark as paid</button></>}
    <Result state={state} />
  </form>;
}
