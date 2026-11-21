"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "../../lib/supabase-browser";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError("Unable to sign in with those credentials.");
      setSubmitting(false);
      return;
    }

    router.push("/admin");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12 text-slate-900">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-bold tracking-[0.18em] text-amber-700">NAREN REALTY</p>
        <h1 className="mt-2 text-3xl font-bold text-[#10243A]">Admin Login</h1>
        <p className="mt-2 text-sm text-slate-600">Sign in with the existing admin account.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-sm font-semibold">
            Email address
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2.5 font-normal"
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
              className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2.5 font-normal"
            />
          </label>
          {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-[#10243A] px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <Link href="/" className="mt-5 block text-center text-sm font-semibold text-slate-600 hover:text-[#10243A]">
          Return to website
        </Link>
      </section>
    </main>
  );
}
