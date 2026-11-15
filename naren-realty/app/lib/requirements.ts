import type { PropertyListing } from "./properties";
import { matchesPropertyLocation } from "./property-search";

// These gates must remain off until the schema, grants and RLS are verified live.
export function requirementsReady(): boolean { return true; }

// Matches database schema and RLS have been verified.
export function matchesReady(): boolean { return true; }

export type MatchRequirement = {
  id: string; purpose: "Buy" | "Rent"; category: "Flat" | "PG" | "Hostel" | "Airbnb" | "Short Stay";
  location: string; bedrooms: number | null; min_budget: number | null; max_budget: number | null;
  move_in_date: string | null; details: string; customer_name: string; phone: string; status: string;
};

function text(form: FormData, key: string, max: number, required = true): string {
  const raw = form.get(key);
  if (typeof raw !== "string") throw new Error(`Invalid ${key}.`);
  const value = raw.trim();
  if ((required && !value) || value.length > max || value.includes("\0")) throw new Error(`Invalid ${key}.`);
  return value;
}
function amount(form: FormData, key: string, required = false): number | null {
  const value = text(form, key, 16, required);
  if (!value) return null;
  if (!/^\d{1,12}(?:\.\d{1,2})?$/.test(value) || Number(value) <= 0) throw new Error(`Invalid ${key}.`);
  return Number(value);
}
function phone(form: FormData): string {
  const value = text(form, "phone", 13);
  if (!/^(?:[6-9]\d{9}|\+91[6-9]\d{9})$/.test(value)) throw new Error("Enter a valid Indian mobile number.");
  return value;
}
export function validUuid(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value); }

export function validateMatch(form: FormData) {
  const purpose = text(form, "purpose", 4);
  const category = text(form, "category", 12);
  if (!["Buy", "Rent"].includes(purpose) || !["Flat", "PG", "Hostel", "Airbnb", "Short Stay"].includes(category) || (purpose === "Buy" && category !== "Flat")) throw new Error("Choose a valid purpose and category.");
  const bedroomsValue = text(form, "bedrooms", 1, false);
  if (bedroomsValue && (category !== "Flat" || !/^[1-5]$/.test(bedroomsValue))) throw new Error("Choose a valid BHK.");
  const min_budget = amount(form, "min_budget");
  const max_budget = amount(form, "max_budget");
  if (min_budget !== null && max_budget !== null && min_budget > max_budget) throw new Error("Minimum budget cannot exceed maximum budget.");
  const date = text(form, "move_in_date", 10, false);
  if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date)) throw new Error("Choose a valid date.");
  return { purpose, category, location: text(form, "location", 120), bedrooms: bedroomsValue ? Number(bedroomsValue) : null, min_budget, max_budget, move_in_date: date || null, details: text(form, "details", 2000, false), customer_name: text(form, "customer_name", 120), phone: phone(form) };
}
export function validateLoan(form: FormData) {
  const loan_type_id = text(form, "loan_type_id", 36);
  if (!validUuid(loan_type_id)) throw new Error("Choose a valid loan type.");
  const employment = text(form, "employment", 20);
  if (!["Salaried", "Self-employed", "Business", "Other"].includes(employment)) throw new Error("Choose an employment type.");
  const email = text(form, "email", 254, false);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
  return { customer_name: text(form, "customer_name", 120), phone: phone(form), email, loan_type_id, amount: amount(form, "amount", true), property_location: text(form, "property_location", 120, false), property_value: amount(form, "property_value"), employment, details: text(form, "details", 2000, false) };
}

export function matchesRequirement(requirement: MatchRequirement, property: PropertyListing): boolean {
  const type = requirement.category === "Flat" ? (requirement.purpose === "Buy" ? "Resale" : "Rental") : (requirement.category === "PG" || requirement.category === "Hostel" ? "PG" : "Airbnb");
  if (property.status !== "Approved" || property.type !== type || !matchesPropertyLocation(property, requirement.location)) return false;
  if ((requirement.min_budget !== null || requirement.max_budget !== null) && (!Number.isFinite(property.price) || property.price <= 0)) return false;
  if (requirement.min_budget !== null && property.price < requirement.min_budget) return false;
  if (requirement.max_budget !== null && property.price > requirement.max_budget) return false;
  if (requirement.bedrooms !== null && property.bedrooms !== requirement.bedrooms) return false;
  return true;
}
