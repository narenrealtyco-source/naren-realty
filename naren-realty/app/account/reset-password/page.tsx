"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { getCustomerSession, supabase, updateCustomerPassword } from "../../lib/customers";

export default function CustomerResetPasswordPage() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [validSession, setValidSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    let recoveryDetected = false;

    async function validateRecoverySession() {
      try {
        const customer = await getCustomerSession();
        if (!active) return;
        if (!customer) {
          setError("This password reset link is invalid or has expired.");
          return;
        }
        setValidSession(true);
        setError("");
      } catch {
        if (active) setError("This password reset link is invalid or not available for a customer account.");
      } finally {
        if (active) setCheckingSession(false);
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "PASSWORD_RECOVERY" || !session || recoveryDetected) return;
      recoveryDetected = true;
      window.setTimeout(() => {
        if (active) void validateRecoverySession();
      }, 0);
    });

    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const queryParams = new URLSearchParams(window.location.search);
    const isRecoveryLink = hashParams.get("type") === "recovery" || queryParams.get("type") === "recovery" || queryParams.has("code") || queryParams.get("recovery") === "1";

    if (queryParams.get("auth_error") === "code_exchange") {
      setCheckingSession(false);
      setError("This reset link could not be verified. Please request a new password reset email.");
    } else if (isRecoveryLink) {
      void supabase.auth.getSession().then(({ data: { session } }) => {
        if (!active || !session || recoveryDetected) return;
        recoveryDetected = true;
        void validateRecoverySession();
      });
    } else {
      setCheckingSession(false);
      setError("Open the password reset link from your email to set a new password.");
    }

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await updateCustomerPassword(password);
      setSuccess(true);
      setPassword("");
      setConfirmation("");
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Your password could not be updated.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 text-slate-900 sm:px-5 sm:py-12">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-8">
        <p className="text-xs font-bold tracking-[0.18em] text-amber-700">NAREN REALTY</p>
        <h1 className="mt-2 text-3xl font-bold text-[#10243A]">Set a new password</h1>
        {checkingSession ? <p className="mt-4 text-sm text-slate-600">Checking your reset link...</p> : success ? <div className="mt-4 space-y-4"><p role="status" className="text-sm text-emerald-800">Your password has been updated. You can now sign in with your new password.</p><Link href="/account#login" className="block rounded-lg bg-[#10243A] px-5 py-3 text-center font-semibold text-white">Go to Customer Login</Link></div> : validSession ? <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-sm font-semibold">New password<input required type="password" minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-4 py-3 text-base font-normal outline-none focus:border-amber-500" /></label>
          <label className="block text-sm font-semibold">Confirm new password<input required type="password" minLength={8} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-4 py-3 text-base font-normal outline-none focus:border-amber-500" /></label>
          {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
          <button disabled={submitting} className="w-full rounded-lg bg-[#10243A] px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{submitting ? "Updating..." : "Update password"}</button>
        </form> : <div className="mt-4 space-y-4"><p role="alert" className="text-sm text-rose-700">{error}</p><Link href="/account#login" className="inline-flex min-h-11 items-center text-sm font-semibold text-[#10243A] underline">Return to Customer Login</Link></div>}
      </section>
    </main>
  );
}
