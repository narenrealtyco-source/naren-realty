import Link from "next/link";
import { POLICY_DOCUMENTS } from "../lib/policies";

export default function LegalPoliciesIndex() {
  return <main className="min-h-screen bg-slate-50 text-slate-900">
    <header className="bg-[#10243A] text-white"><div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-5 sm:px-6"><Link href="/" className="text-lg font-bold tracking-widest">NAREN <span className="text-amber-400">REALTY</span></Link><Link href="/" className="rounded-lg border border-amber-400 px-4 py-2 text-sm font-semibold text-amber-400">Back to Website</Link></div></header>
    <article className="mx-auto max-w-5xl px-4 py-10 sm:px-6"><p className="text-xs font-bold tracking-[0.2em] text-amber-700">NAREN REALTY</p><h1 className="mt-2 text-3xl font-bold text-[#10243A]">Legal &amp; Policies</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Please review the terms and policies that apply to using the NAREN REALTY website and services. Policies may be updated as platform features change.</p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{POLICY_DOCUMENTS.map((item) => <Link key={item.type} href={item.path} className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-amber-400 hover:shadow-md"><h2 className="font-bold text-[#10243A]">{item.title}</h2><p className="mt-2 text-xs text-slate-500">Version {item.version} · Updated {item.lastUpdated}</p><span className="mt-4 inline-block text-sm font-semibold text-amber-800">Read policy →</span></Link>)}
      <Link href="/referral-policy" className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-amber-400 hover:shadow-md"><h2 className="font-bold text-[#10243A]">Referral &amp; Reward Policy</h2><p className="mt-2 text-xs text-slate-500">Referral reward eligibility and conditions</p><span className="mt-4 inline-block text-sm font-semibold text-amber-800">Read policy →</span></Link></div>
      <p className="mt-8 rounded-lg bg-amber-50 p-4 text-xs leading-5 text-slate-600">These website policies are operational disclosures and should be reviewed by an Indian legal professional before being relied on as final legal documents. Contact NAREN REALTY for questions or complaints.</p>
    </article>
  </main>;
}
