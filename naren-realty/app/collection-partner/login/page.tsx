"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "../../lib/supabase-browser";

export default function CollectionPartnerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!active || !user) return;
      const { data: partner } = await supabase
        .from("health_collection_partners")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      if (active && partner) router.replace("/collection-partner/dashboard");
    })();
    return () => { active = false; };
  }, [router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const supabase = createSupabaseBrowserClient();
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (signInError) throw signInError;

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Login verification failed.");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (profileError || profile?.role !== "collection_partner") {
        await supabase.auth.signOut();
        throw new Error("This account is not registered as an MFIT collection partner. Customer and lab logins cannot be used here.");
      }

      const { data: partner, error: partnerError } = await supabase
        .from("health_collection_partners")
        .select("id,is_active")
        .eq("user_id", user.id)
        .maybeSingle();
      if (partnerError || !partner || partner.is_active !== true) {
        await supabase.auth.signOut();
        throw new Error("Your collection partner access is inactive. Please contact MFIT Healthcare support.");
      }

      router.replace("/collection-partner/dashboard");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 text-slate-900">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-7 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-[#0b7778] text-2xl font-black text-white">M</div>
          <p className="mt-3 text-xs font-bold tracking-[0.2em] text-[#0b7778]">MFIT HEALTHCARE</p>
          <h1 className="mt-2 text-2xl font-extrabold text-[#18343b]">Collection Partner Login</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Sign in with the email and password issued after partner approval.</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-semibold">Registered email address
            <input required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal outline-none focus:border-[#0b7778]" />
          </label>
          <label className="block text-sm font-semibold">Password
            <input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal outline-none focus:border-[#0b7778]" />
          </label>
          {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          <button type="submit" disabled={busy} className="w-full rounded-lg bg-[#0b7778] px-4 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">{busy ? "Verifying…" : "Sign In"}</button>
        </form>
        <p className="mt-5 text-center text-xs leading-5 text-slate-500">Access is limited to MFIT-approved active collection partners. Customer and internal lab accounts use separate login pages.</p>
        <div className="mt-5 flex justify-center gap-4 text-sm font-semibold">
          <Link href="/collection-partner/apply" className="text-[#0b7778] underline">Apply as partner</Link>
          <Link href="/" className="text-slate-600 underline">Main website</Link>
        </div>
      </section>
    </main>
  );
}
