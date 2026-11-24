"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "../../lib/supabase-browser";

export default function CollectionPartnerAcceptInvitePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);
  const [name, setName] = useState("Collection Partner");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    async function verifyPartnerInvite() {
      try {
        const db = createSupabaseBrowserClient();
        const { data: { user }, error: userError } = await db.auth.getUser();
        if (userError || !user) throw new Error("This invitation link is invalid or has expired. Ask the MFIT team to resend it.");
        const { data: profile, error: profileError } = await db.from("profiles")
          .select("role,full_name").eq("id", user.id).maybeSingle();
        if (profileError || profile?.role !== "collection_partner") {
          throw new Error("This invitation is not for a collection partner account.");
        }
        if (active) {
          setName(profile.full_name || user.user_metadata?.full_name || "Collection Partner");
          setValid(true);
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Could not verify this invitation.");
      } finally {
        if (active) setChecking(false);
      }
    }
    void verifyPartnerInvite();
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password.length < 12) {
      setError("Password must contain at least 12 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSaving(true);
    try {
      const db = createSupabaseBrowserClient();
      const { error: updateError } = await db.auth.updateUser({
        password,
        data: { must_change_password: false },
      });
      if (updateError) throw updateError;
      router.replace("/collection-partner");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Password could not be saved. Request a new setup link.");
      setSaving(false);
    }
  }

  return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 text-slate-900">
    <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-xs font-bold tracking-[.18em] text-teal-700">MFIT HEALTHCARE</p>
      <h1 className="mt-2 text-2xl font-extrabold">Set up your partner password</h1>
      <p className="mt-2 text-sm text-slate-600">Welcome, {name}. Create a secure password to activate your collection partner portal login.</p>
      {checking ? <p className="mt-6 text-sm text-slate-500">Verifying your secure invitation…</p> : valid ? <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block text-sm font-semibold">New password<input type="password" autoComplete="new-password" minLength={12} required value={password} onChange={e=>setPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-3"/></label>
        <label className="block text-sm font-semibold">Confirm password<input type="password" autoComplete="new-password" minLength={12} required value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-3"/></label>
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
        <button disabled={saving} className="w-full rounded-lg bg-teal-700 p-3 font-bold text-white disabled:opacity-60">{saving ? "Saving password…" : "Set password & open dashboard"}</button>
      </form> : <div className="mt-6 space-y-3"><p role="alert" className="text-sm text-rose-700">{error}</p><Link href="/collection-partner/login" className="inline-flex font-semibold text-teal-800 underline">Go to partner login</Link></div>}
    </section>
  </main>;
}
