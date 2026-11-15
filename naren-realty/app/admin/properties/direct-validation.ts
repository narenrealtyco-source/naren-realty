import { validatePropertySubmission, validateSubmissionPhotoCount } from "../../lib/property-submission-validation";
import { validateSubmissionDetails, type SubmissionDetails } from "../../lib/submission-details";
import { indiaCalendarDate } from "../../lib/property-marketing";

export type DirectDetails = { address: string; description: string; carpetArea: number; details: SubmissionDetails; availabilityConfirmation?: "immediate" | "date" };

export function validateDirectProperty(form: FormData) {
  const input = validatePropertySubmission({
    title: form.get("title"), category: form.get("category"), locality: form.get("locality"),
    address: form.get("address"), description: form.get("description"),
    price: Number(form.get("price")), area: Number(form.get("area")),
  });
  const raw = form.get("details");
  if (typeof raw !== "string" || new TextEncoder().encode(raw).length > 30000) throw new Error("Additional details are invalid.");
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error("Additional details are invalid."); }
  const details = validateSubmissionDetails(parsed);
  const confirmation = form.get("availability_confirmation");
  if (confirmation !== null && confirmation !== "" && confirmation !== "immediate" && confirmation !== "date") throw new Error("Invalid availability confirmation.");
  if (confirmation === "date" && !details.values.common_available_from) throw new Error("Enter an available-from date in the additional details.");
  if (confirmation === "immediate" && details.values.common_available_from && details.values.common_available_from > indiaCalendarDate()) throw new Error("Immediate availability cannot have a future available-from date.");
  const availabilityConfirmation = confirmation === "immediate" || confirmation === "date" ? confirmation : undefined;
  return { input, publicListing: { address: input.address, description: input.description, carpetArea: input.area, details, availabilityConfirmation } satisfies DirectDetails };
}

export function validateDirectPhotoCount(existing: number, added: number) {
  validateSubmissionPhotoCount(existing + added);
}
