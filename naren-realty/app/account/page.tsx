"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import PolicyConsentFields from "../components/PolicyConsentFields";
import { getEnquiriesLocally, type EnquiryRecord } from "../lib/enquiries";
import { acknowledgeBrokerage, getMissingPolicies, getUserBrokerageAcknowledgements, recordPolicyAcceptances, type BrokerageAcknowledgement, type PolicyType } from "../lib/policies";
import { createSupabaseBrowserClient } from "../lib/supabase-browser";
import {
  getCustomerFavorites,
  getCustomerSession,
  loginCustomer,
  logoutCustomer,
  registerCustomer,
  resendCustomerConfirmationEmail,
  requestCustomerPasswordReset,
  removeCustomerFavorite,
  updateCustomerProfile,
  type CustomerAccount,
  type CustomerFavorite,
} from "../lib/customers";

type AccountTab = "profile" | "favourites" | "enquiries" | "visits";
const CUSTOMER_POLICIES: PolicyType[] = ["customer_terms", "privacy_policy"];

type CustomerVisit = {
  id: string;
  customer_id: string;
  property_id: string;
  customer_name: string;
  visit_date: string;
  visit_time: string;
  status: string;
  created_at: string;
  properties: {
    title: string | null;
    locality: string | null;
    category: string | null;
  } | {
    title: string | null;
    locality: string | null;
    category: string | null;
  }[] | null;
};

const statusStyles: Record<string, string> = {
  New: "bg-amber-100 text-amber-900",
  Contacted: "bg-sky-100 text-sky-900",
  "Visit Scheduled": "bg-indigo-100 text-indigo-900",
  "Deal Closed": "bg-emerald-100 text-emerald-900",
  Lost: "bg-rose-100 text-rose-900",
};

const visitStatusDetails: Record<string, { label: string; message: string; style: string }> = {
  pending: { label: "Pending", message: "Awaiting Admin confirmation.", style: "bg-amber-100 text-amber-900" },
  confirmed: { label: "Confirmed", message: "Visit confirmed by our team.", style: "bg-emerald-100 text-emerald-900" },
  rescheduled: { label: "Rescheduled", message: "Visit schedule updated by our team.", style: "bg-sky-100 text-sky-900" },
  completed: { label: "Completed", message: "Visit marked completed.", style: "bg-slate-200 text-slate-800" },
  cancelled: { label: "Cancelled", message: "Visit request cancelled.", style: "bg-rose-100 text-rose-900" },
};

function visitPropertyDetails(visit: CustomerVisit) {
  return Array.isArray(visit.properties) ? visit.properties[0] ?? null : visit.properties;
}

function formatVisitDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function formatVisitTime(value: string): string {
  const match = /^(\d{2}):(\d{2})/.exec(value);
  if (!match) return `${value} IST`;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return `${value} IST`;
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"} IST`;
}

export default function CustomerAccountPage() {
  const [customer, setCustomer] = useState<CustomerAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [tab, setTab] = useState<AccountTab>("profile");
  const [fullName, setFullName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [referralCategory, setReferralCategory] = useState<"tenant" | "owner">("tenant");
  const [authError, setAuthError] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [verificationPending, setVerificationPending] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [resendSubmitting, setResendSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [signingOut, setSigningOut] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [policyChecks, setPolicyChecks] = useState<Partial<Record<PolicyType, boolean>>>({});
  const [pendingPolicies, setPendingPolicies] = useState<PolicyType[]>([]);
  const [policyError, setPolicyError] = useState("");
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);
  const [favorites, setFavorites] = useState<CustomerFavorite[]>([]);
  const [enquiries, setEnquiries] = useState<EnquiryRecord[]>([]);
  const [visits, setVisits] = useState<CustomerVisit[]>([]);
  const [visitCount, setVisitCount] = useState<number | null>(null);
  const [visitsLoading, setVisitsLoading] = useState(true);
  const [visitsError, setVisitsError] = useState("");
  const [visitsReload, setVisitsReload] = useState(0);
  const [brokerageAcknowledgements, setBrokerageAcknowledgements] = useState<BrokerageAcknowledgement[]>([]);
  const [dataError, setDataError] = useState("");

  useEffect(() => {
    let active = true;
    function selectHashMode() {
      if (window.location.hash === "#login") setMode("login");
      if (window.location.hash === "#signup") setMode("signup");
    }
    const params = new URLSearchParams(window.location.search);
    const incomingReferralCode = params.get("ref")?.trim().toUpperCase() ?? "";
    const incomingReferralCategory = params.get("category")?.trim().toLowerCase();
    if (/^[0-9A-F]{10}$/.test(incomingReferralCode)) {
      setReferralCode(incomingReferralCode);
      setMode("signup");
      if (incomingReferralCategory === "owner") setReferralCategory("owner");
      else setReferralCategory("tenant");
    }
    window.addEventListener("hashchange", selectHashMode);
    void (async () => {
      selectHashMode();
      try {
        const currentCustomer = await getCustomerSession();
        if (!active) return;
        setCustomer(currentCustomer);
        if (currentCustomer) setPendingPolicies(getMissingPolicies(currentCustomer.id, "customer", CUSTOMER_POLICIES).map((document) => document.type));
      } catch {
        if (active) setAuthError("Account information could not be loaded from this browser.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; window.removeEventListener("hashchange", selectHashMode); };
  }, []);

  useEffect(() => {
    if (!customer) return;
    const customerId = customer.id;

    function refresh() {
      try {
        setFavorites(getCustomerFavorites(customerId));
        setEnquiries(getEnquiriesLocally().filter((enquiry) => enquiry.customerId === customerId));
        setBrokerageAcknowledgements(getUserBrokerageAcknowledgements(customerId, "customer"));
        setPendingPolicies(getMissingPolicies(customerId, "customer", CUSTOMER_POLICIES).map((document) => document.type));
        setDataError("");
      } catch {
        setDataError("Your account data could not be loaded from this browser.");
      }
    }

    queueMicrotask(refresh);
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, [customer]);

  useEffect(() => {
    if (!customer) return;
    let active = true;
    let requestSequence = 0;
    const customerId = customer.id;
    const supabase = createSupabaseBrowserClient();

    async function refreshVisits() {
      const request = ++requestSequence;
      try {
        const rows: CustomerVisit[] = [];
        let totalCount = 0;
        for (;;) {
          const { data, error, count } = await supabase
            .from("visit_requests")
            .select("id,customer_id,property_id,customer_name,visit_date,visit_time,status,created_at,properties(title,locality,category)", { count: "exact" })
            .eq("customer_id", customerId)
            .order("created_at", { ascending: false })
            .order("id", { ascending: false })
            .range(rows.length, rows.length + 99)
            .overrideTypes<CustomerVisit[], { merge: false }>();
          if (error || count === null) throw error ?? new Error("Visit request count was unavailable.");
          rows.push(...(data ?? []));
          totalCount = count;
          if (rows.length >= totalCount) break;
          if (!data?.length) throw new Error("Visit requests could not be fully loaded.");
        }
        if (active && request === requestSequence) {
          setVisits(rows);
          setVisitCount(totalCount);
          setVisitsError("");
        }
      } catch {
        if (active && request === requestSequence) setVisitsError("Your visit requests could not be loaded. Please try again.");
      } finally {
        if (active && request === requestSequence) setVisitsLoading(false);
      }
    }

    void refreshVisits();

    if (tab !== "visits") {
      return () => { active = false; };
    }

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshVisits();
    }, 30_000);
    function refreshWhenVisible() {
      if (document.visibilityState === "visible") void refreshVisits();
    }
    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("focus", refreshWhenVisible);
    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("focus", refreshWhenVisible);
    };
  }, [customer, tab, visitsReload]);

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError("");
    setAuthNotice("");
    try {
      if (mode === "signup" && CUSTOMER_POLICIES.some((type) => policyChecks[type] !== true)) {
        setAuthError("Accept both required policies to create your account.");
        return;
      }
      setAuthSubmitting(true);
      if (mode === "signup") {
        const result = await registerCustomer({
          fullName,
          mobileNumber,
          email,
          password,
          ...(referralCode ? { referralCode, referralCategory } : {}),
        });
        if (!result.customer) {
          setAuthNotice("Signup request accepted. If email confirmation is enabled, check your inbox and confirm your account before logging in.");
          setMode("login");
          setPassword("");
          return;
        }
        if (result.customer) {
          recordPolicyAcceptances(result.customer.id, "customer", CUSTOMER_POLICIES);
          setVisitsLoading(true);
          setVisitsError("");
          setCustomer(result.customer);
          setPendingPolicies([]);
        }
      } else {
        const account = await loginCustomer(email, password);
        setVisitsLoading(true);
        setVisitsError("");
        setCustomer(account);
        setPendingPolicies(getMissingPolicies(account.id, "customer", CUSTOMER_POLICIES).map((document) => document.type));
      }
      setPolicyChecks({});
      setPassword("");
      setTab("profile");
      const nextPath = new URLSearchParams(window.location.search).get("next");
      if (nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")) {
        window.location.assign(nextPath);
        return;
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function resendVerificationEmail() {
    if (!verificationEmail || resendCooldown > 0 || resendSubmitting) return;
    setAuthError("");
    setAuthNotice("");
    setResendSubmitting(true);
    try {
      await resendCustomerConfirmationEmail(verificationEmail);
      setAuthNotice("A fresh verification link has been sent. Please check your inbox and Spam/Promotions folder.");
      setResendCooldown(60);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Verification email could not be sent.");
    } finally {
      setResendSubmitting(false);
    }
  }

  async function submitPasswordResetRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError("");
    setAuthNotice("");
    setResetSubmitting(true);
    try {
      await requestCustomerPasswordReset(resetEmail);
      setAuthNotice("If an account exists for that email, a password reset link has been sent.");
      setShowForgotPassword(false);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Password reset email could not be sent.");
    } finally {
      setResetSubmitting(false);
    }
  }

  function acceptUpdatedPolicies(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!customer || pendingPolicies.some((type) => policyChecks[type] !== true)) {
      setPolicyError("Accept every current policy version to continue.");
      return;
    }
    try {
      recordPolicyAcceptances(customer.id, "customer", pendingPolicies);
      setPendingPolicies([]);
      setPolicyChecks({});
      setPolicyError("");
    } catch {
      setPolicyError("Policy acceptance could not be recorded.");
    }
  }

  function beginProfileEdit() {
    if (!customer) return;
    setFullName(customer.fullName);
    setMobileNumber(customer.mobileNumber);
    setEmail(customer.email);
    setProfileError("");
    setProfileSaved(false);
    setProfileEditing(true);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!customer) return;
    try {
      const updated = await updateCustomerProfile(customer.id, { fullName: fullName.trim(), mobileNumber: mobileNumber.trim(), email: email.trim() });
      setCustomer(updated);
      setProfileEditing(false);
      setProfileError("");
      setProfileSaved(true);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Profile could not be saved.");
    }
  }

  async function signOut() {
    setSigningOut(true);
    try {
      await logoutCustomer();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Unable to log out.");
      setSigningOut(false);
      return;
    }
    setCustomer(null);
    setFavorites([]);
    setEnquiries([]);
    setVisits([]);
    setVisitCount(null);
    setVisitsError("");
    setVisitsLoading(false);
    setProfileEditing(false);
    setFullName("");
    setMobileNumber("");
    setEmail("");
    setPassword("");
    setAuthError("");
    setAuthNotice("");
    setPolicyChecks({});
    setPendingPolicies([]);
    setSigningOut(false);
  }

  function removeFavorite(propertyId: string) {
    if (!customer) return;
    removeCustomerFavorite(customer.id, propertyId);
    setFavorites(getCustomerFavorites(customer.id));
  }

  function acknowledgeBrokerageRecord(acknowledgementId: string) {
    if (!customer) return;
    try {
      acknowledgeBrokerage(customer.id, "customer", acknowledgementId);
      setBrokerageAcknowledgements(getUserBrokerageAcknowledgements(customer.id, "customer"));
      setDataError("");
    } catch {
      setDataError("Brokerage acknowledgement could not be recorded.");
    }
  }

  if (loading) return <main className="min-h-screen bg-slate-50" />;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-[#A71930] text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:flex-nowrap sm:gap-4 sm:px-6 sm:py-5">
          <Link href="/" className="min-w-0"><span className="block text-xl font-bold tracking-widest">NAREN <span className="text-white/80">REALTY</span></span><span className="mt-1 block text-xs tracking-widest text-slate-300">{customer ? "MY ACCOUNT" : "CUSTOMER ACCOUNT"}</span></Link>
          <div className="flex flex-wrap items-center gap-2"><Link href="/properties" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/30 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-white/10">Browse Homes</Link>{customer && <button onClick={signOut} disabled={signingOut} className="min-h-11 rounded-lg bg-white px-3 py-2 text-sm font-bold text-[#A71930] hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60">{signingOut ? "Logging out..." : "Log Out"}</button>}</div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 [overflow-wrap:anywhere] sm:px-6 sm:py-12">
        {!customer ? verificationPending ? <div className="mx-auto max-w-lg rounded-xl border border-amber-200 bg-white p-5 shadow-sm sm:p-8"><div className="mx-auto flex size-16 items-center justify-center rounded-full bg-amber-50 text-[#A71930]"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-8"><path d="M3 6.5 12 13l9-6.5M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"/></svg></div><p className="mt-5 text-center text-xs font-bold tracking-[0.18em] text-[#A71930]">ONE LAST STEP</p><h1 className="mt-2 text-center text-2xl font-bold text-[#A71930]">Verify your email to activate your account</h1><p className="mt-3 text-center text-sm leading-6 text-slate-600">We have sent a verification link to:</p><p className="mt-1 break-all text-center font-semibold text-[#A71930]">{verificationEmail}</p><p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-950">Open the email from NAREN REALTY and tap <strong>Confirm your email</strong>. Your account will be ready after verification.</p><ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-slate-600"><li>Check Inbox, Spam and Promotions folders.</li><li>Keep this page open, then return here after confirming.</li></ul>{authNotice && <p role="status" className="mt-4 text-sm text-emerald-800">{authNotice}</p>}{authError && <p role="alert" className="mt-3 text-sm text-rose-700">{authError}</p>}<button type="button" onClick={() => void resendVerificationEmail()} disabled={resendSubmitting || resendCooldown > 0} className="mt-5 w-full rounded-lg bg-[#A71930] px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{resendSubmitting ? "Sending..." : resendCooldown > 0 ? "Resend link in " + resendCooldown + "s" : "Resend Verification Email"}</button><button type="button" onClick={() => { setVerificationPending(false); setMode("signup"); setAuthError(""); setAuthNotice(""); }} className="mt-3 min-h-11 w-full text-sm font-semibold text-[#A71930] underline">Wrong email? Change email address</button><button type="button" onClick={() => { setVerificationPending(false); setMode("login"); setEmail(verificationEmail); setAuthError(""); setAuthNotice(""); }} className="mt-3 min-h-11 w-full text-sm font-semibold text-[#A71930] underline">Back to Login</button><p className="mt-3 text-center text-xs text-slate-500">Already verified? You can log in with your email and password.</p></div> : <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-8">
          <p className="text-xs font-bold tracking-[0.18em] text-[#A71930]">CUSTOMER SERVICES</p><h1 className="mt-2 text-3xl font-bold text-[#A71930]">{mode === "signup" ? "Create your account" : "Welcome back"}</h1><p className="mt-2 text-sm leading-6 text-slate-600">Browse homes without an account. Sign in to manage your profile, favourites, and enquiries.</p>
          <div className="mt-6 grid grid-cols-2 border-b border-slate-200"><button onClick={() => { setMode("signup"); setShowForgotPassword(false); setAuthError(""); setAuthNotice(""); setPolicyChecks({}); }} className={`border-b-2 py-3 text-sm font-semibold ${mode === "signup" ? "border-[#A71930] text-[#A71930]" : "border-transparent text-slate-500"}`}>Sign up</button><button onClick={() => { setMode("login"); setShowForgotPassword(false); setAuthError(""); setAuthNotice(""); setPolicyChecks({}); }} className={`border-b-2 py-3 text-sm font-semibold ${mode === "login" ? "border-[#A71930] text-[#A71930]" : "border-transparent text-slate-500"}`}>Login</button></div>
          <form onSubmit={submitAuth} className="mt-6 space-y-4">
            {mode === "signup" && referralCode && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">Referral applied: {referralCategory === "owner" ? "Property Owner" : "Tenant"} registration.</p>}
            {mode === "signup" && <><label className="block text-sm font-semibold">Full name<input required autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-4 py-3 text-base font-normal outline-none focus:border-[#A71930]" /></label><label className="block text-sm font-semibold">Mobile number<input required type="tel" autoComplete="tel" value={mobileNumber} onChange={(event) => setMobileNumber(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-4 py-3 text-base font-normal outline-none focus:border-[#A71930]" /></label></>}
            <label className="block text-sm font-semibold">Email address<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-4 py-3 text-base font-normal outline-none focus:border-[#A71930]" /></label>
            <label className="block text-sm font-semibold">Password<input required type="password" minLength={8} autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-4 py-3 text-base font-normal outline-none focus:border-[#A71930]" /><span className="mt-1 block text-xs font-normal text-slate-500">At least 8 characters.</span></label>
            {mode === "signup" && <PolicyConsentFields policyTypes={CUSTOMER_POLICIES} values={policyChecks} onChange={(type, accepted) => setPolicyChecks((current) => ({ ...current, [type]: accepted }))} />}
            {authNotice && <p role="status" className="text-sm text-emerald-800">{authNotice}</p>}
            {authError && <p role="alert" className="text-sm text-rose-700">{authError}</p>}
            <button disabled={authSubmitting} className="w-full rounded-lg bg-[#A71930] px-5 py-3 font-semibold text-white hover:bg-[#861326] disabled:cursor-not-allowed disabled:opacity-60">{authSubmitting ? "Please wait..." : mode === "signup" ? "Create Account" : "Log In"}</button>
          </form>
          {mode === "login" && <div className="mt-4">
            {!showForgotPassword ? <button type="button" onClick={() => { setResetEmail(email); setAuthError(""); setAuthNotice(""); setShowForgotPassword(true); }} className="inline-flex min-h-11 items-center text-sm font-semibold text-[#A71930] underline hover:text-[#A71930]">Forgot password?</button> : <form onSubmit={submitPasswordResetRequest} className="space-y-3 rounded-lg bg-slate-50 p-4">
              <p className="text-sm font-semibold text-[#A71930]">Reset your password</p>
              <label className="block text-sm font-semibold">Email address<input required type="email" autoComplete="email" value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-4 py-3 text-base font-normal outline-none focus:border-[#A71930]" /></label>
              <button disabled={resetSubmitting} className="w-full rounded-lg border border-[#A71930] px-4 py-2.5 text-sm font-semibold text-[#A71930] disabled:cursor-not-allowed disabled:opacity-60">{resetSubmitting ? "Sending..." : "Send reset link"}</button>
              <button type="button" onClick={() => setShowForgotPassword(false)} className="min-h-11 w-full text-sm font-semibold text-slate-600">Back to login</button>
            </form>}
          </div>}
        </div> : pendingPolicies.length > 0 ? <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-8"><p className="text-xs font-bold tracking-[0.18em] text-[#A71930]">POLICY UPDATE</p><h1 className="mt-2 text-2xl font-bold text-[#A71930]">Review updated policies</h1><p className="mt-2 text-sm leading-6 text-slate-600">Your account needs acceptance of the current versions before you continue to My Account.</p><form onSubmit={acceptUpdatedPolicies} className="mt-6 space-y-4"><PolicyConsentFields policyTypes={pendingPolicies} values={policyChecks} onChange={(type, accepted) => setPolicyChecks((current) => ({ ...current, [type]: accepted }))} />{policyError && <p role="alert" className="text-sm text-rose-700">{policyError}</p>}<button className="w-full rounded-lg bg-[#A71930] px-5 py-3 font-semibold text-white">Accept Current Policies</button></form></div> : <>
          <div className="flex flex-col gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold tracking-[0.18em] text-[#A71930]">CUSTOMER DASHBOARD</p><h1 className="mt-2 text-3xl font-bold text-[#A71930]">My Account</h1><p className="mt-2 text-sm text-slate-600">Welcome, {customer.fullName}</p></div><div className="flex flex-wrap gap-2"><Link href="/list-property" className="rounded-lg border border-[#A71930] px-5 py-3 text-center text-sm font-bold text-[#A71930]">List Your Property</Link><Link href="/properties" className="rounded-lg bg-white px-5 py-3 text-center text-sm font-bold text-[#A71930] ring-1 ring-[#A71930]">Find a Property</Link></div></div>
          <div className="mt-6 flex flex-wrap border-b border-slate-200">{([["profile", "My Profile"], ["favourites", `Favourites (${favorites.length})`], ["enquiries", `My Enquiries (${enquiries.length})`], ["visits", `My Visits (${visitCount ?? 0})`]] as const).map(([key, label]) => <button key={key} onClick={() => { if (key === "visits") { setVisitsLoading(true); setVisitsError(""); } setTab(key); }} aria-pressed={tab === key} className={`border-b-2 px-4 py-3 text-sm font-semibold ${tab === key ? "border-[#A71930] text-[#A71930]" : "border-transparent text-slate-500 hover:text-slate-800"}`}>{label}</button>)}<Link href="/account/referrals" className="border-b-2 border-transparent px-4 py-3 text-sm font-semibold text-slate-500 hover:text-slate-800">Refer &amp; Earn</Link></div>
          {dataError && <p role="alert" className="mt-5 text-sm text-rose-700">{dataError}</p>}
          {tab === "visits" && <section className="mt-6" aria-labelledby="my-visits-heading">
            <h2 id="my-visits-heading" className="sr-only">My Visits</h2>
            {visitsLoading ? <p role="status" className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">Loading your visit requests...</p> :
              visitsError ? <div className="rounded-lg border border-rose-200 bg-white p-5"><p role="alert" className="text-sm text-rose-700">{visitsError}</p><button type="button" onClick={() => { setVisitsLoading(true); setVisitsReload((value) => value + 1); }} className="mt-3 min-h-11 rounded-md bg-[#A71930] px-4 py-2 text-sm font-semibold text-white">Retry</button></div> :
                visits.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{visits.map((visit) => {
                  const property = visitPropertyDetails(visit);
                  const status = visitStatusDetails[visit.status] ?? {
                    label: visit.status || "Status unavailable",
                    message: "Visit request status updated.",
                    style: "bg-slate-100 text-slate-800",
                  };
                  return <article key={visit.id} className="min-w-0 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="break-words font-bold text-[#A71930]">{property?.title || "Property details unavailable"}</h3>
                        <p className="mt-1 break-words text-sm text-slate-600">{property?.locality || "Locality unavailable"} · {property?.category || "Category unavailable"}</p>
                      </div>
                      <span className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold ${status.style}`}>{status.label}</span>
                    </div>
                    <dl className="mt-4 space-y-2 text-sm">
                      <div><dt className="inline font-semibold text-slate-700">Visit date: </dt><dd className="inline text-slate-600">{formatVisitDate(visit.visit_date)}</dd></div>
                      <div><dt className="inline font-semibold text-slate-700">Visit time: </dt><dd className="inline text-slate-600">{formatVisitTime(visit.visit_time)}</dd></div>
                    </dl>
                    <p className="mt-3 text-sm text-slate-600">{status.message}</p>
                    <Link href={`/properties/${visit.property_id}`} className="mt-4 inline-flex min-h-11 items-center font-semibold text-[#A71930] hover:text-[#861326]">View Property</Link>
                  </article>;
                })}</div> : <div className="border-y border-slate-200 py-14 text-center"><h2 className="font-bold text-[#A71930]">No visit requests yet</h2><p className="mt-2 text-sm text-slate-600">Property visits you request will appear here.</p><Link href="/properties" className="mt-4 inline-flex min-h-11 items-center font-semibold text-[#A71930]">Browse Properties</Link></div>}
          </section>}
          {tab === "profile" && <section className="mt-6 max-w-2xl rounded-lg border border-slate-200 bg-white p-5 sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold tracking-wider text-[#A71930]">ACCOUNT DETAILS</p><h2 className="mt-1 text-xl font-bold text-[#A71930]">My Profile</h2></div>{!profileEditing && <button onClick={beginProfileEdit} className="min-h-11 rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-[#A71930] hover:border-[#A71930]">Edit Profile</button>}</div>
            {profileEditing ? <form onSubmit={saveProfile} className="mt-5 space-y-4"><label className="block text-sm font-semibold">Full name<input required value={fullName} onChange={(event) => setFullName(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-4 py-3 text-base font-normal" /></label><label className="block text-sm font-semibold">Mobile number<input required type="tel" value={mobileNumber} onChange={(event) => setMobileNumber(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-4 py-3 text-base font-normal" /></label><label className="block text-sm font-semibold">Email address<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-4 py-3 text-base font-normal" /></label>{profileError && <p role="alert" className="text-sm text-rose-700">{profileError}</p>}<div className="flex flex-wrap gap-3"><button className="rounded-lg bg-[#A71930] px-5 py-3 text-sm font-semibold text-white">Save Profile</button><button type="button" onClick={() => setProfileEditing(false)} className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700">Cancel</button></div></form> : <><dl className="mt-5 grid gap-4 sm:grid-cols-2"><div><dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Full name</dt><dd className="mt-1 font-semibold text-slate-800">{customer.fullName}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Mobile number</dt><dd className="mt-1 text-slate-800">{customer.mobileNumber}</dd></div><div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Email address</dt><dd className="mt-1 break-all text-slate-800">{customer.email}</dd></div></dl>{profileSaved && <p role="status" className="mt-4 text-sm text-emerald-800">Profile updated.</p>}</>}</section>}
          {tab === "favourites" && <section className="mt-6"><h2 className="sr-only">My Favourite Properties</h2>{favorites.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{favorites.map((favorite) => <article key={favorite.propertyId} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-[#A71930]">{favorite.type}</p><h3 className="mt-2 text-lg font-bold text-[#A71930]">{favorite.title}</h3><p className="mt-1 text-sm text-slate-600">{favorite.locality}, Pune{favorite.bedrooms ? ` · ${favorite.bedrooms} BHK` : ""}</p><p className="mt-3 font-bold text-[#A71930]">{favorite.price}</p><div className="mt-4 flex flex-wrap gap-2"><Link href={favorite.propertyId.startsWith("demo:") ? "/#properties" : `/properties/${favorite.propertyId}`} className="flex-1 rounded-md bg-[#A71930] px-3 py-2.5 text-center text-sm font-semibold text-white">View Property</Link><button onClick={() => removeFavorite(favorite.propertyId)} aria-label={`Remove ${favorite.title} from favourites`} className="rounded-md border border-rose-200 px-3 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50">Remove</button></div></article>)}</div> : <div className="border-y border-slate-200 py-14 text-center"><h2 className="font-bold text-[#A71930]">No favourite properties saved</h2><p className="mt-2 text-sm text-slate-600">Use the heart on a property to save it here.</p><Link href="/properties" className="mt-4 inline-flex min-h-11 items-center font-semibold text-[#A71930]">Browse properties</Link></div>}</section>}
          {tab === "enquiries" && <section className="mt-6"><h2 className="sr-only">My Enquiries</h2>{enquiries.length ? <div className="space-y-3">{[...enquiries].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((enquiry) => <article key={enquiry.id} className="rounded-lg border border-slate-200 bg-white p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-bold text-[#A71930]">{enquiry.propertyName}</h3><p className="mt-1 text-sm text-slate-600">{enquiry.locality}, Pune</p><p className="mt-2 text-xs text-slate-500">Submitted {new Date(enquiry.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p></div><span className={`self-start rounded-md px-3 py-1.5 text-sm font-semibold sm:self-center ${statusStyles[enquiry.status] ?? "bg-slate-100 text-slate-800"}`}>{enquiry.status}</span></div>{brokerageAcknowledgements.filter((acknowledgement) => acknowledgement.transactionReference === enquiry.id && acknowledgement.userRole === "customer").map((acknowledgement) => <div key={acknowledgement.id} className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-amber-900">Brokerage Acknowledgement · {acknowledgement.party}</p><p className="mt-2 text-sm leading-6 text-slate-700">{acknowledgement.statement}</p><p className="mt-2 text-xs text-slate-600">Policy version {acknowledgement.policyVersion} · {acknowledgement.acknowledgedAt ? `Acknowledged ${new Date(acknowledgement.acknowledgedAt).toLocaleString("en-IN")}` : "Pending acknowledgement"}</p>{!acknowledgement.acknowledgedAt && <button onClick={() => acknowledgeBrokerageRecord(acknowledgement.id)} className="mt-3 min-h-11 rounded-md bg-[#A71930] px-4 py-2 text-sm font-semibold text-white">Acknowledge</button>}</div>)}</article>)}</div> : <div className="border-y border-slate-200 py-14 text-center"><h2 className="font-bold text-[#A71930]">No enquiries on this account yet</h2><p className="mt-2 text-sm text-slate-600">Enquiries you submit while signed in will appear here.</p><Link href="/properties" className="mt-4 inline-flex min-h-11 items-center font-semibold text-[#A71930]">Browse properties</Link></div>}</section>}
        </>}
      </section>
    </main>
  );
}
