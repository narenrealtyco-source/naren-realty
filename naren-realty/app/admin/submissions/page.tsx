import Link from "next/link";
import { connection } from "next/server";
import { propertySubmissionsEnabled } from "../../lib/property-submission-config";
import { requireAdmin } from "../../lib/supabase-server";
import ReviewForms from "./ReviewForms";
import SavedDetails from "../../list-property/SavedDetails";
import CleanupButton from "./CleanupButton";
import DeleteRejectedButton from "./DeleteRejectedButton";
import OwnerDetailsView from "../../list-property/OwnerDetailsView";

export const instant = false;

type Submission = {
  id: string;
  user_id: string;
  title: string;
  category: string;
  locality: string;
  address: string;
  price: number;
  area: number;
  description: string;
  details: unknown;
  owner_details: unknown;
  photo_paths: string[];
  video_path: string | null;
  status: string;
  rejection_feedback: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  published_property_id: string | null;
  created_at: string;
};

export default async function AdminSubmissionsPage() {
  await connection();

  let supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"];
  try {
    ({ supabase } = await requireAdmin());
  } catch (error) {
    console.error("[submission-review] Queue authorization failed", { errorType: error instanceof Error ? error.name : typeof error });
    return <main className="mx-auto max-w-5xl p-4 sm:p-8"><p role="alert">Admin authentication and authorization are required.</p><Link className="mt-4 inline-block underline" href="/admin/login">Admin login</Link></main>;
  }
  if (!propertySubmissionsEnabled()) {
    return <main className="mx-auto max-w-5xl p-4 sm:p-8"><h1 className="text-2xl font-bold">Customer submissions</h1><p role="status" className="mt-4">Review is awaiting private database and Storage setup.</p><Link className="mt-4 inline-block underline" href="/admin/properties">Property management</Link></main>;
  }

  const submissions: Submission[] = [];
  let loadFailed = false;
  for (;;) {
    const { data, error, count } = await supabase.from("property_submissions")
      .select("id,user_id,title,category,locality,address,price,area,description,details,owner_details,photo_paths,video_path,status,rejection_feedback,reviewed_by,reviewed_at,published_property_id,created_at", { count: "exact" })
      .order("created_at", { ascending: false }).order("id", { ascending: false })
      .range(submissions.length, submissions.length + 99);
    if (error || count === null || (!data?.length && submissions.length < count)) {
      console.error("[submission-review] Queue lookup failed", { code: error?.code, missingCount: count === null });
      loadFailed = true;
      break;
    }
    submissions.push(...(data ?? []));
    if (submissions.length >= count) break;
  }

  return <main className="min-h-screen bg-slate-50 p-5 text-slate-900">
    <div className="mx-auto max-w-5xl">
      <Link href="/admin/properties" className="text-sm underline">Property management</Link>
      <h1 className="mt-4 text-3xl font-bold text-[#10243A]">Customer submissions</h1>
      <p className="mt-2 text-sm text-slate-600">Approving a submission publishes its property details and photos.</p>
      <CleanupButton />
      {loadFailed ? <p role="alert" className="mt-5 text-rose-700">Submissions could not be loaded. Check private database setup and Admin permissions.</p> :
        !submissions.length ? <p className="mt-5">No submissions found.</p> :
          <div className="mt-5 space-y-5">{submissions.map((submission) => <article key={submission.id} className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
            <h2 className="break-words text-xl font-bold">{submission.title}</h2>
            <p className="mt-1 text-sm">{submission.category} · {submission.locality}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm">Address: {submission.address}</p>
            <p className="mt-2 text-sm">Price: ₹{Number(submission.price).toLocaleString("en-IN")} · Area: {submission.area} sq. ft.</p>
            <p className="mt-2 whitespace-pre-wrap text-sm">{submission.description}</p>
            <SavedDetails value={submission.details} />
            <OwnerDetailsView value={submission.owner_details} />
            <p className="mt-2 text-sm font-semibold">Status: {submission.status}{submission.status === "approved" && !submission.published_property_id ? " — not published" : ""}</p>
            {submission.rejection_feedback && <p className="mt-2 whitespace-pre-wrap text-sm">Rejection reason: {submission.rejection_feedback}</p>}
            <p className="mt-2 break-all text-xs text-slate-500">Submission: {submission.id} · Customer: {submission.user_id} · Created: {submission.created_at}</p>
            {submission.reviewed_at && <p className="mt-1 break-all text-xs text-slate-500">Reviewed: {submission.reviewed_at} · Reviewer: {submission.reviewed_by}</p>}
            {Array.isArray(submission.photo_paths) && submission.photo_paths.length > 0 && <div className="mt-4 flex flex-wrap gap-3">{submission.photo_paths.map((_: unknown, index: number) => <a key={index} href={`/admin/submissions/${submission.id}/photos/${index}`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold underline">View private photo {index + 1}</a>)}</div>}
            {submission.video_path && <a href={`/admin/submissions/${submission.id}/video`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-semibold underline">Preview submitted property video</a>}
            {submission.status === "pending" && <ReviewForms id={submission.id} />}
            {(submission.status === "rejected" || submission.status === "deleting") && !submission.published_property_id
              && <DeleteRejectedButton id={submission.id} retry={submission.status === "deleting"} />}
          </article>)}</div>}
    </div>
  </main>;
}
