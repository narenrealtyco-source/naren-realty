import Link from "next/link";
import { connection } from "next/server";
import { createSupabaseServerClient } from "../lib/supabase-server";
import { propertySubmissionsEnabled, propertySubmissionUploadsReady } from "../lib/property-submission-config";
import SubmissionForm from "./SubmissionForm";
import ResubmitForm from "./ResubmitForm";
import { validateSubmissionDetails, type SubmissionDetails } from "../lib/submission-details";
import { additionalFields, commonFields, sharingFields } from "./additional-fields";
import OwnerDetailsView from "./OwnerDetailsView";

export const instant = false;

type Submission = {
  id: string;
  title: string;
  category: string;
  locality: string;
  address: string;
  price: number;
  area: number;
  description: string;
  status: string;
  rejection_feedback: string | null;
  details: unknown;
  owner_details: unknown;
};

function logListingError(error: { code?: string; message?: string; details?: string | null }) {
  const sensitive = /Bearer\s+\S+|https?:\/\/\S+|\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b|\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b|\+?\d[\d\s()-]{8,}\d/gi;
  console.error("[property-submission] Listing lookup failed", {
    code: error.code || "unknown",
    message: error.message?.replace(sensitive, "[redacted]").slice(0, 300) || "Unavailable",
    details: error.details?.replace(sensitive, "[redacted]").slice(0, 300) || "Unavailable",
  });
}

function readableDetails(value: unknown): SubmissionDetails | null {
  if (value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0) {
    return { version: 1, values: {}, amenities: {}, facilities: [] };
  }
  try { return validateSubmissionDetails(value); } catch { return null; }
}

function DetailsView({ details, submission }: { details: SubmissionDetails; submission: Submission }) {
  const labels = new Map<string, string>();
  for (const field of commonFields) labels.set(`common_${field.key}`, field.label);
  for (const category of ["Rental", "Resale", "PG", "Airbnb"]) {
    for (const field of additionalFields(category)) labels.set(`${category}_${field.key}`, `${category}: ${field.label}`);
  }
  for (const field of sharingFields) labels.set(`PG_${field.key}`, field.label);
  return <details className="mt-3"><summary className="min-h-11 cursor-pointer py-3 font-semibold">View saved details</summary>
    <dl className="mt-2 space-y-1 text-sm">
      <div><dt className="inline font-semibold">Address: </dt><dd className="inline whitespace-pre-wrap">{submission.address}</dd></div>
      <div><dt className="inline font-semibold">Price: </dt><dd className="inline">{submission.price} INR</dd></div>
      <div><dt className="inline font-semibold">Carpet area: </dt><dd className="inline">{submission.area} sq. ft.</dd></div>
      <div><dt className="inline font-semibold">Description: </dt><dd className="inline whitespace-pre-wrap">{submission.description}</dd></div>
    </dl>
    <dl className="mt-2 space-y-1 text-sm">{Object.entries(details.values).map(([key, value]) => <div key={key}><dt className="inline font-semibold">{labels.get(key)}: </dt><dd className="inline whitespace-pre-wrap">{value}</dd></div>)}</dl>
    {Object.entries(details.amenities).map(([category, items]) => items.length > 0 && <p key={category} className="mt-2 text-sm"><strong>{category} amenities:</strong> {items.join(", ")}</p>)}
    {details.facilities.length > 0 && <p className="mt-2 text-sm"><strong>PG facilities:</strong> {details.facilities.join(", ")}</p>}
  </details>;
}
export default async function ListPropertyPage() {
  await connection();
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError && authError.name !== "AuthSessionMissingError") {
    console.error("[property-submission] Authentication check failed", { name: authError.name });
    return <main className="mx-auto max-w-3xl bg-white p-4 text-slate-950 [overflow-wrap:anywhere] sm:p-8"><h1 className="text-2xl font-bold">List Your Property</h1><p role="alert" className="mt-3 text-rose-700">Your session could not be verified. Please try again or sign in again.</p><Link className="mt-4 inline-flex min-h-11 items-center underline" href="/account">Customer login or signup</Link></main>;
  }
  if (authError || !user) {
    return <main className="mx-auto max-w-3xl bg-white p-4 text-slate-950 [overflow-wrap:anywhere] sm:p-8"><h1 className="text-2xl font-bold">Sign in to list a property</h1><p className="mt-3">Sign in or create a Customer account to submit a property.</p><Link className="mt-4 inline-flex min-h-11 items-center underline" href="/account">Customer login or signup</Link></main>;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profileError || !profile) {
    console.error("[property-submission] Profile lookup failed", { code: profileError?.code });
    return <main className="mx-auto max-w-3xl bg-white p-4 text-slate-950 [overflow-wrap:anywhere] sm:p-8"><p role="alert">Your Customer profile could not be verified. Please try again.</p><Link href="/account" className="mt-4 inline-flex min-h-11 items-center underline">My account</Link></main>;
  }
  if (profile.role !== "customer") {
    return <main className="mx-auto max-w-3xl bg-white p-4 text-slate-950 [overflow-wrap:anywhere] sm:p-8"><p role="alert">A Customer account is required to list a property here.</p><Link href="/account" className="mt-4 inline-flex min-h-11 items-center underline">Customer login or signup</Link></main>;
  }

  const { data: ownerCapability, error: ownerCapabilityError } = await supabase
    .from("profile_capabilities")
    .select("capability")
    .eq("user_id", user.id)
    .eq("capability", "owner")
    .maybeSingle();

  const initialOwnerDetails = {
    fullName: typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "",
    mobile: typeof user.user_metadata?.mobile_number === "string" ? user.user_metadata.mobile_number : "",
    email: user.email ?? "",
    relationship: "Owner" as const,
    authorizationDetails: "",
  };

  if (!propertySubmissionsEnabled()) {
    return <main className="mx-auto max-w-3xl bg-white p-4 text-slate-950 [overflow-wrap:anywhere] sm:p-8"><h1 className="text-3xl font-bold text-[#A71930]">List Your Property</h1><p role="status" className="mt-4 text-amber-800">Property submissions are awaiting private database setup. Nothing will be saved.</p><div className="mt-6"><SubmissionForm available={false} initialOwnerDetails={initialOwnerDetails} /></div><Link href="/account" className="mt-4 inline-flex min-h-11 items-center underline">My account</Link></main>;
  }

  const result = await supabase
    .from("property_submissions")
    .select("id,title,category,locality,address,price,area,description,status,rejection_feedback,details,owner_details")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  let error = result.error;
  let submissions: Submission[] = result.data ?? [];
  const missingColumn = error?.message?.match(/^\s*(?:error:\s*)?column\s+(\S+)/i)?.[1].replace(/"/g, "");
  const legacySchema = error?.code === "42703" &&
    ["owner_details", "property_submissions.owner_details", "public.property_submissions.owner_details"].includes(missingColumn ?? "");
  if (error) logListingError(error);
  if (legacySchema) {
    const legacy = await supabase.from("property_submissions")
      .select("id,title,category,locality,address,price,area,description,status,rejection_feedback,details")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    error = legacy.error;
    if (error) logListingError(error);
    submissions = legacy.data?.map((submission) => ({ ...submission, owner_details: null })) ?? [];
  }
  const uploadsReady = !legacySchema && await propertySubmissionUploadsReady();
  const setupMissing = ["42P01", "PGRST205", "42703", "PGRST204"].includes(error?.code ?? "");

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-[#A71930] px-4 py-4 text-white sm:px-6"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3"><Link href="/" className="inline-flex min-h-11 items-center font-bold tracking-widest">NAREN <span className="ml-1 text-amber-400">REALTY</span></Link><Link href="/account" className="inline-flex min-h-11 items-center rounded-lg border border-white/30 px-3 text-sm font-semibold">My account</Link></div></header>
      <section className="mx-auto max-w-6xl px-4 py-8 [overflow-wrap:anywhere] sm:px-6">
        <h1 className="text-3xl font-bold text-[#A71930]">List Your Property</h1>
        <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-2">
          {ownerCapabilityError ? (
            <section role="alert" className="min-w-0 rounded-xl border border-rose-200 bg-white p-4 sm:p-6">
              <h2 className="text-xl font-bold text-[#A71930]">Owner access could not be verified</h2>
              <p className="mt-2 text-sm text-rose-700">For your security, property submission is paused until Owner access can be checked. Please refresh or try again later.</p>
            </section>
          ) : !ownerCapability ? (
            <section className="min-w-0 rounded-xl border border-amber-200 bg-white p-4 sm:p-6">
              <h2 className="text-xl font-bold text-[#A71930]">Activate Owner access first</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Use your existing Customer login to activate Owner access. You will review the applicable Owner Terms and Privacy Policy once; your Customer account and existing requirements will remain unchanged.</p>
              <Link href="/owner" className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-[#A71930] px-5 py-3 text-sm font-semibold text-white">Review policies and activate Owner access</Link>
            </section>
          ) : (
            <SubmissionForm available={!error && uploadsReady} draftsAvailable={!error && !legacySchema} initialOwnerDetails={initialOwnerDetails} unavailableMessage={legacySchema ? "Submissions are unavailable until the private owner details database setup is complete. Nothing will be saved." : error ? (setupMissing ? undefined : "Your submissions could not be loaded. Please try again; nothing will be saved.") : "New submissions are unavailable until private photo handling is ready. Nothing will be saved."} />
          )}
          <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
            <h2 className="text-xl font-bold text-[#A71930]">My submissions</h2>
            {legacySchema && !error && <p role="status" className="mt-4 text-sm text-amber-800">Existing submissions are available, but creating or editing submissions requires the private owner details database setup.</p>}
            {error ? <p role="alert" className="mt-4 text-sm text-rose-700">{setupMissing ? "Submissions are awaiting database setup." : "Your submissions could not be loaded. Please try again."}</p> : submissions.length === 0 ? <p className="mt-4 text-sm text-slate-600">You have not submitted any properties yet.</p> : <ul className="mt-4 space-y-3">{submissions.map((submission) => {
              const details = readableDetails(submission.details);
              return <li key={submission.id} className="rounded-lg border border-slate-200 p-4"><h3 className="font-bold">{submission.title}</h3><p className="text-sm text-slate-600">{submission.category} · {submission.locality}</p><p className="mt-2 text-sm font-semibold">Status: {submission.status === "pending" ? "Pending" : submission.status === "approved" ? "Approved" : submission.status === "rejected" ? "Rejected" : "Unknown"}</p>{details ? <DetailsView details={details} submission={submission} /> : <p role="alert">Saved details could not be read; editing is disabled to prevent data loss.</p>}<OwnerDetailsView value={submission.owner_details} />{submission.status === "rejected" && submission.rejection_feedback && <p className="mt-2 whitespace-pre-wrap text-sm">Admin feedback: {submission.rejection_feedback}</p>}{submission.status === "rejected" && details && ownerCapability && <ResubmitForm submission={{ ...submission, details }} available={uploadsReady} initialOwnerDetails={initialOwnerDetails} />}</li>;
            })}</ul>}
          </section>
        </div>
      </section>
    </main>
  );
}
