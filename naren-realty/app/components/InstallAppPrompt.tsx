"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function InstallAppPrompt() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);
  const [help, setHelp] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) {
      setInstalled(true);
      return;
    }

    const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    setIos(isIos);
    const dismissedAt = Number(window.localStorage.getItem("naren-install-dismissed-at") || 0);
    if (Date.now() - dismissedAt > 7 * 24 * 60 * 60 * 1000) {
      setVisible(true);
    }

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => {
      setInstalled(true);
      setVisible(false);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    window.localStorage.setItem("naren-install-dismissed-at", String(Date.now()));
  };

  const install = async () => {
    if (installEvent) {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === "accepted") setVisible(false);
      setInstallEvent(null);
      return;
    }
    setHelp(true);
  };

  if (!visible || installed) return null;

  return (
    <div className="fixed inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-[60] mx-auto max-w-md sm:bottom-5">
      <section aria-label="Install NAREN REALTY app" className="rounded-2xl border border-amber-300/50 bg-[#071a35] p-4 text-white shadow-2xl">
        <div className="flex items-start gap-3">
          <img src="/icon.svg" alt="NAREN REALTY" className="h-14 w-14 rounded-xl border border-amber-300/60" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold tracking-wide">NAREN REALTY</p>
            <p className="mt-1 text-sm text-slate-200">Add our app to your home screen for quick access.</p>
          </div>
          <button type="button" onClick={dismiss} aria-label="Dismiss install prompt" className="rounded-full px-2 text-xl leading-6 text-slate-300">×</button>
        </div>
        <button type="button" onClick={install} className="mt-3 w-full rounded-xl bg-gradient-to-r from-amber-200 to-yellow-500 px-4 py-3 text-sm font-bold text-[#071a35]">
          Add NAREN REALTY to Home Screen
        </button>
        {help && (
          <div className="mt-3 rounded-xl bg-white/10 p-3 text-sm text-slate-100">
            {ios ? (
              <>On your iPhone: tap the <strong>Share</strong> icon in Safari, scroll down, then choose <strong>Add to Home Screen</strong> and tap <strong>Add</strong>.</>
            ) : (
              <>Open your browser menu (⋮), choose <strong>Install app</strong> or <strong>Add to Home screen</strong>, then confirm.</>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
