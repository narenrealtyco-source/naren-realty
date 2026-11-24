"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCurrentPolicyDocuments, POLICY_DOCUMENTS, type PolicyType } from "../lib/policies";

const consentCopy: Record<PolicyType, { prefix: string; linkText: string; suffix: string }> = {
  customer_terms: { prefix: "I agree to the ", linkText: "Customer Terms & Conditions", suffix: "." },
  owner_terms: { prefix: "I agree to the ", linkText: "Property Owner Terms & Conditions", suffix: "." },
  pg_hostel_policy: { prefix: "I agree to the ", linkText: "PG / Hostel Terms & Conditions", suffix: "." },
  airbnb_policy: { prefix: "I agree to the ", linkText: "Airbnb / Short-Stay Terms & Conditions", suffix: "." },
  privacy_policy: { prefix: "I have read and agree to the ", linkText: "Privacy Policy", suffix: "." },
  brokerage_policy: { prefix: "I have read and agree to the ", linkText: "Brokerage Policy", suffix: "." },
  cancellation_refund_policy: { prefix: "I have read and agree to the ", linkText: "Cancellation & Refund Policy", suffix: "." },
  payment_policy: { prefix: "I have read and agree to the ", linkText: "Payment Policy", suffix: "." },
  listing_verification_policy: { prefix: "I have read and agree to the ", linkText: "Property Listing & Verification Policy", suffix: "." },
  site_visit_policy: { prefix: "I have read and agree to the ", linkText: "Enquiry & Site Visit Policy", suffix: "." },
  user_conduct_policy: { prefix: "I have read and agree to the ", linkText: "User Conduct Policy", suffix: "." },
  grievance_policy: { prefix: "I have read and agree to the ", linkText: "Grievance Redressal Policy", suffix: "." },
  disclaimer_policy: { prefix: "I have read and agree to the ", linkText: "Disclaimer", suffix: "." },
  cookie_policy: { prefix: "I have read and agree to the ", linkText: "Cookie Policy", suffix: "." },
  third_party_policy: { prefix: "I have read and agree to the ", linkText: "Third-Party Services Policy", suffix: "." },
  event_safety_policy: { prefix: "I have read and agree to the ", linkText: "Event Safety: No Alcohol, No Drugs & Prohibited Items Policy", suffix: "." },
};

export default function PolicyConsentFields({
  policyTypes,
  values,
  onChange,
}: {
  policyTypes: PolicyType[];
  values: Partial<Record<PolicyType, boolean>>;
  onChange: (type: PolicyType, accepted: boolean) => void;
}) {
  const [versions, setVersions] = useState<Record<string, string>>(() => Object.fromEntries(POLICY_DOCUMENTS.map((document) => [document.type, document.version])));

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        setVersions(Object.fromEntries(getCurrentPolicyDocuments().map((document) => [document.type, document.version])));
      } catch {
        setVersions(Object.fromEntries(POLICY_DOCUMENTS.map((document) => [document.type, document.version])));
      }
    });
    return () => { active = false; };
  }, []);

  return <fieldset className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
    <legend className="px-1 text-sm font-bold text-[#10243A]">Required Policy Acceptance</legend>
    {policyTypes.map((type) => {
      const document = POLICY_DOCUMENTS.find((item) => item.type === type);
      if (!document) return null;
      const copy = consentCopy[type];
      return <label key={type} className="flex items-start gap-3 text-sm leading-6 text-slate-700">
        <input type="checkbox" required checked={values[type] === true} onChange={(event) => onChange(type, event.target.checked)} className="mt-1 size-4 shrink-0 accent-amber-500" />
        <span>{copy.prefix}<Link href={document.path} target="_blank" className="font-semibold text-amber-800 underline underline-offset-2">{copy.linkText}</Link>{copy.suffix}<span className="block text-xs text-slate-500">Version {versions[type] ?? document.version}</span></span>
      </label>;
    })}
  </fieldset>;
}
