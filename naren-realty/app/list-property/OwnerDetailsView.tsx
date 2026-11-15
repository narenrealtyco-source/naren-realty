import { validatePropertyOwnerDetails } from "../lib/property-submission-owner-validation";

export default function OwnerDetailsView({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">Owner contact details were not captured for this submission.</p>;
  }
  let owner;
  try {
    owner = validatePropertyOwnerDetails(value);
  } catch {
    return <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">Saved owner contact details could not be read safely.</p>;
  }
  return <section aria-label="Private owner contact details" className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
    <h3 className="font-bold text-[#10243A]">Private owner contact</h3>
    <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
      <div><dt className="font-semibold text-slate-600">Name</dt><dd className="break-words">{owner.fullName}</dd></div>
      <div><dt className="font-semibold text-slate-600">Mobile</dt><dd className="break-all">{owner.mobile}</dd></div>
      <div><dt className="font-semibold text-slate-600">Email</dt><dd className="break-all">{owner.email}</dd></div>
      <div><dt className="font-semibold text-slate-600">Relationship</dt><dd>{owner.relationship}</dd></div>
      {owner.authorizationDetails && <div className="sm:col-span-2"><dt className="font-semibold text-slate-600">Authorization details</dt><dd className="whitespace-pre-wrap">{owner.authorizationDetails}</dd></div>}
    </dl>
    <p className="mt-3 text-xs text-slate-500">Private information for the property owner and authorized Admin reviewers only.</p>
  </section>;
}
