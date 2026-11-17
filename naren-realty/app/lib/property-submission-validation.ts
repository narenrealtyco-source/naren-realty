export const SUBMISSION_CATEGORIES = ["Rental", "Resale", "PG", "Airbnb"] as const;
export const MAX_SUBMISSION_PHOTOS = 5;
export const MAX_SUBMISSION_PHOTO_BYTES = 5 * 1024 * 1024;
export const MAX_SUBMISSION_VIDEO_BYTES = 50 * 1024 * 1024;
export const SUPPORTED_SUBMISSION_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type PropertySubmissionInput = {
  title: string;
  category: (typeof SUBMISSION_CATEGORIES)[number];
  locality: string;
  address: string;
  price: number;
  area: number;
  description: string;
};

const INPUT_FIELDS = new Set(["title", "category", "locality", "address", "price", "area", "description"]);

export function hasUnsupportedSubmissionDetails(entries: Iterable<[string, FormDataEntryValue]>): boolean {
  for (const [key, value] of entries) {
    if (key.startsWith("extra_") && (typeof value !== "string" || value.trim() !== "")) return true;
  }
  return false;
}

function requiredText(value: unknown, label: string, maximumLength: number): string {
  if (typeof value !== "string") throw new Error(`${label} is required.`);
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maximumLength || trimmed.includes("\0")) {
    throw new Error(`${label} must contain between 1 and ${maximumLength} characters.`);
  }
  return trimmed;
}

function positiveNumber(value: unknown, label: string, maximum: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value > maximum) {
    throw new Error(`${label} must be greater than zero and at most ${maximum}.`);
  }
  return value;
}

export function validatePropertySubmission(value: unknown): PropertySubmissionInput {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Property details are invalid.");
  }
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((key) => !INPUT_FIELDS.has(key))) {
    throw new Error("Property details contain unsupported fields.");
  }

  const category = SUBMISSION_CATEGORIES.find((candidate) => candidate === input.category);
  if (!category) {
    throw new Error("Select a valid property category.");
  }

  return {
    title: requiredText(input.title, "Title", 120),
    category,
    locality: requiredText(input.locality, "Locality", 120),
    address: requiredText(input.address, "Full address", 500),
    price: positiveNumber(input.price, "Price", 1_000_000_000_000),
    area: positiveNumber(input.area, "Area", 10_000_000),
    description: requiredText(input.description, "Description", 2000),
  };
}

export function validateSubmissionPhotoCount(count: number): void {
  if (!Number.isInteger(count) || count < 1 || count > MAX_SUBMISSION_PHOTOS) {
    throw new Error(`Select between 1 and ${MAX_SUBMISSION_PHOTOS} photos.`);
  }
}

export function validateSubmissionPhoto(
  contentType: string,
  bytes: Uint8Array,
): void {
  if (bytes.length === 0 || bytes.length > MAX_SUBMISSION_PHOTO_BYTES) {
    throw new Error("Each photo must be between 1 byte and 5 MB.");
  }
  const isJpeg = bytes.length >= 3 &&
    bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = bytes.length >= 8 &&
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => bytes[index] === byte);
  const isWebp = bytes.length >= 12 &&
    [0x52, 0x49, 0x46, 0x46].every((byte, index) => bytes[index] === byte) &&
    [0x57, 0x45, 0x42, 0x50].every((byte, index) => bytes[index + 8] === byte);

  if (!SUPPORTED_SUBMISSION_PHOTO_TYPES.some((type) => type === contentType) ||
      !((contentType === "image/jpeg" && isJpeg) ||
        (contentType === "image/png" && isPng) ||
        (contentType === "image/webp" && isWebp))) {
    throw new Error("Photos must be JPEG, PNG, or WebP images.");
  }
}
