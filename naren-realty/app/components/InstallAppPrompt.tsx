"use client";

import { useEffect, useState } from "react";

const INSTALLED_KEY = "naren-realty-app-installed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function InstallAppPrompt() {
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const alreadyInstalled = localStorage.getItem(INSTALLED_KEY) === "true";

    if (isStandalone || alreadyInstalled) return;

    const isIosDevice = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    setIos(isIosDevice);
    setVisible(true);

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      localStorage.setItem(INSTALLED_KEY, "true");
      setInstallPrompt(null);
      setVisible(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function installApp() {
    if (installPrompt) {
      setInstalling(true);
      try {
        await installPrompt.prompt();
        const choice = await installPrompt.userChoice;
        if (choice.outcome === "accepted") {
          localStorage.setItem(INSTALLED_KEY, "true");
          setVisible(false);
        }
      } finally {
        setInstalling(false);
        setInstallPrompt(null);
      }
      return;
    }
    setVisible(false);
  }

  function confirmIosInstall() {
    localStorage.setItem(INSTALLED_KEY, "true");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/65 p-4" role="dialog" aria-modal="true" aria-labelledby="install-app-title">
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-amber-400/30 bg-[#10243A] p-6 text-white shadow-2xl">
        <button type="button" onClick={() => setVisible(false)} aria-label="Close install prompt" className="absolute right-3 top-3 rounded-full px-2 py-1 text-2xl leading-none text-white/70 hover:bg-white/10">×</button>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-300/40 bg-[#0b1b2c]">
          <svg viewBox="0 0 64 64" className="h-12 w-12" aria-hidden="true">
            <path d="M32 4C18.8 4 9 14 9 27c0 17 23 33 23 33s23-16 23-33C55 14 45.2 4 32 4Z" fill="#D6AD59"/>
            <circle cx="32" cy="27" r="15" fill="#10243A"/>
            <path d="m20 29 12-10 12 10v12H20Z" fill="none" stroke="#D6AD59" strokeWidth="2.8" strokeLinejoin="round"/>
            <path d="M28 41V31h8v10" fill="none" stroke="#D6AD59" strokeWidth="2.5"/>
          </svg>
        </div>
        <p className="mb-1 text-center text-xs font-semibold tracking-[0.25em] text-amber-300">NAREN REALTY</p>
        <h2 id="install-app-title" className="mb-2 text-center text-xl font-bold">Get the NAREN REALTY App</h2>
        <p className="mb-5 text-center text-sm leading-6 text-slate-200">Install our app for quick access to properties, matches, loans and services.</p>
        {ios ? (
          <div className="mb-4 rounded-xl bg-white/10 p-3 text-sm leading-6 text-slate-100">
            Tap <strong>Share</strong> in Safari, choose <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>.
          </div>
        ) : null}
        <button type="button" onClick={ios ? confirmIosInstall : installApp} disabled={installing} className="w-full rounded-xl bg-amber-400 px-4 py-3 font-bold text-[#10243A] transition hover:bg-amber-300 disabled:opacity-60">
          {ios ? "I’ve Added the App" : installing ? "Opening install…" : "Install App"}
        </button>
        <button type="button" onClick={() => setVisible(false)} className="mt-3 w-full rounded-xl border border-white/20 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10">Maybe Later</button>
      </div>
    </div>
  );
}
