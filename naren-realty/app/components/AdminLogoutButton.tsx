"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "../lib/supabase-browser";

export default function AdminLogoutButton({ className }: { className?: string } = {}) {
  const [error, setError] = useState("");

  async function logout() {
    setError("");
    const { error: signOutError } = await createSupabaseBrowserClient().auth.signOut();
    if (signOutError) {
      setError("Could not sign out.");
      return;
    }
    window.location.replace("/admin/login");
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" onClick={logout} className={className ?? "rounded-lg border border-amber-400 px-3 py-2 text-sm font-semibold text-amber-400 hover:bg-amber-400 hover:text-slate-950"}>
        Log out
      </button>
      {error && <span role="alert" className="text-xs text-rose-200">{error}</span>}
    </span>
  );
}
