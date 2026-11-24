"use client";

import { FormEvent, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function CollectionPartnerActivatePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tokenHash = searchParams.get("token_hash") || "";
  const [verified, setVerified] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function verifyLink() {
    if (!tokenHash) {
      setError("This password setup link is incomplete. Ask the MFIT admin to resend it.");
      return;
    }
    setBusy(true);
    setError("");
    const { createSupabaseBrowserClient } = await import("../../lib/supabase-browser");
    const db = createSupabaseBrowserClient();
    const { error: verifyError } = await db.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
    if (verifyError) {
      setError("This setup link has expired or has already been used. Ask the MFIT admin to send a fresh link.");
      setBusy(false);
      return;
    }
    const { data: { user }, error: userError } = await db.auth.getUser();
    if (userError || !user) {
      setError("Your email link could not be verified. Please request a new setup link.");
      setBusy(false);
      return;
    }
    const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
    const { data: partner } = await db.from("health_collection_partners").select("is_active").eq("user_id", user.id).maybeSingle();
    if (profile?.role !== "collection_partner" || partner?.is_active !== true) {
      await db.auth.signOut();
      setError("This account is not an active collection partner. Contact MFIT Healthcare support.");
      setBusy(false);
      return;
    }
    setVerified(true);
    setBusy(false);
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
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
    setBusy(true);
    const { createSupabaseBrowserClient } = await import("../../lib/supabase-browser");
    const db = createSupabaseBrowserClient();
    const { error: updateError } = await db.auth.updateUser({
      password,
      data: { must_change_password: false },
    });
    if (updateError) {
      setError(updateError.message || "Password could not be saved. Please try again.");
      setBusy(false);
      return;
    }
    router.replace("/collection-partner");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <section className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm">
        <p className="text-xs font-bold tracking-widest text-teal-700">MFIT HEALTHCARE · COLLECTION PARTNER</p>
        <h1 className="mt-2 text-2xl font-extrabold text-slate-900">{verified ? "Create your password" : "Activate your partner account"}</h1>
        <p className="mt-2 text-sm text-slate-500">{verified ? "Choose a strong password. You will use your email and this password for future sign-ins." : "Continue only when you are ready to verify your secure email link and create your password."}</p>
        {!verified ? (
          <div className="mt-6 space-y-4">
            <button type="button" onClick={verifyLink} disabled={busy || !tokenHash} className="w-full rounded-lg bg-teal-700 p-3 font-bold text-white disabled:opacity-60">{busy ? "Verifying…" : "Continue to Set Password"}</button>
          </div>
        ) : (
          <form onSubmit={savePassword} className="mt-6 space-y-4">
            <label className="block text-sm font-semibold text-slate-700">New password
              <input type="password" autoComplete="new-password" minLength={12} required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-lg border p-3"/>
            </label>
            <label className="block text-sm font-semibold text-slate-700">Confirm password
              <input type="password" autoComplete="new-password" minLength={12} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-1 w-full rounded-lg border p-3"/>
            </label>
            <button type="submit" disabled={busy} className="w-full rounded-lg bg-teal-700 p-3 font-bold text-white disabled:opacity-60">{busy ? "Saving password…" : "Save Password & Open Dashboard"}</button>
          </form>
        )}
        {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <p className="mt-5 text-xs text-slate-500">Use at least 12 characters. MFIT Healthcare will never ask you to share your password.</p>
      </section>
    </main>
  );
}
