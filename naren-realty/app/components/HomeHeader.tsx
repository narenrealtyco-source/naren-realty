"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import { createSupabaseBrowserClient } from "../lib/supabase-browser";

type SessionState = { customer: boolean; serverUser: boolean; admin: boolean };
const emptySession: SessionState = { customer: false, serverUser: false, admin: false };

export default function HomeHeader() {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<SessionState>(emptySession);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;
    let sequence = 0;
    const adminClient = createSupabaseBrowserClient();
    async function refresh() {
      const request = ++sequence;
      try {
        const [customerResult, adminResult] = await Promise.all([supabase.auth.getUser(), adminClient.auth.getUser()]);
        for (const result of [customerResult, adminResult]) {
          if (result.error && result.error.name !== "AuthSessionMissingError") throw result.error;
        }
        let isAdmin = false;
        if (adminResult.data.user) {
          const { data, error: profileError } = await adminClient.from("profiles").select("role").eq("id", adminResult.data.user.id).maybeSingle();
          if (profileError) throw profileError;
          isAdmin = data?.role === "admin";
        }
        if (active && request === sequence) {
          setSession({ customer: Boolean(customerResult.data.user), serverUser: Boolean(adminResult.data.user), admin: isAdmin });
        }
      } catch {
        if (active && request === sequence) {
          setSession(emptySession);
          setError("Account status could not be verified. Please try again.");
        }
      } finally {
        if (active && request === sequence) setLoading(false);
      }
    }
    void refresh();
    const customerSubscription = supabase.auth.onAuthStateChange(() => { setTimeout(() => { if (active) void refresh(); }, 0); });
    const adminSubscription = adminClient.auth.onAuthStateChange(() => { setTimeout(() => { if (active) void refresh(); }, 0); });
    return () => {
      active = false;
      customerSubscription.data.subscription.unsubscribe();
      adminSubscription.data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function dismiss(event: PointerEvent) {
      if (event.target instanceof Node && !container.current?.contains(event.target)) setOpen(false);
    }
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") { setOpen(false); button.current?.focus(); }
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", keydown);
    return () => { document.removeEventListener("pointerdown", dismiss); document.removeEventListener("keydown", keydown); };
  }, [open]);

  async function logout() {
    setSigningOut(true);
    setError("");
    try {
      const adminClient = createSupabaseBrowserClient();
      const results = await Promise.all([
        session.customer ? supabase.auth.signOut() : Promise.resolve({ error: null }),
        session.serverUser ? adminClient.auth.signOut() : Promise.resolve({ error: null }),
      ]);
      if (results.some((result) => result.error)) throw new Error("Sign out failed.");
      setSession(emptySession);
      setOpen(false);
    } catch {
      setError("Could not sign out. Please try again.");
    } finally {
      setSigningOut(false);
    }
  }

  const itemClass = "block w-full rounded-md px-3 py-2.5 text-left text-sm font-medium text-slate-900 hover:bg-amber-50 focus-visible:outline-2 focus-visible:outline-amber-600";
  return (
    <header className="relative z-30 bg-[#10243A] text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5">
        <Link href="/" aria-label="NAREN REALTY home" className="min-w-0">
          <span className="block whitespace-nowrap text-lg font-extrabold tracking-tight sm:text-2xl">NAREN <span className="text-amber-400">REALTY</span></span>
        </Link>
        <div ref={container} className="relative">
          <button ref={button} type="button" aria-label="Account menu" aria-expanded={open} aria-controls="home-account-menu" onClick={() => setOpen((value) => !value)} className="flex size-10 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 sm:size-11">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-6"><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></svg>
          </button>
          {open && <div id="home-account-menu" className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 text-slate-900 shadow-xl">
            {loading ? <p role="status" className="px-3 py-2 text-sm">Checking account...</p> : <>
              {error && <p role="alert" className="px-3 py-2 text-sm text-rose-700">{error}</p>}
              {(session.customer || session.serverUser) && <Link href="/account" onClick={() => setOpen(false)} className={itemClass}>My Account</Link>}
              {!session.customer && !session.serverUser && <><Link href="/account#login" onClick={() => setOpen(false)} className={itemClass}>Login</Link><Link href="/account#signup" onClick={() => setOpen(false)} className={itemClass}>Sign Up</Link></>}
              <Link href="/account/referrals" onClick={() => setOpen(false)} className={itemClass}>Refer &amp; Earn</Link>
              {session.admin && <Link href="/admin" onClick={() => setOpen(false)} className={itemClass}>Admin Dashboard</Link>}
              {(session.customer || session.serverUser) && <button type="button" disabled={signingOut} onClick={() => void logout()} className={itemClass}>{signingOut ? "Logging out..." : "Logout"}</button>}
            </>}
          </div>}
        </div>
      </div>
    </header>
  );
}
