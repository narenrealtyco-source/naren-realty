export type PropertyOwnerDetails = {
  version: 1;
  fullName: string;
  mobile: string;
  email: string;
  relationship: "Owner" | "Power of Attorney" | "Authorized Representative";
  authorizationDetails: string;
};

const RELATIONSHIPS = ["Owner", "Power of Attorney", "Authorized Representative"] as const;

function text(value: unknown, label: string, maximumLength: number, required = true): string {
  if (typeof value !== "string") throw new Error(`${label} is invalid.`);
  const result = value.trim();
  if ((required && !result) || result.length > maximumLength || result.includes("\0")) {
    throw new Error(`${label} must contain ${required ? "1 to " : "no more than "}${maximumLength} characters.`);
  }
  return result;
}

export function validatePropertyOwnerDetails(input: unknown): PropertyOwnerDetails {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Owner contact details are invalid.");
  const value = input as Record<string, unknown>;
  if (Object.keys(value).some((key) => !["version", "fullName", "mobile", "email", "relationship", "authorizationDetails"].includes(key)) ||
      value.version !== 1 || typeof value.relationship !== "string" ||
      !RELATIONSHIPS.includes(value.relationship as (typeof RELATIONSHIPS)[number])) {
    throw new Error("Owner contact details are invalid.");
  }
  const fullName = text(value.fullName, "Owner name", 120);
  const mobile = text(value.mobile, "Mobile number", 24).replace(/[ ()-]/g, "");
  const email = text(value.email, "Email address", 254).toLowerCase();
  const authorizationDetails = text(value.authorizationDetails, "Authorization details", 1000, false);
  if (fullName.length < 2) throw new Error("Enter the owner's full name.");
  if (!/^(?:\+?91)?[6-9]\d{9}$/.test(mobile)) throw new Error("Enter a valid Indian mobile number.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
  if (value.relationship !== "Owner" && authorizationDetails.length < 10) {
    throw new Error("Add at least 10 characters describing your authority to list this property.");
  }
  return {
    version: 1,
    fullName,
    mobile,
    email,
    relationship: value.relationship as PropertyOwnerDetails["relationship"],
    authorizationDetails,
  };
}

export function parsePropertyOwnerDetails(form: FormData): PropertyOwnerDetails {
  const raw = form.get("owner_details");
  if (typeof raw !== "string" || new TextEncoder().encode(raw).length > 3000) {
    throw new Error("Owner contact details are missing or too large.");
  }
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error("Owner contact details are invalid."); }
  return validatePropertyOwnerDetails(parsed);
}
