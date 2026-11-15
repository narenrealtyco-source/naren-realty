"use client";

import { useActionState } from "react";
import { manageMarketplace } from "./actions";
import type { VendorState } from "../../../home-services/vendor-actions";
import type { MarketplaceCategory } from "../../../lib/vendor-marketplace";

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
export function ReviewForm({ id, status, terms }: { id: string; status: string; terms: string }) {
  const [state, action, pending] = useActionState(manageMarketplace, initial);
  return <form action={action} className="mt-4"><input type="hidden" name="id" value={id} />
    <label className="block text-sm font-semibold">Private commission terms<textarea className={input} name="terms" maxLength={1000} defaultValue={terms} rows={2} /></label>
    <div className="mt-2 flex flex-wrap gap-2"><button name="action" value="approve" disabled={pending} className={button}>Approve</button><button name="action" value="reject" disabled={pending} className={button}>Reject</button>{status === "approved" && <><button name="action" value="activate" disabled={pending} className={button}>Activate</button><button name="action" value="deactivate" disabled={pending} className={button}>Deactivate</button></>}</div><Result state={state} />
  </form>;
}
export function EnquiryStatusForm({ id, status, remarks }: { id: string; status: string; remarks: string }) {
  const [state, action, pending] = useActionState(manageMarketplace, initial);
  return <form action={action} className="mt-3 space-y-2"><input type="hidden" name="id" value={id} /><input type="hidden" name="action" value="update-enquiry" /><label className="block text-sm">Status<select name="status" defaultValue={status} className={input}>{["pending","contacted","completed","cancelled"].map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label className="block text-sm">Internal follow-up<textarea name="remarks" maxLength={2000} defaultValue={remarks} className={input} rows={2} /></label><button disabled={pending} className={button}>Save</button><Result state={state} /></form>;
}
type EditableVendor = { id: string; business_name: string; public_name: string; category_id: string; contact_person: string; mobile: string; email: string; services: string; description: string; city: string; locality: string; address: string; commission_terms: string };
export function EditVendorForm({ vendor, categories }: { vendor: EditableVendor; categories: MarketplaceCategory[] }) {
  const [state, action, pending] = useActionState(manageMarketplace, initial);
  return <details className="mt-4"><summary className="cursor-pointer font-semibold">Edit provider details</summary><form action={action} className="mt-3 space-y-3">
    <input type="hidden" name="id" value={vendor.id} /><input type="hidden" name="action" value="edit-vendor" />
    <label className="block text-sm">Public provider name<input name="public_name" className={input} defaultValue={vendor.public_name} maxLength={120} required /></label>
    <label className="block text-sm">Business name<input name="business_name" className={input} defaultValue={vendor.business_name} maxLength={120} required /></label>
    <label className="block text-sm">Private contact name<input name="contact_person" className={input} defaultValue={vendor.contact_person} maxLength={120} required /></label>
    <label className="block text-sm">Phone<input name="mobile" className={input} defaultValue={vendor.mobile} maxLength={13} required /></label>
    <label className="block text-sm">Email<input name="email" type="email" className={input} defaultValue={vendor.email} maxLength={254} /></label>
    <label className="block text-sm">Category<select name="category_id" className={input} defaultValue={vendor.category_id}>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}{c.active ? "" : " (inactive)"}</option>)}</select></label>
    <label className="block text-sm">Services<input name="services" className={input} defaultValue={vendor.services} maxLength={500} required /></label>
    <label className="block text-sm">Description<textarea name="description" className={input} defaultValue={vendor.description} maxLength={2000} required /></label>
    <label className="block text-sm">City<input name="city" className={input} defaultValue={vendor.city} maxLength={100} required /></label>
    <label className="block text-sm">Locality<input name="locality" className={input} defaultValue={vendor.locality} maxLength={100} required /></label>
    <label className="block text-sm">Private address<input name="address" className={input} defaultValue={vendor.address} maxLength={500} required /></label>
    <label className="block text-sm">Private commission terms<textarea name="commission_terms" className={input} defaultValue={vendor.commission_terms} maxLength={1000} /></label>
    <button className={button} disabled={pending}>Save provider</button><Result state={state} />
  </form></details>;
}
