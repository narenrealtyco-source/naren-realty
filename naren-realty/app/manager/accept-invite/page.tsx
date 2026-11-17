"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "../../lib/supabase-browser";

export default function ManagerAcceptInvitePage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    if (password.length < 12) { setError("Password must be at least 12 characters."); setBusy(false); return; }
    if (password !== confirm) { setError("Passwords do not match."); setBusy(false); return; }
    const supabase = createSupabaseBrowserClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) { setError("Your setup link is no longer active. Ask Admin for a fresh email."); setBusy(false); return; }
    const { data: profile, error: profileError } = await supabase.from("profiles")
      .select("role,manager_active").eq("id", user.id).maybeSingle();
    if (profileError || profile?.role !== "manager" || profile.manager_active !== true) {
      await supabase.auth.signOut(); setError("This account is not an active NAREN REALTY manager account."); setBusy(false); return;
    }
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) { setError(updateError.message); setBusy(false); return; }
    router.replace("/manager"); router.refresh();
  }
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 text-slate-900"><form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-2xl border bg-white p-6 shadow-sm"><p className="text-xs font-bold tracking-widest text-amber-600">NAREN REALTY</p><h1 className="text-2xl font-bold text-[#10243A]">Secure Manager Account</h1><p className="text-sm text-slate-600">Create a private password for your manager login.</p><label className="block text-sm font-semibold">New password<input required minLength={12} type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-1 w-full rounded-md border p-3"/></label><label className="block text-sm font-semibold">Confirm password<input required minLength={12} type="password" autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} className="mt-1 w-full rounded-md border p-3"/></label>{error&&<p role="alert" className="text-sm text-rose-700">{error}</p>}<button disabled={busy} className="w-full rounded-lg bg-[#10243A] px-4 py-3 font-semibold text-white disabled:opacity-50">{busy?"Saving…":"Set Password & Continue"}</button></form></main>;
}
