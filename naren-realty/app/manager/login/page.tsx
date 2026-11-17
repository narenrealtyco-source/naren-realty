"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "../../lib/supabase-browser";

type Mode = "phone" | "email";

export default function ManagerLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("phone");
  const [phone, setPhone] = useState("+91");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function authorize() {
    const supabase = createSupabaseBrowserClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Login verification failed.");

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role,manager_active")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || profile?.role !== "manager" || profile.manager_active !== true) {
      await supabase.auth.signOut();
      throw new Error("This account is not an active NAREN REALTY manager account.");
    }

    router.replace("/manager");
    router.refresh();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const supabase = createSupabaseBrowserClient();

    try {
      if (mode === "email") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        await authorize();
      } else {
        const normalizedPhone = phone.replace(/[\\s()-]/g, "");
        if (!/^\\+91[6-9]\\d{9}$/.test(normalizedPhone)) {
          throw new Error("Enter a valid 10-digit Indian mobile number.");
        }

        if (!sent) {
          const { error: otpError } = await supabase.auth.signInWithOtp({
            phone: normalizedPhone,
            options: { shouldCreateUser: false },
          });
          if (otpError) throw otpError;
          setSent(true);
        } else {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            phone: normalizedPhone,
            token: otp.trim(),
            type: "sms",
          });
          if (verifyError) throw verifyError;
          await authorize();
        }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    setError("");
    setSent(false);
    setOtp("");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 text-slate-900">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
        <div className="mb-7 text-center">
          <p className="text-xs font-bold tracking-[0.24em] text-amber-600">NAREN REALTY</p>
          <h1 className="mt-3 text-2xl font-bold text-[#10243A]">Manager Login</h1>
          <p className="mt-2 text-sm text-slate-500">Sign in to access your assigned property visits.</p>
        </div>

        <div className="mb-6 grid grid-cols-2 rounded-lg bg-slate-100 p-1">
          <button type="button" onClick={() => changeMode("phone")} className={`rounded-md px-3 py-2 text-sm font-semibold ${mode === "phone" ? "bg-white text-[#10243A] shadow-sm" : "text-slate-500"}`}>
            Mobile OTP
          </button>
          <button type="button" onClick={() => changeMode("email")} className={`rounded-md px-3 py-2 text-sm font-semibold ${mode === "email" ? "bg-white text-[#10243A] shadow-sm" : "text-slate-500"}`}>
            Email & Password
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "phone" ? (
            <>
              <label className="block text-sm font-semibold">
                Registered mobile number
                <input
                  required
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+919876543210"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-[#10243A] focus:ring-2 focus:ring-slate-200"
                />
              </label>
              {sent && (
                <label className="block text-sm font-semibold">
                  6-digit OTP
                  <input
                    required
                    inputMode="numeric"
                    maxLength={6}
                    autoComplete="one-time-code"
                    value={otp}
                    onChange={(event) => setOtp(event.target.value.replace(/\\D/g, "").slice(0, 6))}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-3 tracking-[0.3em] outline-none focus:border-[#10243A]"
                  />
                </label>
              )}
            </>
          ) : (
            <>
              <label className="block text-sm font-semibold">
                Email address
                <input
                  required
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-[#10243A]"
                />
              </label>
              <label className="block text-sm font-semibold">
                Password
                <input
                  required
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-[#10243A]"
                />
              </label>
            </>
          )}

          {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-[#10243A] px-4 py-3 font-semibold text-white transition hover:bg-[#183653] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Please wait…" : mode === "phone" ? (sent ? "Verify OTP & Sign In" : "Send OTP") : "Sign In"}
          </button>

          {mode === "phone" && sent && (
            <button type="button" onClick={() => { setSent(false); setOtp(""); setError(""); }} className="w-full text-sm font-medium text-[#10243A] underline">
              Change mobile number
            </button>
          )}
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          Only active NAREN REALTY manager accounts can sign in.
        </p>
        <div className="mt-5 text-center">
          <Link href="/" className="text-sm font-medium text-[#10243A] underline">Return to website</Link>
        </div>
      </section>
    </main>
  );
}
