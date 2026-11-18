"use client";

import { useEffect } from "react";

function getIds() {
  const get = (key: string) => {
    let value = localStorage.getItem(key);
    if (!value) {
      value = crypto.randomUUID();
      localStorage.setItem(key, value);
    }
    return value;
  };
  return { visitorKey: get("nr_visitor_key"), sessionKey: get("nr_session_key") };
}

export default function VisitorTracker() {
  useEffect(() => {
    let stopped = false;
    const send = (eventName: string, eventData: Record<string, unknown> = {}) => {
      if (stopped) return;
      try {
        const ids = getIds();
        void fetch("/api/analytics/event", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...ids, eventName, pagePath: location.pathname, eventData }),
          keepalive: true,
        });
      } catch {}
    };
    send("page_view", { referrer: document.referrer ? new URL(document.referrer).host : null });
    const onSubmit = (event: Event) => {
      const form = event.target;
      if (form instanceof HTMLFormElement) send("form_submit", { formId: form.id || null, formName: form.getAttribute("name") || null });
    };
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const el = target.closest("a,button,[role=button]");
      if (!el) return;
      const label = (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 80);
      send("click", { element: el.tagName.toLowerCase(), label });
    };
    const onSearch = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
      if (target.type === "password" || target.type === "email" || target.type === "tel") return;
      if (target.type === "search" || target.name.toLowerCase().includes("location") || target.name.toLowerCase().includes("search")) {
        send("search", { field: target.name || target.type, value: target.value.slice(0, 100) });
      }
    };
    const onHide = () => { if (document.visibilityState === "hidden") send("page_exit"); };
    document.addEventListener("submit", onSubmit, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("change", onSearch, true);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      stopped = true;
      document.removeEventListener("submit", onSubmit, true);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("change", onSearch, true);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, []);
  return null;
}
