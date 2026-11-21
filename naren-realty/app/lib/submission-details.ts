import { additionalFields, amenitiesForCategory, commonFields, pgFacilities, sharingFields, type AdditionalField } from "../list-property/additional-fields";
import { SUBMISSION_CATEGORIES } from "./property-submission-validation";

export type SubmissionDetails = { version: 1; values: Record<string, string>; amenities: Record<string, string[]>; facilities: string[] };

export function validateSubmissionDetails(input: unknown): SubmissionDetails {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Additional details are invalid.");
  const obj = input as Record<string, unknown>;
  if (Object.keys(obj).some((key) => !["version", "values", "amenities", "facilities"].includes(key)) || obj.version !== 1 ||
      !obj.values || typeof obj.values !== "object" || Array.isArray(obj.values) ||
      !obj.amenities || typeof obj.amenities !== "object" || Array.isArray(obj.amenities) || !Array.isArray(obj.facilities)) {
    throw new Error("Additional details are invalid.");
  }
  const definitions = new Map<string, AdditionalField>();
  for (const field of commonFields) definitions.set(`common_${field.key}`, field);
  for (const category of SUBMISSION_CATEGORIES) {
    for (const field of additionalFields(category)) definitions.set(`${category}_${field.key}`, field);
  }
  for (const field of sharingFields) definitions.set(`PG_${field.key}`, field);
  const values: Record<string, string> = {};
  const encoder = new TextEncoder();
  let contentBytes = 0;
  for (const [key, value] of Object.entries(obj.values)) {
    const field = definitions.get(key);
    if (!field || typeof value !== "string" || [...value].length > 2000 || value.includes("\0")) throw new Error("An additional property field is invalid.");
    contentBytes += encoder.encode(key).length + encoder.encode(value).length;
    if (!value) continue;
    if (field.options && !field.options.includes(value)) throw new Error(`Invalid ${field.label}.`);
    if (field.type === "number") {
      if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(value)) throw new Error(`Invalid ${field.label}.`);
      const [whole, fraction = ""] = value.split(".");
      const normalized = (whole || "0").replace(/^0+/, "") || "0";
      if (normalized.length > 13 || (normalized.length === 13 && (normalized > "1000000000000" || (normalized === "1000000000000" && /[1-9]/.test(fraction))))) throw new Error(`Invalid ${field.label}.`);
    }
    if (field.type === "date" && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000-") || Number.isNaN(Date.parse(`${value}T00:00:00Z`)) || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value)) throw new Error(`Invalid ${field.label}.`);
    if (field.type === "time" && !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error(`Invalid ${field.label}.`);
    values[key] = value;
  }
  const amenities: Record<string, string[]> = {};
  for (const [category, entries] of Object.entries(obj.amenities)) {
    if (!SUBMISSION_CATEGORIES.some((item) => item === category) || !Array.isArray(entries) ||
        entries.some((item) => typeof item !== "string" || !amenitiesForCategory(category).includes(item)) ||
        new Set(entries).size !== entries.length) throw new Error("Invalid amenities.");
    amenities[category] = entries;
    contentBytes += encoder.encode(category).length;
    for (const item of entries) contentBytes += encoder.encode(item).length;
  }
  if (obj.facilities.some((item) => typeof item !== "string" || !pgFacilities.includes(item)) ||
      new Set(obj.facilities).size !== obj.facilities.length) throw new Error("Invalid PG facilities.");
  for (const item of obj.facilities) contentBytes += encoder.encode(item).length;
  if (contentBytes > 24000) throw new Error("Additional details are too large.");
  return { version: 1, values, amenities, facilities: obj.facilities };
}

export function parseSubmissionDetails(form: FormData): SubmissionDetails {
  const raw = form.get("details");
  if (typeof raw !== "string" || new TextEncoder().encode(raw).length > 30000) throw new Error("Additional details are missing or too large.");
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error("Additional details are invalid."); }
  return validateSubmissionDetails(parsed);
}
