import Link from "next/link";

const sections = [
  {
    heading: "1. Referral categories and rewards",
    bullets: [
      "Tenant referral: ₹1,000, subject to every eligibility condition in this policy.",
      "Property Owner referral: ₹2,000, subject to every eligibility condition in this policy.",
      "Buyer referral: No reward is offered.",
      "PG / Hostel referral: No reward is offered.",
    ],
  },
  {
    heading: "2. Tenant referral eligibility – ₹1,000",
    bullets: [
      "The referred tenant must register using the referrer's valid Tenant referral link/code before the relevant enquiry or transaction.",
      "The tenant's requirement, enquiry or property interaction must be recorded through NAREN REALTY.",
      "The tenant must complete the rental transaction through NAREN REALTY and execute the applicable Rent / Leave & License Agreement.",
      "The transaction and referral source must be verified and approved by NAREN REALTY Admin.",
    ],
  },
  {
    heading: "3. Property Owner referral eligibility – ₹2,000",
    bullets: [
      "The referred owner must register using the referrer's valid Property Owner referral link/code.",
      "The owner must submit the property on NAREN REALTY and the listing must be approved by Admin.",
      "The successful rental or resale transaction must be completed through NAREN REALTY in relation to that approved listing.",
      "The transaction and referral source must be verified and approved by NAREN REALTY Admin.",
    ],
  },
  {
    heading: "4. Direct, market-side and other-broker transactions – no reward",
    paragraphs: [
      "A referral registration, referral link, customer introduction, property listing or listing approval by itself does not create any right to a reward.",
      "No reward is payable if the referred tenant independently finds or takes the property from the open market, directly from the owner, or through another broker, agent, intermediary or external channel.",
      "No reward is payable if the referred owner independently rents or sells the same referred/listed property in the open market, directly to a tenant or buyer, or through another broker, agent, intermediary or external channel.",
      "This exclusion applies even if the same property was listed, displayed, submitted or approved on NAREN REALTY, where the actual transaction was completed outside NAREN REALTY.",
      "The rule applies equally to Tenant Referrals and Property Owner Referrals. If the transaction is not completed through NAREN REALTY, the referral reward is ₹0.",
    ],
  },
  {
    heading: "5. Referral registration and anti-abuse rules",
    bullets: [
      "The referral code must be recorded before the referred user's relevant enquiry or transaction. A code cannot be added retrospectively to claim a reward.",
      "Self-referrals, fake or misleading referrals, duplicate claims, manipulated records and attempts to claim a reward after an independently sourced deal are not eligible.",
      "Only one reward may be paid for the same qualifying referral attribution. A referral code does not guarantee a reward.",
      "NAREN REALTY may reject a claim where the referral source, identity, property connection or transaction route cannot be reasonably verified.",
    ],
  },
  {
    heading: "6. Verification and records",
    paragraphs: [
      "Admin may review referral registration timestamps, referral code records, customer requirements, enquiries, property IDs, visit requests, communications and confirmations available to NAREN REALTY.",
      "NAREN REALTY may request reasonable confirmation from the relevant parties. An OTP or digital confirmation is supporting evidence of the confirmation made through the registered account/mobile number; it is not, by itself, conclusive legal proof that a transaction or agreement occurred.",
      "If the transaction route or referral source is unclear, the claim may remain pending or be rejected. No reward is due merely because a property was listed or a deal is reported as completed.",
    ],
  },
  {
    heading: "7. Approval and payment",
    bullets: [
      "All rewards are subject to final Admin verification and approval. Rewards are not automatically payable.",
      "Approved rewards are paid manually by NAREN REALTY. Payment date, amount and available payment reference may be recorded.",
      "Referral rewards are separate from brokerage or other transaction charges.",
      "Applicable tax and legal requirements, if any, will apply.",
    ],
  },
  {
    heading: "8. Status and policy administration",
    paragraphs: [
      "Referral records may show statuses such as Registered, Pending, Eligible, Rejected or Paid. An Eligible status is subject to final Admin approval and does not mean payment has already been made.",
      "NAREN REALTY may verify, reject or investigate suspected misuse and may update this policy prospectively. The version and effective date displayed on this page identify the published policy.",
    ],
  },
];

export default function ReferralPolicyPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-[#10243A] text-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-5 sm:px-6">
          <Link href="/" className="text-lg font-bold tracking-widest">NAREN <span className="text-amber-400">REALTY</span></Link>
          <Link href="/account/referrals" className="rounded-lg border border-white/30 px-3 py-2 text-sm font-semibold">Refer &amp; Earn</Link>
        </div>
      </header>
      <article className="mx-auto max-w-4xl px-5 py-8 sm:px-6 sm:py-12">
        <p className="text-xs font-bold tracking-[0.18em] text-amber-700">OFFICIAL PROGRAM TERMS</p>
        <h1 className="mt-2 text-3xl font-bold text-[#10243A] sm:text-4xl">Referral &amp; Reward Policy</h1>
        <p className="mt-3 text-sm text-slate-600">Version 1.1 · Effective 18 November 2026</p>
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-950">
          Core rule: No NAREN REALTY transaction = No referral reward. A deal completed directly, in the open market or through another broker does not qualify, even if the same property is listed on NAREN REALTY.
        </div>
        <div className="mt-8 space-y-7">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-lg font-bold text-[#10243A]">{section.heading}</h2>
              {section.paragraphs?.map((paragraph) => <p key={paragraph} className="mt-2 text-sm leading-7 text-slate-700">{paragraph}</p>)}
              {section.bullets && <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700">{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}
            </section>
          ))}
        </div>
        <div className="mt-10 border-t border-slate-200 pt-6 text-sm text-slate-600">
          <p>For referral queries, contact NAREN REALTY Admin through the official website.</p>
          <Link href="/account/referrals" className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-[#10243A] px-5 font-semibold text-white">Go to Refer &amp; Earn</Link>
        </div>
      </article>
    </main>
  );
}
