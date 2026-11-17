export type MarketplaceCategory = { id: string; name: string; slug: string; active: boolean };
export type PublicVendor = {
  id: string;
  category_id: string;
  business_name: string;
  public_name: string;
  services: string;
  description: string;
  city: string;
  locality: string;
};

// Vendor application submission is enabled: authenticated-only INSERT, applicant ownership,
// pending-only status, public category reads, and admin-only approval are verified in Supabase.
export function vendorMarketplaceReady(): boolean {
  return true;
}

function field(form: FormData, name: string, label: string, max: number, required = true): string {
  const raw = form.get(name);
  if (typeof raw !== "string") throw new Error(`Enter ${label}.`);
  const value = raw.trim();
  if ((required && !value) || value.length > max || value.includes("\0")) {
    throw new Error(`${label} must ${required ? "be provided and " : ""}be at most ${max} characters.`);
  }
  return value;
}

export function uuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function validateVendorApplication(form: FormData) {
  const rawCategoryIds = field(form, "category_ids", "Service categories", 1000);
  let category_ids: string[];
  try { category_ids = JSON.parse(rawCategoryIds); } catch { throw new Error("Select at least one valid service category."); }
  if (!Array.isArray(category_ids) || category_ids.length < 1 || category_ids.length > 16 || category_ids.some((id) => typeof id !== "string" || !uuid(id)) || new Set(category_ids).size !== category_ids.length) {
    throw new Error("Select between 1 and 16 valid service categories.");
  }
  const mobile = field(form, "mobile", "Mobile", 13);
  if (!/^(?:[6-9]\d{9}|\+91[6-9]\d{9})$/.test(mobile)) throw new Error("Enter a valid Indian mobile number.");
  const opening_time = field(form, "opening_time", "Shop opening time", 5, false);
  const closing_time = field(form, "closing_time", "Shop closing time", 5, false);
  if ((opening_time && !/^([01]\\d|2[0-3]):[0-5]\\d$/.test(opening_time)) || (closing_time && !/^([01]\\d|2[0-3]):[0-5]\\d$/.test(closing_time))) throw new Error("Enter valid shop timings.");
  if (Boolean(opening_time) !== Boolean(closing_time)) throw new Error("Enter both shop opening and closing times.");
  const email = field(form, "email", "Email", 254, false);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
  return {
    category_ids, mobile, email, opening_time, closing_time,
    business_name: field(form, "business_name", "Business name", 120),
    public_name: field(form, "public_name", "Public provider name", 120),
    contact_person: field(form, "contact_person", "Contact person", 120),
    services: field(form, "services", "Services offered", 500),
    description: field(form, "description", "Description", 2000),
    city: field(form, "city", "City", 100),
    locality: field(form, "locality", "Locality", 100),
    address: field(form, "address", "Address", 500),
    commission_terms: field(form, "commission_terms", "Commission arrangement", 1000, false),
  };
}

export function validateVendorEnquiry(form: FormData) {
  const vendor_id = field(form, "vendor_id", "Vendor", 36);
  if (!uuid(vendor_id)) throw new Error("Choose a valid vendor.");
  const mobile = field(form, "mobile", "Mobile", 13);
  if (!/^(?:[6-9]\d{9}|\+91[6-9]\d{9})$/.test(mobile)) throw new Error("Enter a valid Indian mobile number.");
  if (form.get("contact_consent") !== "yes") throw new Error("Please consent to sharing your contact details with this provider.");
  return {
    vendor_id,
    mobile,
    contact_consent: true,
    locality: field(form, "locality", "Locality", 120),
    full_address: field(form, "full_address", "Full address", 500),
    customer_name: field(form, "customer_name", "Name", 120),
    message: field(form, "message", "Requirement", 2000),
  };
}
