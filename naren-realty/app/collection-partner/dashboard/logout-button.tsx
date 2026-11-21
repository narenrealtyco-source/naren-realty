"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "../../lib/supabase-browser";

export default function CollectionPartnerLogoutButton() {
  const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true);
    const { error } = await createSupabaseBrowserClient().auth.signOut();
    if (error) {
      setBusy(false);
      return;
    }
    window.location.replace("/collection-partner/login");
  }
  return <button type="button" onClick={logout} disabled={busy} className="rounded-lg border border-white/40 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/10 disabled:opacity-60">{busy ? "Signing out…" : "Log out"}</button>;
}
