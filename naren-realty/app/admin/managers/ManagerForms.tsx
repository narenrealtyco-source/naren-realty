"use client";
import { useActionState } from "react";
import LocalityAutocomplete from "../../components/LocalityAutocomplete";
import { createManager, resendManagerSetupEmail, setManagerActive, type ManagerActionState } from "./actions";
const initial: ManagerActionState = { status: "idle", message: "" };
export function CreateManagerForm() {
 const [state, action, pending] = useActionState(createManager, initial);
 return <form action={action} className="grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-2">
  <h2 className="text-lg font-bold sm:col-span-2">Add Manager</h2>
  <label className="text-sm font-semibold">Full name<input name="full_name" required maxLength={100} className="mt-1 w-full rounded border p-2.5"/></label>
  <label className="text-sm font-semibold">Email<input name="email" required type="email" className="mt-1 w-full rounded border p-2.5"/></label>
  <label className="text-sm font-semibold">Mobile (+91)<input name="phone" required placeholder="+919876543210" pattern="\+91[6-9][0-9]{9}" className="mt-1 w-full rounded border p-2.5"/></label>
  <label className="text-sm font-semibold">Area / Location<LocalityAutocomplete name="area" maxLength={100} placeholder="Search manager service area" className="mt-1 w-full rounded border p-2.5"/></label>
  <p className="text-sm text-slate-600 sm:col-span-2">A secure account setup email will be sent to the manager. They create their own password.</p>
  <button disabled={pending} className="rounded-lg bg-[#10243A] px-4 py-3 font-semibold text-white disabled:opacity-50 sm:col-span-2">{pending?"Creating…":"Create Manager & Send Setup Email"}</button>
  {state.message&&<p role={state.status==="error"?"alert":"status"} className={state.status==="error"?"text-sm text-rose-700 sm:col-span-2":"text-sm text-emerald-700 sm:col-span-2"}>{state.message}</p>}
 </form>;
}
export function ResendManagerSetupEmailForm({id}:{id:string}) {
 const [state, action, pending] = useActionState(resendManagerSetupEmail, initial);
 return <form action={action} className="mt-3"><input type="hidden" name="id" value={id}/><button disabled={pending} className="rounded-lg border border-blue-300 px-3 py-2 text-sm font-semibold text-blue-700 disabled:opacity-50">{pending?"Sending…":"Resend Setup Email"}</button>{state.message&&<p role={state.status==="error"?"alert":"status"} className="mt-2 text-xs text-slate-600">{state.message}</p>}</form>;
}
export function ManagerStatusForm({id,active}:{id:string;active:boolean}) {
 const [state, action, pending] = useActionState(setManagerActive, initial);
 return <form action={action} className="mt-3"><input type="hidden" name="id" value={id}/><input type="hidden" name="active" value={String(!active)}/><button disabled={pending} className={active?"rounded-lg border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-700":"rounded-lg border border-emerald-300 px-3 py-2 text-sm font-semibold text-emerald-700"}>{pending?"Saving…":active?"Deactivate":"Activate"}</button>{state.message&&<p role="status" className="mt-2 text-xs text-slate-600">{state.message}</p>}</form>;
}
