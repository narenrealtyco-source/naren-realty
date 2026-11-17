export type OwnerAccount = {
  id: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  passwordSalt: string;
  passwordHash: string;
  createdAt: string;
  registrationCategory?: ListingType;
};

export type ListingStatus = "Pending Approval" | "Approved" | "Rejected";
export const PROPERTY_CATEGORIES = ["Rental", "Resale", "PG", "Airbnb"] as const;
export type ListingType = (typeof PROPERTY_CATEGORIES)[number];
export type FlatBhk = "1 RK" | "1 BHK" | "2 BHK" | "3 BHK" | "4 BHK" | "5 BHK";
export type Direction = "North" | "South" | "East" | "West" | "North-East" | "North-West" | "South-East" | "South-West";

export type FlatRentalDetails = {
  bhkConfiguration: FlatBhk;
  carpetArea: number;
  bathrooms: number;
  balconies: number;
  floorNumber: number;
  totalFloors: number;
  furnishingStatus: string;
  propertyAge: string;
  entryDirection: Direction;
  exitDirection: Direction;
  monthlyRent: number;
  securityDeposit: number;
  rentNegotiable: boolean;
  maintenanceIncluded: boolean;
  monthlyMaintenanceCharges?: number;
  parkingCharges?: number;
  tenantPreference: string;
  amenities: string[];
};

export type FlatResaleDetails = Omit<FlatRentalDetails, "monthlyRent" | "securityDeposit" | "rentNegotiable" | "maintenanceIncluded" | "monthlyMaintenanceCharges" | "tenantPreference" | "parkingCharges"> & {
  expectedSalePrice: number;
  priceNegotiable: boolean;
  parkingDetails: string;
  ownershipType: string;
  possessionStatus: string;
};

export type PgSharingOption = {
  sharingType: string;
  monthlyRentPerPerson: number;
  securityDeposit: number;
  availableUnits: number;
};

export type PgDetails = {
  pgName: string;
  totalRooms?: number;
  genderPreference: string;
  sharingOptions: PgSharingOption[];
  facilities: Record<string, boolean>;
  amenities: string[];
  suitableFor: string;
  curfewTiming: string;
  visitorsAllowed: boolean;
  smokingAllowed: boolean;
  alcoholAllowed: boolean;
};

export type AirbnbDetails = {
  propertyType: string;
  guestCapacity: number;
  bedrooms: number;
  bathrooms: number;
  carpetArea?: number;
  furnishingStatus: string;
  pricePerNight: number;
  securityDeposit?: number;
  minimumStayNights: number;
  maximumStayNights?: number;
  amenities: string[];
  checkInTime: string;
  checkOutTime: string;
  houseRules: string;
  cleaningCharges?: number;
};

export type PropertyCategoryDetails = FlatRentalDetails | FlatResaleDetails | PgDetails | AirbnbDetails;

export const PUNE_LOCALITIES = [
  "Akurdi", "Alandi", "Amanora Park Town", "Ambegaon Budruk", "Ambegaon Khurd", "Anand Nagar",
  "Aundh", "Aundh Road", "Balewadi", "Baner", "Baner-Pashan Link Road", "Bavdhan", "Bavdhan Budruk",
  "Bavdhan Khurd", "Bhugaon", "Bhosari", "Bibwewadi", "Boat Club Road", "Budhwar Peth", "Camp",
  "Chakan", "Charholi", "Chikhali", "Chinchwad", "Dapodi", "Deccan Gymkhana", "Dehu Road",
  "Dhanori", "Dhayari", "Erandwane", "Fursungi", "Ganesh Peth", "Ghorpadi", "Gokhalenagar",
  "Hadapsar", "Handewadi", "Hinjewadi", "Hinjewadi Phase 1", "Hinjewadi Phase 2", "Hinjewadi Phase 3",
  "Ideal Colony", "Kalyani Nagar", "Karve Nagar", "Kasarwadi", "Katraj", "Keshav Nagar",
  "Khadki", "Kharadi", "Kondhwa", "Kondhwa Budruk", "Kondhwa Khurd", "Koregaon Park",
  "Kothrud", "Lohegaon", "Lulla Nagar", "Magarpatta City", "Mahalunge", "Mamurdi", "Market Yard",
  "Moshi", "Mundhwa", "NIBM Road", "Narhe", "Nigdi", "Pashan", "Pashan-Sus Road",
  "Pimple Gurav", "Pimple Nilakh", "Pimple Saudagar", "Pimpri", "Pisoli", "Prabhat Road",
  "Punawale", "Rahatani", "Rasta Peth", "Ravet", "Sadashiv Peth", "Salisbury Park",
  "Sangvi", "Shivajinagar", "Shukrawar Peth", "Sinhagad Road", "Somatane", "Sus",
  "Swargate", "Tathawade", "Thergaon", "Undri", "Uruli Devachi", "Vadgaon Budruk",
  "Viman Nagar", "Vishrantwadi", "Wadgaon Sheri", "Wagholi", "Wanowrie", "Warje",
  "Wakad", "Yerawada",
] as const;

export const FLAT_AMENITIES = [
  "Lift", "Covered Parking", "Open Parking", "Power Backup", "24x7 Water Supply", "Security", "CCTV Surveillance",
  "Clubhouse", "Swimming Pool", "Gymnasium", "Garden", "Children's Play Area", "Walking Track", "Indoor Games",
  "Visitor Parking", "Gas Pipeline", "Gated Community", "Intercom", "Fire Safety", "Rainwater Harvesting",
  "Solar Water Heating", "Sports Facilities", "Society Office", "EV Charging", "Modular Kitchen", "TV",
  "Refrigerator", "Geyser", "Sofa", "Dining Table", "Bed", "Mattress", "Wardrobe / Almirah", "AC",
  "Washing Machine", "Microwave", "RO Purifier", "Curtains", "Fans", "Lights", "Wi-Fi",
];

export const PG_AMENITIES = [
  "Wi-Fi", "Food / Mess", "Refrigerator", "Washing Machine", "Air Conditioning", "Geyser / Hot Water", "Housekeeping",
  "Laundry Service", "CCTV Surveillance", "24x7 Security", "Biometric Access", "Power Backup", "Drinking Water",
  "Common Kitchen", "Dining Area", "Study Table", "Wardrobe", "Bed with Mattress", "Attached Bathroom",
  "Common Bathroom", "Lift", "Parking", "Gym", "Common TV / Recreation Room", "RO Water Purifier", "Indoor Games", "Outdoor Sitting Area",
  "Pillow", "Study Lamp", "Locker", "Breakfast", "Lunch", "Dinner", "Tea / Snacks", "Kitchen Access",
  "Cleaning Service", "Water Supply", "Microwave",
];

export const AIRBNB_AMENITIES = [
  "Wi-Fi", "AC", "TV", "Kitchen", "Refrigerator", "Washing Machine", "Geyser", "Lift", "Parking", "Power Backup",
  "Swimming Pool", "Gym", "Balcony", "Garden", "Security", "CCTV", "Housekeeping", "Workspace", "Dining Area", "RO Water",
  "Bed & Mattress", "Wardrobe", "Sofa", "Dining Table", "Curtains", "Extra Bedding", "Modular Kitchen", "Microwave",
  "Induction / Gas", "RO Purifier", "Electric Kettle", "Cookware & Utensils", "Toaster", "Towels", "Toiletries",
  "Hair Dryer", "Iron & Ironing Board", "Breakfast Included", "Airport Pickup", "Private Entrance",
];

export type PropertyListing = {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  ownerMobile: string;
  title: string;
  type: ListingType;
  locality: string;
  address?: string;
  landmark?: string;
  availableFrom?: string;
  availabilityConfirmation?: import("./property-marketing").AvailabilityConfirmation;
  price: number;
  area?: number;
  bedrooms: number;
  bathrooms: number;
  furnishing: string;
  description: string;
  photos: string[];
  videoUrl?: string;
  categoryDetails?: PropertyCategoryDetails;
  publicListingDetails?: import("./submission-details").SubmissionDetails;
  status: ListingStatus;
  createdAt: string;
  updatedAt: string;
};

export type PropertyDetails = Omit<
  PropertyListing,
  "id" | "ownerId" | "ownerName" | "ownerEmail" | "ownerMobile" | "status" | "createdAt" | "updatedAt"
>;

const OWNERS_KEY = "naren-realty-owners-v1";
const OWNER_SESSION_KEY = "naren-realty-owner-session-v1";
const CUSTOMER_SESSION_KEY = "naren-realty-customer-session-v1";
const LISTINGS_KEY = "naren-realty-listings-v1";
const LOCALITIES_KEY = "naren-realty-property-localities-v1";
const PASSWORD_ITERATIONS = 120_000;

function readArray<T>(key: string): T[] {
  const stored = window.localStorage.getItem(key);
  if (!stored) return [];
  const value: unknown = JSON.parse(stored);
  if (!Array.isArray(value)) throw new Error("Saved portal data is invalid.");
  return value as T[];
}

function encodeBytes(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: Uint8Array.from(atob(salt), (character) => character.charCodeAt(0)), iterations: PASSWORD_ITERATIONS, hash: "SHA-256" },
    key,
    256,
  );
  return encodeBytes(new Uint8Array(bits));
}

export async function registerOwner(input: {
  fullName: string;
  email: string;
  mobileNumber: string;
  password: string;
  registrationCategory?: ListingType;
}): Promise<OwnerAccount> {
  const owners = readArray<OwnerAccount>(OWNERS_KEY);
  const email = input.email.trim().toLowerCase();
  if (owners.some((owner) => owner.email.toLowerCase() === email)) {
    throw new Error("An account with this email already exists.");
  }

  const salt = encodeBytes(crypto.getRandomValues(new Uint8Array(16)));
  const owner: OwnerAccount = {
    id: crypto.randomUUID(),
    fullName: input.fullName.trim(),
    email,
    mobileNumber: input.mobileNumber.trim(),
    passwordSalt: salt,
    passwordHash: await hashPassword(input.password, salt),
    createdAt: new Date().toISOString(),
    registrationCategory: input.registrationCategory,
  };
  window.localStorage.setItem(OWNERS_KEY, JSON.stringify([...owners, owner]));
  window.localStorage.removeItem(CUSTOMER_SESSION_KEY);
  window.localStorage.setItem(OWNER_SESSION_KEY, owner.id);
  return owner;
}

export async function loginOwner(emailInput: string, password: string): Promise<OwnerAccount> {
  const email = emailInput.trim().toLowerCase();
  const owner = readArray<OwnerAccount>(OWNERS_KEY).find((candidate) => candidate.email.toLowerCase() === email);
  if (!owner || (await hashPassword(password, owner.passwordSalt)) !== owner.passwordHash) {
    throw new Error("Email or password is incorrect.");
  }
  window.localStorage.removeItem(CUSTOMER_SESSION_KEY);
  window.localStorage.setItem(OWNER_SESSION_KEY, owner.id);
  return owner;
}

export function getOwnerSession(): OwnerAccount | null {
  const ownerId = window.localStorage.getItem(OWNER_SESSION_KEY);
  if (!ownerId) return null;
  return readArray<OwnerAccount>(OWNERS_KEY).find((owner) => owner.id === ownerId) ?? null;
}

export function logoutOwner(): void {
  window.localStorage.removeItem(OWNER_SESSION_KEY);
}

export function getAllOwners(): OwnerAccount[] {
  return readArray<OwnerAccount>(OWNERS_KEY);
}

export function getAllListings(): PropertyListing[] {
  return readArray<PropertyListing>(LISTINGS_KEY).map((listing) => normalizeListing(listing));
}

export function getPropertyLocalities(): string[] {
  const saved = readArray<string>(LOCALITIES_KEY);
  return Array.from(new Set([...PUNE_LOCALITIES, ...saved])).sort((first, second) => first.localeCompare(second));
}

export function addPropertyLocality(localityInput: string): string[] {
  const locality = localityInput.trim();
  if (!locality) throw new Error("Enter a locality name.");
  const saved = readArray<string>(LOCALITIES_KEY);
  if (!getPropertyLocalities().some((item) => item.toLowerCase() === locality.toLowerCase())) {
    window.localStorage.setItem(LOCALITIES_KEY, JSON.stringify([...saved, locality]));
  }
  return getPropertyLocalities();
}

export function removePropertyLocality(locality: string): string[] {
  if (PUNE_LOCALITIES.some((item) => item.toLowerCase() === locality.toLowerCase())) return getPropertyLocalities();
  window.localStorage.setItem(LOCALITIES_KEY, JSON.stringify(readArray<string>(LOCALITIES_KEY).filter((item) => item !== locality)));
  return getPropertyLocalities();
}

export function createDefaultCategoryDetails(type: ListingType, price = 0, bedrooms = 1): PropertyCategoryDetails {
  const bhkConfiguration: FlatBhk = bedrooms <= 1
    ? bedrooms === 0 ? "1 RK" : "1 BHK"
    : `${Math.min(bedrooms, 5)} BHK` as FlatBhk;
  if (type === "Rental") {
    return {
      bhkConfiguration, carpetArea: 0, bathrooms: 1, balconies: 0, floorNumber: 0, totalFloors: 1,
      furnishingStatus: "Unfurnished", propertyAge: "New / Ready to Move", entryDirection: "North", exitDirection: "North",
      monthlyRent: price, securityDeposit: 0, rentNegotiable: false, maintenanceIncluded: true, tenantPreference: "Any", amenities: [],
    };
  }
  if (type === "Resale") {
    return {
      bhkConfiguration, carpetArea: 0, bathrooms: 1, balconies: 0, floorNumber: 0, totalFloors: 1,
      furnishingStatus: "Unfurnished", propertyAge: "New / Ready to Move", entryDirection: "North", exitDirection: "North",
      expectedSalePrice: price, priceNegotiable: false, parkingDetails: "", ownershipType: "", possessionStatus: "Ready to Move", amenities: [],
    };
  }
  if (type === "PG") {
    return {
      pgName: "", genderPreference: "Co-Living", sharingOptions: [], facilities: {}, amenities: [], suitableFor: "Both",
      curfewTiming: "", visitorsAllowed: false, smokingAllowed: false, alcoholAllowed: false,
    };
  }
  return {
    propertyType: "Entire Apartment", guestCapacity: 2, bedrooms, bathrooms: 1, furnishingStatus: "Furnished",
    pricePerNight: price, minimumStayNights: 1, amenities: [], checkInTime: "15:00", checkOutTime: "11:00", houseRules: "",
  };
}

function normalizeListing(listing: PropertyListing): PropertyListing {
  const categoryDetails = listing.categoryDetails ?? createDefaultCategoryDetails(listing.type, listing.price, listing.bedrooms);
  return {
    ...listing,
    address: listing.address ?? "",
    landmark: listing.landmark ?? "",
    availableFrom: listing.availableFrom ?? "",
    categoryDetails,
  };
}

export function getApprovedListings(): PropertyListing[] {
  return getAllListings().filter((listing) => listing.status === "Approved");
}

export function getOwnerListings(ownerId: string): PropertyListing[] {
  return getAllListings().filter((listing) => listing.ownerId === ownerId);
}

export function createListing(owner: OwnerAccount, details: PropertyDetails): PropertyListing {
  const existing = getAllListings();
  const duplicate = existing.some((listing) =>
    listing.ownerId === owner.id &&
    listing.type === details.type &&
    listing.title.trim().toLowerCase() === details.title.trim().toLowerCase() &&
    listing.locality.trim().toLowerCase() === details.locality.trim().toLowerCase() &&
    (listing.address ?? "").trim().toLowerCase() === (details.address ?? "").trim().toLowerCase(),
  );
  if (duplicate) throw new Error("A matching property listing already exists in your account.");

  const now = new Date().toISOString();
  const listing: PropertyListing = {
    ...details,
    id: crypto.randomUUID(),
    ownerId: owner.id,
    ownerName: owner.fullName,
    ownerEmail: owner.email,
    ownerMobile: owner.mobileNumber,
    status: "Pending Approval",
    createdAt: now,
    updatedAt: now,
  };
  window.localStorage.setItem(LISTINGS_KEY, JSON.stringify([...existing, listing]));
  return listing;
}

export function updateOwnerListing(ownerId: string, listingId: string, details: PropertyDetails): PropertyListing {
  let updated: PropertyListing | undefined;
  const listings = getAllListings().map((listing) => {
    if (listing.id !== listingId || listing.ownerId !== ownerId) return listing;
    updated = { ...listing, ...details, status: "Pending Approval", updatedAt: new Date().toISOString() };
    return updated;
  });
  if (!updated) throw new Error("This listing is not available in your account.");
  window.localStorage.setItem(LISTINGS_KEY, JSON.stringify(listings));
  return updated;
}

export function deleteOwnerListing(ownerId: string, listingId: string): void {
  const listings = getAllListings();
  const remaining = listings.filter((listing) => listing.id !== listingId || listing.ownerId !== ownerId);
  if (remaining.length === listings.length) throw new Error("This listing is not available in your account.");
  window.localStorage.setItem(LISTINGS_KEY, JSON.stringify(remaining));
}

export function updateListingReview(listingId: string, status: Exclude<ListingStatus, "Pending Approval">): void {
  const listings = getAllListings().map((listing) =>
    listing.id === listingId ? { ...listing, status, updatedAt: new Date().toISOString() } : listing,
  );
  window.localStorage.setItem(LISTINGS_KEY, JSON.stringify(listings));
}

export function updateAdminListing(
  listingId: string,
  details: PropertyDetails,
): void {
  let found = false;
  const listings = getAllListings().map((listing) => {
    if (listing.id !== listingId) return listing;
    found = true;
    return { ...listing, ...details, updatedAt: new Date().toISOString() };
  });
  if (!found) throw new Error("Property listing could not be found.");
  window.localStorage.setItem(LISTINGS_KEY, JSON.stringify(listings));
}

export function deleteListingLocally(listingId: string): void {
  const listings = getAllListings().filter((listing) => listing.id !== listingId);
  window.localStorage.setItem(LISTINGS_KEY, JSON.stringify(listings));
}
