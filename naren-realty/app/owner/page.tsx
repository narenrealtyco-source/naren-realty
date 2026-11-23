"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { activateOwnerAccount } from "../actions/owner-activation";
import OwnerPropertyForm from "../components/OwnerPropertyForm";
import PolicyConsentFields from "../components/PolicyConsentFields";
import PropertyInformation from "../components/PropertyInformation";
import SupabaseOwnerDashboard from "./SupabaseOwnerDashboard";
import { getCustomerOrOwnerSession, type CustomerOrOwnerSession } from "../lib/customers";
import { hasSupabaseOwnerCapability } from "../lib/supabase-owner-properties";
import { acknowledgeBrokerage, getMissingPolicies, getUserBrokerageAcknowledgements, recordPolicyAcceptances, type BrokerageAcknowledgement, type PolicyType } from "../lib/policies";
import {
  createListing,
  createDefaultCategoryDetails,
  deleteOwnerListing,
  getOwnerListings,
  getOwnerSession,
  logoutOwner,
  updateOwnerListing,
  type OwnerAccount,
  type ListingType,
  type PropertyDetails,
  type PropertyListing,
} from "../lib/properties";

const emptyDetails: PropertyDetails = {
  title: "",
  type: "Rental",
  locality: "",
  price: 0,
  bedrooms: 1,
  bathrooms: 1,
  furnishing: "Unfurnished",
  description: "",
  photos: [],
  address: "",
  landmark: "",
  availableFrom: "",
  categoryDetails: createDefaultCategoryDetails("Rental"),
};

const OWNER_POLICY_BY_CATEGORY: Record<ListingType, PolicyType> = {
  Rental: "owner_terms",
  Resale: "owner_terms",
  PG: "pg_hostel_policy",
  Airbnb: "airbnb_policy",
};

function policiesForOwner(owner: OwnerAccount): PolicyType[] {
  const categories = new Set<ListingType>();
  if (owner.registrationCategory) categories.add(owner.registrationCategory);
  getOwnerListings(owner.id).forEach((listing) => categories.add(listing.type));
  if (!categories.size) categories.add("Rental");
  return [...new Set([...Array.from(categories, (category) => OWNER_POLICY_BY_CATEGORY[category]), "privacy_policy" as const])];
}

export default function OwnerPortalPage() {
  const [owner, setOwner] = useState<OwnerAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [supabaseAccount, setSupabaseAccount] = useState<CustomerOrOwnerSession | null>(null);
  const [supabaseOwnerActive, setSupabaseOwnerActive] = useState(false);
  const [supabaseOwnerChecking, setSupabaseOwnerChecking] = useState(false);
  const [legacyOwnerSessionMissing, setLegacyOwnerSessionMissing] = useState(false);
  const [authError, setAuthError] = useState("");
  const [sessionAttempt, setSessionAttempt] = useState(0);
  const [ownerCategory, setOwnerCategory] = useState<ListingType>("Rental");
  const [policyChecks, setPolicyChecks] = useState<Partial<Record<PolicyType, boolean>>>({});
  const [activationSubmitting, setActivationSubmitting] = useState(false);
  const [activationSuccess, setActivationSuccess] = useState(false);
  const [pendingPolicies, setPendingPolicies] = useState<PolicyType[]>([]);
  const [policyError, setPolicyError] = useState("");
  const [listings, setListings] = useState<PropertyListing[]>([]);
  const [brokerageAcknowledgements, setBrokerageAcknowledgements] = useState<BrokerageAcknowledgement[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [details, setDetails] = useState<PropertyDetails>(emptyDetails);
  const [listingError, setListingError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const account = await getCustomerOrOwnerSession();
        if (!active) return;
        setSupabaseAccount(account);
        if (account?.role === "owner" || !account) {
          const currentOwner = getOwnerSession();
          setOwner(currentOwner);
          if (currentOwner) {
            setLegacyOwnerSessionMissing(false);
            setPendingPolicies(getMissingPolicies(currentOwner.id, "owner", policiesForOwner(currentOwner)).map((document) => document.type));
          } else if (account?.role === "owner") {
            setLegacyOwnerSessionMissing(true);
          }
        }
      } catch (error) {
        console.error("[owner-auth] Session lookup failed", error instanceof Error ? error.message : "unknown error");
        if (active) {
          setAuthError(error instanceof Error ? error.message : "Owner information could not be loaded from this browser.");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [sessionAttempt]);

  useEffect(() => {
    if (!supabaseAccount || supabaseAccount.role === "owner") return;
    let active = true;
    const timer = window.setTimeout(() => {
      if (active) setSupabaseOwnerChecking(true);
      void hasSupabaseOwnerCapability()
        .then((hasCapability) => {
          if (active) setSupabaseOwnerActive(hasCapability);
        })
        .catch(() => {
          if (active) setSupabaseOwnerActive(false);
        })
        .finally(() => {
          if (active) setSupabaseOwnerChecking(false);
        });
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [supabaseAccount, activationSuccess]);

  useEffect(() => {
    if (!owner) return;
    const currentOwner = owner;
    const ownerId = owner.id;

    function refresh() {
      try {
        setListings(getOwnerListings(ownerId));
        setBrokerageAcknowledgements(getUserBrokerageAcknowledgements(ownerId, "owner"));
        setPendingPolicies(getMissingPolicies(ownerId, "owner", policiesForOwner(currentOwner)).map((document) => document.type));
      } catch {
        setListingError("Your listings could not be loaded.");
      }
    }
    refresh();
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, [owner]);

  function acceptUpdatedPolicies(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!owner || pendingPolicies.some((type) => policyChecks[type] !== true)) {
      setPolicyError("Accept every current policy version to continue.");
      return;
    }

    try {
      recordPolicyAcceptances(owner.id, "owner", pendingPolicies);
      setPendingPolicies([]);
      setPolicyChecks({});
      setPolicyError("");
    } catch {
      setPolicyError("Policy acceptance could not be recorded.");
    }
  }

  async function submitOwnerActivation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError("");
    if (policyChecks[OWNER_POLICY_BY_CATEGORY[ownerCategory]] !== true || policyChecks.privacy_policy !== true) {
      setAuthError("Accept the selected Owner policy and Privacy Policy to continue.");
      return;
    }

    setActivationSubmitting(true);
    try {
      const result = await activateOwnerAccount({
        registrationCategory: ownerCategory,
        ownerPolicyAccepted: policyChecks[OWNER_POLICY_BY_CATEGORY[ownerCategory]] === true,
        privacyPolicyAccepted: policyChecks.privacy_policy === true,
      });
      if (!result.ok) {
        setAuthError(result.message);
        return;
      }
      setActivationSuccess(true);
      setSupabaseOwnerActive(true);
    } catch {
      setAuthError("Owner activation could not be completed. Please try again.");
    } finally {
      setActivationSubmitting(false);
    }
  }

  function openNewListing() {
    setEditingId(null);
    setDetails(emptyDetails);
    setListingError("");
    setNotice("");
    setFormOpen(true);
  }

  function openEditListing(listing: PropertyListing) {
    setEditingId(listing.id);
    setDetails({
      title: listing.title,
      type: listing.type,
      locality: listing.locality,
      price: listing.price,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      furnishing: listing.furnishing,
      description: listing.description,
      photos: listing.photos,
      address: listing.address ?? "",
      landmark: listing.landmark ?? "",
      availableFrom: listing.availableFrom ?? "",
      categoryDetails: listing.categoryDetails ?? createDefaultCategoryDetails(listing.type, listing.price, listing.bedrooms),
    });
    setListingError("");
    setNotice("");
    setFormOpen(true);
  }

  function submitListing(detailsToSave: PropertyDetails) {
    if (!owner) return;
    setListingError("");
    setNotice("");
    try {
      if (detailsToSave.price <= 0) throw new Error("Enter a budget greater than zero.");
      if (detailsToSave.photos.length === 0) throw new Error("Upload at least one property photo.");
      if (editingId) updateOwnerListing(owner.id, editingId, detailsToSave);
      else createListing(owner, detailsToSave);
      setListings(getOwnerListings(owner.id));
      setFormOpen(false);
      setNotice(editingId ? "Listing updated and sent for approval." : "Listing submitted for approval.");
    } catch (error) {
      setListingError(error instanceof Error ? error.message : "The listing could not be saved.");
    }
  }

  function signOut() {
    logoutOwner();
    setOwner(null);
    setListings([]);
    setFormOpen(false);
    setNotice("");
    setPendingPolicies([]);
    setPolicyChecks({});
  }

  function removeListing(listing: PropertyListing) {
    if (!owner || !window.confirm(`Delete “${listing.title}” from your listings? This cannot be undone.`)) return;
    try {
      deleteOwnerListing(owner.id, listing.id);
      setListings(getOwnerListings(owner.id));
      setNotice("Listing deleted.");
      if (editingId === listing.id) {
        setEditingId(null);
        setFormOpen(false);
      }
    } catch (error) {
      setListingError(error instanceof Error ? error.message : "Listing could not be deleted.");
    }
  }

  function acknowledgeBrokerageRecord(acknowledgementId: string) {
    if (!owner) return;
    try {
      acknowledgeBrokerage(owner.id, "owner", acknowledgementId);
      setBrokerageAcknowledgements(getUserBrokerageAcknowledgements(owner.id, "owner"));
      setListingError("");
    } catch {
      setListingError("Brokerage acknowledgement could not be recorded.");
    }
  }

  if (loading) return <main className="min-h-screen bg-slate-50 p-8 text-slate-600">Checking your account...</main>;

  if (supabaseAccount?.role === "owner" && legacyOwnerSessionMissing) {
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-12 text-slate-900">
        <div className="mx-auto max-w-lg rounded-xl border border-sky-200 bg-white p-4 shadow-sm sm:p-8">
          <p className="text-xs font-bold tracking-[0.18em] text-sky-700">LEGACY OWNER ACCOUNT</p>
          <h1 className="mt-2 text-2xl font-bold text-[#A71930]">Your existing Owner profile was recognized</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Your legacy Owner dashboard uses its existing local browser session. No LocalStorage records were migrated or changed, and this account was not redirected into the new Customer/Owner dashboard.
          </p>
          <Link href="/account" className="mt-6 block w-full rounded-lg bg-[#A71930] px-5 py-3 text-center font-semibold text-white hover:bg-slate-700">Open My Account</Link>
        </div>
      </main>
    );
  }

  if (supabaseAccount && supabaseAccount.role !== "owner") {
    if (supabaseOwnerActive) return <SupabaseOwnerDashboard session={supabaseAccount} />;
    if (supabaseOwnerChecking) return <main className="min-h-screen bg-slate-50 p-8 text-slate-600">Checking Owner access...</main>;
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <header className="bg-[#A71930] text-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:flex-nowrap sm:gap-4 sm:px-6 sm:py-5">
            <Link href="/" className="min-w-0">
              <span className="block text-xl font-bold tracking-widest">NAREN <span className="text-white/80">REALTY</span></span>
              <span className="mt-1 block text-xs tracking-widest text-slate-300">OWNER PORTAL</span>
            </Link>
            <Link href="/account" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/30 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-white/10">My Account</Link>
          </div>
        </header>
        <section className="mx-auto max-w-lg px-4 py-8 [overflow-wrap:anywhere] sm:px-6 sm:py-12">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-8">
            <p className="text-xs font-bold tracking-[0.18em] text-[#A71930]">OWNER SERVICES</p>
            <h1 className="mt-2 text-3xl font-bold text-[#A71930]">List your property</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              You are signed in as {supabaseAccount.email}. Owner activation will use this same Supabase account; you will not need a second login.
            </p>
            {!activationSuccess && <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Complete the activation details below. Your Customer role will be preserved.</p>}
            {activationSuccess && <p role="status" className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Owner capability activation was accepted. Loading your Owner dashboard...</p>}
            {!activationSuccess && <form onSubmit={submitOwnerActivation} className="mt-6 space-y-4">
              <label className="block text-sm font-semibold">Primary Listing Category<select value={ownerCategory} onChange={(event) => { setOwnerCategory(event.target.value as ListingType); setPolicyChecks({}); }} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base font-normal"><option value="Rental">Flat Rental</option><option value="Resale">Flat Resale</option><option value="PG">PG / Hostel</option><option value="Airbnb">Airbnb / Short Stay</option></select></label>
              <PolicyConsentFields policyTypes={[OWNER_POLICY_BY_CATEGORY[ownerCategory], "privacy_policy"]} values={policyChecks} onChange={(type, accepted) => setPolicyChecks((current) => ({ ...current, [type]: accepted }))} />
              {authError && <p role="alert" className="text-sm text-rose-700">{authError}</p>}
              <button type="submit" disabled={activationSubmitting} className="w-full rounded-lg bg-[#A71930] px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{activationSubmitting ? "Activating Owner access..." : "Activate Owner access"}</button>
            </form>}
          </div>
        </section>
      </main>
    );
  }

  if (authError) {
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-12 text-slate-900">
        <div className="mx-auto max-w-lg rounded-xl border border-rose-200 bg-white p-4 shadow-sm sm:p-8">
          <p className="text-xs font-bold tracking-[0.18em] text-rose-700">ACCOUNT CHECK</p>
          <h1 className="mt-2 text-2xl font-bold text-[#A71930]">We could not verify your account</h1>
          <p role="alert" className="mt-3 text-sm leading-6 text-rose-700">{authError}</p>
          <button type="button" onClick={() => { setAuthError(""); setLoading(true); setSessionAttempt((attempt) => attempt + 1); }} className="mt-6 w-full rounded-lg bg-[#A71930] px-5 py-3 font-semibold text-white hover:bg-slate-700">Retry</button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-[#A71930] text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:flex-nowrap sm:gap-4 sm:px-6 sm:py-5">
          <Link href="/" className="min-w-0">
            <span className="block text-xl font-bold tracking-widest">NAREN <span className="text-white/80">REALTY</span></span>
            <span className="mt-1 block text-xs tracking-widest text-slate-300">OWNER PORTAL</span>
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/properties" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/30 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-white/10">Browse Homes</Link>
            {owner && <button onClick={signOut} className="min-h-11 rounded-lg bg-white px-3 py-2 text-sm font-bold text-[#A71930] hover:bg-slate-100">Sign Out</button>}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 [overflow-wrap:anywhere] sm:px-6 sm:py-12">
        {authError && !supabaseAccount && <p role="alert" className="mx-auto mb-5 max-w-lg text-sm text-rose-700">{authError}</p>}
        {!owner ? (
          <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-8">
            <p className="text-xs font-bold tracking-[0.18em] text-[#A71930]">OWNER SERVICES</p>
            <h1 className="mt-2 text-3xl font-bold text-[#A71930]">List your property</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">Sign in through your existing Customer Account to activate Owner access without creating a second login.</p>
            <Link href="/account" className="mt-6 block w-full rounded-lg bg-[#A71930] px-5 py-3 text-center font-semibold text-white hover:bg-slate-700">Go to Customer Account</Link>
          </div>
        ) : pendingPolicies.length > 0 ? <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-8"><p className="text-xs font-bold tracking-[0.18em] text-[#A71930]">POLICY UPDATE</p><h1 className="mt-2 text-2xl font-bold text-[#A71930]">Review updated policies</h1><p className="mt-2 text-sm leading-6 text-slate-600">Your account needs acceptance of the current versions before you continue to your Owner Dashboard.</p><form onSubmit={acceptUpdatedPolicies} className="mt-6 space-y-4"><PolicyConsentFields policyTypes={pendingPolicies} values={policyChecks} onChange={(type, accepted) => setPolicyChecks((current) => ({ ...current, [type]: accepted }))} />{policyError && <p role="alert" className="text-sm text-rose-700">{policyError}</p>}<button className="w-full rounded-lg bg-[#A71930] px-5 py-3 font-semibold text-white">Accept Current Policies</button></form></div> : (
          <>
            <div className="flex flex-col gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div><p className="text-xs font-bold tracking-[0.18em] text-[#A71930]">OWNER DASHBOARD</p><h1 className="mt-2 text-3xl font-bold text-[#A71930]">Welcome, {owner.fullName}</h1><p className="mt-2 text-sm text-slate-600">Your listings and their approval status.</p></div>
              <button onClick={openNewListing} className="rounded-lg bg-white px-5 py-3 text-sm font-bold text-[#A71930] ring-1 ring-[#A71930] hover:bg-slate-100">+ Add Property</button>
            </div>
            {notice && <p role="status" className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{notice}</p>}

            {listingError && <p role="alert" className="mt-5 text-sm text-rose-700">{listingError}</p>}
            {formOpen && <div className="[&_button]:min-h-11 [&_input:not([type=checkbox]):not([type=radio])]:min-w-0 [&_input:not([type=checkbox]):not([type=radio])]:max-w-full [&_input:not([type=checkbox]):not([type=radio])]:text-base [&_select]:min-w-0 [&_select]:max-w-full [&_select]:text-base [&_textarea]:min-w-0 [&_textarea]:text-base [&_fieldset]:min-w-0"><OwnerPropertyForm
              key={editingId ?? "new-listing"}
              initialDetails={details}
              onSubmit={submitListing}
              onCancel={() => setFormOpen(false)}
              submitLabel={editingId ? "Save changes" : "Submit for approval"}
            /></div>}

            <div className="mt-6 space-y-4">
              {listings.length === 0 ? <div className="border-y border-slate-200 py-14 text-center"><h2 className="font-bold text-[#A71930]">No listings yet</h2><p className="mt-2 text-sm text-slate-600">Add a flat rental or resale property to get started.</p></div> : listings.map((listing) => <article key={listing.id} className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:p-5">
                {listing.photos[0] && <img src={listing.photos[0]} alt="" className="aspect-[4/3] w-full rounded-md object-cover sm:w-40" />}
                <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-[#A71930]">{listing.title}</h2><span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${listing.status === "Approved" ? "bg-emerald-100 text-emerald-800" : listing.status === "Rejected" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-900"}`}>{listing.status}</span></div><p className="mt-1 text-sm text-slate-600">{listing.type === "Rental" ? "Flat Rental" : listing.type === "Resale" ? "Flat Resale" : listing.type === "PG" ? "PG / Hostel" : "Airbnb / Short Stay"} · {listing.locality}</p><p className="mt-1 font-semibold text-slate-800">₹{listing.price.toLocaleString("en-IN")}{listing.type === "Rental" ? " / month" : listing.type === "Airbnb" ? " / night" : listing.type === "PG" ? " / person / month" : ""}</p><p className="mt-2 text-xs text-slate-500">Updated {new Date(listing.updatedAt).toLocaleDateString("en-IN")}</p><PropertyInformation listing={listing} />{brokerageAcknowledgements.filter((acknowledgement) => acknowledgement.listingId === listing.id && acknowledgement.userRole === "owner").map((acknowledgement) => <div key={acknowledgement.id} className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-amber-900">Brokerage Acknowledgement · {acknowledgement.party}</p><p className="mt-2 text-sm leading-6 text-slate-700">{acknowledgement.statement}</p><p className="mt-2 text-xs text-slate-600">Policy version {acknowledgement.policyVersion} · {acknowledgement.acknowledgedAt ? `Acknowledged ${new Date(acknowledgement.acknowledgedAt).toLocaleString("en-IN")}` : "Pending acknowledgement"}</p>{!acknowledgement.acknowledgedAt && <button onClick={() => acknowledgeBrokerageRecord(acknowledgement.id)} className="mt-3 min-h-11 rounded-md bg-[#A71930] px-4 py-2 text-sm font-semibold text-white">Acknowledge</button>}</div>)}</div>
                <div className="flex flex-wrap items-center gap-2 self-start"><button onClick={() => openEditListing(listing)} className="min-h-11 rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-[#A71930] hover:border-[#A71930]">Edit</button><button onClick={() => removeListing(listing)} className="min-h-11 rounded-md border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50">Delete</button></div>
              </article>)}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
