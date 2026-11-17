"use client";

import { useEffect } from "react";

export default function PWARegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let active = true;
    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
      if (active) console.error("[pwa] Service worker registration failed", error);
    });
    return () => { active = false; };
  }, []);
  return null;
}
