"use client";
import { useEffect, useState } from "react";
function getIds() {
  const get = (key: string) => { let value = localStorage.getItem(key); if (!value) { value = crypto.randomUUID(); localStorage.setItem(key, value); } return value; };
  const lastSeen = Number(localStorage.getItem("nr_session_last_seen") || 0);
  if (!lastSeen || Date.now() - lastSeen > 30 * 60 * 1000) localStorage.removeItem("nr_session_key");
  localStorage.setItem("nr_session_last_seen", String(Date.now()));
  return { visitorKey: get("nr_visitor_key"), sessionKey: get("nr_session_key") };
}
export default function VisitorTracker() {
  const [consent, setConsent] = useState<"unknown" | "yes" | "no">("unknown");
  useEffect(() => { if (location.pathname.startsWith("/admin")) { setConsent("no"); return; } const saved = localStorage.getItem("nr_analytics_consent"); if (saved === "yes" || saved === "no") setConsent(saved); }, []);
  useEffect(() => {
    if (consent !== "yes" || location.pathname.startsWith("/admin")) return;
    let stopped = false;
    const send = (eventName: string, eventData: Record<string, unknown> = {}) => {
      if (stopped) return;
      try { const ids = getIds(); void fetch("/api/analytics/event", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...ids, eventName, pagePath: location.pathname, eventData }), keepalive: true }); } catch {}
    };
    send("page_view", { referrer: document.referrer ? new URL(document.referrer).host : null });
    const onSubmit = (event: Event) => { const form = event.target; if (form instanceof HTMLFormElement) send("form_submit", { formId: form.id || null, formName: form.getAttribute("name") || null }); };
    const onClick = (event: MouseEvent) => { const target = event.target; if (!(target instanceof Element)) return; const el = target.closest("a,button,[role=button]"); if (!el) return; const label = (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 80); send("click", { element: el.tagName.toLowerCase(), label }); };
    const onSearch = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement) || ["password","email","tel"].includes(target.type)) return;
      const field = (target.name || target.type).toLowerCase();
      if (target.type === "search" || field.includes("location") || field.includes("search")) {
        const value = target.value.slice(0, 100);
        if (!/[0-9]{8,}|@|\b(?:flat|house)\s*(?:no|number)\b/i.test(value)) send("search", { field, value });
      }
    };
    const onHide = () => { if (document.visibilityState === "hidden") send("page_exit"); };
    document.addEventListener("submit", onSubmit, true); document.addEventListener("click", onClick, true); document.addEventListener("change", onSearch, true); document.addEventListener("visibilitychange", onHide);
    return () => { stopped = true; document.removeEventListener("submit", onSubmit, true); document.removeEventListener("click", onClick, true); document.removeEventListener("change", onSearch, true); document.removeEventListener("visibilitychange", onHide); };
  }, [consent]);
  if (consent !== "unknown") return null;
  const choose = (value: "yes" | "no") => { localStorage.setItem("nr_analytics_consent", value); setConsent(value); };
  return <aside aria-label="Analytics consent" className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
    <p className="text-sm font-bold text-[#10243A]">Help us improve NAREN REALTY</p>
    <p className="mt-1 text-xs leading-5 text-slate-600">Allow optional analytics to record pages visited, property searches and button interactions, plus approximate city-level location from hosting data. We do not use GPS or collect passwords, OTPs or payment details. You can reject analytics and still use the website.</p>
    <div className="mt-3 flex flex-wrap justify-end gap-2"><button type="button" onClick={() => choose("no")} className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700">Reject optional analytics</button><button type="button" onClick={() => choose("yes")} className="rounded-lg bg-[#10243A] px-4 py-2 text-xs font-semibold text-white">Allow analytics</button></div>
  </aside>;
}
