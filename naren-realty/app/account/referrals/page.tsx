"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCustomerSession } from "../../lib/customers";
import { createSupabaseBrowserClient } from "../../lib/supabase-browser";

const supabase = createSupabaseBrowserClient();

type ReferralHistoryItem = {
  referralType: "tenant" | "owner";
  rewardAmount: number;
  status: "pending" | "eligible" | "approved" | "paid" | "rejected";
  createdAt: string;
};

type ReferralDashboard = {
  tenantCode: string | null;
  ownerCode: string | null;
  total: number;
  tenants: number;
  owners: number;
  history: ReferralHistoryItem[];
};

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function statusLabel(status: ReferralHistoryItem["status"]): string {
  return ({
    pending: "Pending",
    eligible: "Eligible",
    approved: "Approved",
    paid: "Paid",
    rejected: "Not eligible",
  })[status];
}

export default function ReferralsPage() {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<ReferralDashboard | null>(null);
  const [origin, setOrigin] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<"tenant" | "owner" | "">("");
  const [hasClaimableReward, setHasClaimableReward] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    let active = true;

    async function loadDashboard() {
      try {
        const customer = await getCustomerSession();
        if (!customer) {
          if (active) setSignedIn(false);
          return;
        }
        if (active) setSignedIn(true);
        const { data: claimable } = await supabase.from("referral_attributions")
          .select("id").eq("referred_user_id", customer.id).in("status", ["approved", "paid"])
          .not("reward_triggered_at", "is", null).limit(1);
        if (active) setHasClaimableReward(Boolean(claimable?.length));

        const { data, error: rpcError } = await supabase.rpc("customer_referral_dashboard");
        if (rpcError) throw rpcError;
        if (!data || typeof data !== "object") throw new Error("Referral information is unavailable.");

        const result = data as ReferralDashboard;
        if (
          !Array.isArray(result.history)
          || typeof result.total !== "number"
          || typeof result.tenants !== "number"
          || typeof result.owners !== "number"
        ) {
          throw new Error("Referral information could not be verified.");
        }
        if (active) setDashboard(result);
      } catch {
        if (active) setError("Your referral information could not be loaded. Please try again later.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadDashboard();
    return () => { active = false; };
  }, []);

  function referralUrl(category: "tenant" | "owner"): string {
    if (!dashboard || !origin) return "";
    const code = category === "tenant" ? dashboard.tenantCode : dashboard.ownerCode;
    if (!code) return "";
    const url = new URL("/account", origin);
    url.searchParams.set("ref", code);
    url.searchParams.set("category", category);
    url.hash = "signup";
    return url.toString();
  }

  async function copyReferralLink(category: "tenant" | "owner") {
    const url = referralUrl(category);
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(category);
    } catch {
      setError("The referral link could not be copied. Please try again.");
    }
  }

  const shareText = (category: "tenant" | "owner") =>
    `NAREN REALTY Refer & Earn – ${category === "tenant" ? "Tenant ₹1,000" : "Owner ₹2,000"} referral reward. Offer valid till 31 December 2026. Terms & Conditions Apply. Join using my referral link: ${referralUrl(category)} Referral policy: https://narenrealty.co/referral-policy`;

  const referralCards = [
    {
      category: "tenant" as const,
      title: "Refer a Tenant",
      description: "₹1,000 reward after a qualifying rental transaction.",
      unavailable: "Complete a property visit request or property enquiry to unlock your Tenant referral link. A property requirement submission alone does not qualify.",
    },
    {
      category: "owner" as const,
      title: "Refer a Property Owner",
      description: "₹2,000 reward after an approved listing and successful deal.",
      unavailable: "Open the Owner Portal, complete activation by accepting the relevant Owner Terms and Privacy Policy, and have at least one approved property to unlock your Owner referral link.",
    },
  ];

  return <main className="min-h-screen bg-slate-50 pb-24 text-slate-900 sm:pb-12">
    <header className="bg-[#10243A] text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5">
        <Link href="/" className="min-w-0">
          <span className="block text-xl font-bold tracking-widest">NAREN <span className="text-amber-400">REALTY</span></span>
          <span className="mt-1 block text-xs tracking-widest text-slate-300">CUSTOMER SERVICES</span>
        </Link>
        <div className="flex flex-wrap gap-2">{hasClaimableReward && <Link href="/account/referral-claim" className="inline-flex min-h-11 items-center rounded-lg border border-amber-300 px-4 text-sm font-semibold text-amber-300 hover:bg-white/10">Claim Reward</Link>}<Link href="/account" className="inline-flex min-h-11 items-center rounded-lg border border-white/30 px-4 text-sm font-semibold text-white hover:bg-white/10">My account</Link></div>
      </div>
    </header>

    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
      <section aria-labelledby="referral-heading" className="overflow-hidden rounded-2xl bg-[#10243A] p-5 text-white shadow-sm sm:p-8 lg:p-10">
        <p className="text-xs font-bold tracking-[0.18em] text-amber-400">LIMITED-TIME CUSTOMER REWARDS</p>
        <h1 id="referral-heading" className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">Refer &amp; Earn with NAREN REALTY</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">Share opportunities. Help people find their perfect property. Earn rewards.</p>
        <p className="mt-4 inline-flex rounded-lg bg-amber-400 px-4 py-2 text-sm font-extrabold uppercase tracking-wide text-[#10243A]">Offer valid till 31 December 2026</p>
        <p className="mt-2 text-xs font-semibold text-slate-300">Terms &amp; Conditions Apply. Please read the Referral &amp; Reward Policy.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/15 bg-white/5 p-4">
            <p className="text-sm font-semibold text-slate-300">Tenant Referral</p>
            <p className="mt-1 text-2xl font-bold text-amber-400">₹1,000</p>
          </div>
          <div className="rounded-xl border border-white/15 bg-white/5 p-4">
            <p className="text-sm font-semibold text-slate-300">Property Owner Referral</p>
            <p className="mt-1 text-2xl font-bold text-amber-400">₹2,000</p>
          </div>
        </div>
      </section>

      {loading && <p role="status" className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">Loading your referral dashboard...</p>}
      {!loading && !signedIn && <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-[#10243A]">Log in to access your referral links</h2>
        <p className="mt-2 text-sm text-slate-600">Your personal referral links are available inside your customer account.</p>
        <Link href="/account#login" className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-[#10243A] px-5 font-semibold text-white">Log in</Link>
      </section>}
      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}

      {!loading && dashboard && <>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-amber-700">YOUR REFERRAL LINKS</p>
            <h2 className="mt-2 text-xl font-bold text-[#10243A]">Share the right link for each referral</h2>
            <p className="mt-2 text-sm text-slate-600">Tenant and Owner referrals have separate codes. The referral type is locked when the new account is created.</p>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {referralCards.map(({ category, title, description, unavailable }) => {
              const code = category === "tenant" ? dashboard.tenantCode : dashboard.ownerCode;
              const url = referralUrl(category);
              return <article key={category} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="font-bold text-[#10243A]">{title}</h3>
                <p className="mt-1 text-sm text-slate-600">{description}</p>
                {code ? <>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Your code</p>
                  <p className="mt-1 font-bold tracking-wider text-[#10243A]">{code}</p>
                  <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-slate-500">Referral link
                    <input readOnly value={url} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-xs text-slate-700" />
                  </label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => void copyReferralLink(category)} className="min-h-11 rounded-lg bg-[#10243A] px-4 text-sm font-bold text-white">{copied === category ? "Copied" : "Copy Link"}</button>
                    <a href={`https://wa.me/?text=${encodeURIComponent(shareText(category))}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-lg border border-emerald-700 px-4 text-sm font-bold text-emerald-800 hover:bg-emerald-50">Share on WhatsApp</a>
                  </div>
                </> : <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-950">{unavailable}</p>}
              </article>;
            })}
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          {[
            ["Total Referrals", dashboard.total],
            ["Tenant Referrals", dashboard.tenants],
            ["Owner Referrals", dashboard.owners],
          ].map(([label, value]) => <article key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-600">{label}</p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-[#10243A]">{Number(value).toLocaleString("en-IN")}</p>
          </article>)}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <h2 className="text-xl font-bold text-[#10243A]">Referral activity</h2>
          <p className="mt-1 text-sm text-slate-600">Only referral category, date and reward status are shown. Referred customers' private details remain hidden.</p>
          {dashboard.history.length ? <div className="mt-4 divide-y divide-slate-100">
            {dashboard.history.map((item, index) => <div key={`${item.createdAt}-${item.referralType}-${index}`} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="font-semibold text-[#10243A]">{item.referralType === "tenant" ? "Tenant referral" : "Property owner referral"}</p>
                <p className="mt-1 text-xs text-slate-500">Registered {formatDate(item.createdAt)} · Reward ₹{Number(item.rewardAmount).toLocaleString("en-IN")}</p>
              </div>
              <span className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-800">{statusLabel(item.status)}</span>
            </div>)}
          </div> : <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-7 text-center">
            <h3 className="font-bold text-[#10243A]">No referrals yet</h3>
            <p className="mt-1 text-sm text-slate-600">Share your personal link to start building your referral activity.</p>
          </div>}
        </section>
        <p className="text-xs leading-5 text-slate-500">Rewards are payable only after the qualifying transaction and Admin verification. Reward approval and manual payouts are handled separately from brokerage.</p>
      </>}

      <section aria-labelledby="eligibility" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <h2 id="eligibility" className="text-2xl font-bold text-[#10243A]">Reward eligibility</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4">
            <h3 className="font-bold text-[#10243A]">Tenant referral <span className="text-amber-700">· ₹1,000</span></h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Payable only when the referred tenant completes a rental through NAREN REALTY, executes the Rent / Leave & License Agreement and passes Admin verification. Direct owner, market or other-broker deals do not qualify.</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <h3 className="font-bold text-[#10243A]">Property owner referral <span className="text-amber-700">· ₹2,000</span></h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Payable only when the referred owner’s approved listing is rented or resold through NAREN REALTY and Admin verifies the transaction. Direct, market or other-broker deals for the same property do not qualify.</p>
          </div>
        </div>
        <p className="mt-5 text-xs leading-5 text-slate-500">No reward is created by registration or listing alone. Deals completed directly, in the open market or through another broker do not qualify, even for the same property listed on NAREN REALTY. Admin verifies and manually pays qualifying rewards, separate from brokerage. No buyer or PG referral reward applies. See the full Referral & Reward Policy.</p>
      </section>
    </div>
  </main>;
}
