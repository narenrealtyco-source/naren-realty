import { additionalFields, commonFields, sharingFields } from "./additional-fields";
import { SUBMISSION_CATEGORIES } from "../lib/property-submission-validation";
import { validateSubmissionDetails } from "../lib/submission-details";

export default function SavedDetails({ value }: { value: unknown }) {
  let details;
  try {
    details = validateSubmissionDetails(value);
  } catch {
    return <p role="alert" className="mt-3 text-rose-700">Saved details could not be read. Contact an administrator before reviewing or editing this submission.</p>;
  }
  const labels = new Map<string, string>();
  for (const field of commonFields) labels.set(`common_${field.key}`, field.label);
  for (const category of SUBMISSION_CATEGORIES) {
    for (const field of additionalFields(category)) labels.set(`${category}_${field.key}`, `${category}: ${field.label}`);
  }
  for (const field of sharingFields) labels.set(`PG_${field.key}`, field.label);
  return <section className="mt-3 text-sm">
    <h3 className="font-semibold">Additional details</h3>
    <dl className="mt-2 space-y-1">{Object.entries(details.values).map(([key, text]) => <div key={key}><dt className="inline font-semibold">{labels.get(key)}: </dt><dd className="inline whitespace-pre-wrap">{text}</dd></div>)}</dl>
    {Object.entries(details.amenities).map(([category, items]) => items.length > 0 && <p key={category} className="mt-2"><strong>{category} amenities:</strong> {items.join(", ")}</p>)}
    {details.facilities.length > 0 && <p className="mt-2"><strong>PG facilities:</strong> {details.facilities.join(", ")}</p>}
  </section>;
}
