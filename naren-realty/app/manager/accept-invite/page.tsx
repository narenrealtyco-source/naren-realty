"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "../../lib/supabase-browser";

export default function AcceptManagerInvitePage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (password.length < 12) { setMessage("Password must be at least 12 characters."); return; }
    if (password !== confirm) { setMessage("Passwords do not match."); return; }
    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Invitation link is invalid or expired. Ask Admin to send a new invitation.");
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      const { data: profile, error: profileError } = await supabase.from("profiles").select("role,manager_active").eq("id", user.id).maybeSingle();
      if (profileError || profile?.role !== "manager" || profile.manager_active !== true) throw new Error("Manager access is not active. Please contact NAREN REALTY Admin.");
      router.replace("/manager");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not set password.");
    } finally { setBusy(false); }
  }
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10"><form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-2xl border bg-white p-6 shadow-sm"><p className="text-xs font-bold tracking-widest text-amber-600">NAREN REALTY</p><h1 className="text-2xl font-bold text-[#10243A]">Activate Manager Account</h1><p className="text-sm text-slate-600">Create a secure password to access your Manager Dashboard.</p><label className="block text-sm font-semibold">New password<input required minLength={12} type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-1 w-full rounded-lg border p-3"/></label><label className="block text-sm font-semibold">Confirm password<input required minLength={12} type="password" autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} className="mt-1 w-full rounded-lg border p-3"/></label><button disabled={busy} className="w-full rounded-lg bg-[#10243A] p-3 font-semibold text-white disabled:opacity-50">{busy?"Activating…":"Set Password & Open Dashboard"}</button>{message&&<p role="alert" className="text-sm text-rose-700">{message}</p>}</form></main>;
}
