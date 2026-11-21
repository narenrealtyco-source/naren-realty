"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getPolicyDocument, POLICY_DOCUMENTS, type PolicyDocument, type PolicyType } from "../lib/policies";

export default function PolicyDocumentPage({ policyType }: { policyType: PolicyType }) {
  const initialDocument = POLICY_DOCUMENTS.find((document) => document.type === policyType) as PolicyDocument;
  const [document, setDocument] = useState(initialDocument);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      try {
        if (active) setDocument(getPolicyDocument(policyType));
      } catch {
        if (active) setDocument(initialDocument);
      }
    });
    return () => { active = false; };
  }, [policyType, initialDocument]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-[#10243A] text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-4 sm:gap-4 sm:px-6 sm:py-5">
          <Link href="/" className="min-w-0"><span className="block text-base font-bold tracking-wide sm:text-xl sm:tracking-widest">NAREN <span className="text-amber-400">REALTY</span></span><span className="mt-1 block text-[10px] tracking-wide text-slate-300 sm:text-xs sm:tracking-widest">POLICY DOCUMENTS</span></Link>
          <Link href="/" className="shrink-0 rounded-lg border border-amber-400 px-3 py-3 text-xs font-semibold text-amber-400 hover:bg-amber-400 hover:text-slate-950 sm:px-4 sm:text-sm">Back to Website</Link>
        </div>
      </header>
      <article className="mx-auto max-w-4xl px-5 py-8 sm:px-6 sm:py-12">
        <div className="border-b border-slate-200 pb-6"><p className="text-xs font-bold tracking-[0.18em] text-amber-700">NAREN REALTY</p><h1 className="mt-2 text-3xl font-bold text-[#10243A] sm:text-4xl">{document.title}</h1><p className="mt-3 text-sm text-slate-600">Version {document.version} · Last updated {document.lastUpdated}</p></div>
        <div className="mt-7 space-y-7">{document.sections.map((section) => <section key={section.heading}><h2 className="text-lg font-bold text-[#10243A]">{section.heading}</h2><div className="mt-2 space-y-3 text-sm leading-7 text-slate-700">{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}{section.bullets && <ul className="list-disc space-y-2 pl-5">{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}</div></section>)}</div>
        <nav aria-label="Other policy documents" className="mt-10 border-t border-slate-200 pt-6"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Other Policies</p><ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">{POLICY_DOCUMENTS.filter((item) => item.type !== policyType).map((item) => <li key={item.type}><Link href={item.path} className="font-medium text-amber-800 hover:text-[#10243A]">{item.title}</Link></li>)}</ul></nav>
      </article>
    </main>
  );
}
