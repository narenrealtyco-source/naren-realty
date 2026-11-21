import { indiaCalendarDate } from "./property-marketing";

export const visitSlots = ["10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00"] as const;
export const visitStatuses = ["pending", "confirmed", "rescheduled", "completed", "cancelled"] as const;
export type VisitStatus = (typeof visitStatuses)[number];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validVisitId(value: unknown): value is string {
  return typeof value === "string" && uuid.test(value);
}

export function validateVisitTime(date: unknown, time: unknown, now = new Date()) {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Choose a valid visit date.");
  const parsed = Date.parse(`${date}T00:00:00Z`);
  const today = Date.parse(`${indiaCalendarDate(now)}T00:00:00Z`);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== date || parsed < today || parsed > today + 90 * 86400000) throw new Error("Choose a date within the next 90 days.");
  if (typeof time !== "string" || !visitSlots.some((slot) => slot === time)) throw new Error("Choose a valid preferred time.");
  if (Date.parse(`${date}T${time}:00+05:30`) <= now.getTime()) throw new Error("Choose a future time.");
  return { date, time };
}

export function validateVisitInput(form: FormData) {
  const propertyId = form.get("property_id");
  if (!validVisitId(propertyId)) throw new Error("Invalid property.");
  const name = form.get("name");
  const mobile = form.get("mobile");
  const message = form.get("message");
  if (typeof name !== "string" || !name.trim() || Array.from(name.trim()).length > 120 || name.includes("\0")) throw new Error("Enter a name of up to 120 characters.");
  if (typeof mobile !== "string") throw new Error("Enter a valid Indian mobile number.");
  const normalized = mobile.trim().replace(/[\s()-]/g, "");
  if (!/^(?:\+91)?[6-9]\d{9}$/.test(normalized)) throw new Error("Enter a valid Indian mobile number.");
  if (typeof message !== "string" || Array.from(message).length > 1000 || message.includes("\0")) throw new Error("Message must be at most 1000 characters.");
  return { propertyId, name: name.trim(), mobile: normalized, message: message.trim(), ...validateVisitTime(form.get("date"), form.get("time")) };
}
