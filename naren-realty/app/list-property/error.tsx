"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ListPropertyError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[property-submission] Page failed to load", { digest: error.digest });
  }, [error]);

  return <main className="mx-auto max-w-3xl bg-white p-4 text-slate-950 sm:p-8">
    <h1 className="text-2xl font-bold">List Your Property</h1>
    <p role="alert" className="mt-3 text-rose-700">The property submission page could not be loaded. Please try again.</p>
    <div className="mt-4 flex flex-wrap items-center gap-4">
      <button type="button" onClick={reset} className="min-h-11 rounded-lg bg-[#10243A] px-4 py-2 font-semibold text-white">Try again</button>
      <Link href="/account" className="inline-flex min-h-11 items-center underline">My account</Link>
    </div>
  </main>;
}
