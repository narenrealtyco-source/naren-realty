import { AIRBNB_AMENITIES, FLAT_AMENITIES, PG_AMENITIES, type ListingType } from "../lib/properties";

export type AdditionalField = {
  key: string;
  label: string;
  type?: "number" | "date" | "time";
  options?: string[];
  group?: "basic" | "location" | "pricing" | "facilities";
};

export const pgFacilities = [
  "Food Included", "Wi-Fi Included", "Breakfast Included", "Lunch Included", "Dinner Included",
  "Electricity Included", "Maintenance Included", "Attached Bathroom", "AC Available", "Laundry Included", "Housekeeping Included",
  "Water Included", "Tea / Snacks Included",
];
export const sharingTypes = ["Single Sharing (1 Person)", "Double Sharing (2 Persons)", "Triple Sharing (3 Persons)", "Four Sharing (4 Persons)", "Five Sharing (5 Persons)", "Dormitory (Multiple Sharing)", "Private Room"];

export const commonFields: AdditionalField[] = [
  { key: "property_type", label: "Property type", group: "basic", options: ["Apartment / Flat", "Independent House", "Villa", "Studio Apartment", "PG Building", "Hostel Building", "House / Villa", "PG / Hostel", "Short stay", "Other"] },
  { key: "purpose", label: "Listing purpose", group: "basic", options: ["Rent", "Resale", "New Property", "PG", "Short Stay"] },
  { key: "built_up_area", label: "Built-up area (sq. ft.)", group: "basic", type: "number" },
  { key: "landmark", label: "Landmark", group: "location" },
  { key: "city", label: "City", group: "location" },
  { key: "pincode", label: "PIN code", group: "location" },
  { key: "society", label: "Society / building name", group: "location" },
  { key: "available_from", label: "Available from", group: "pricing", type: "date" },
];

const flatFields: AdditionalField[] = [
  { key: "bhk", label: "BHK configuration", group: "basic", options: ["1 RK", "1 BHK", "2 BHK", "3 BHK", "4 BHK", "5 BHK"] },
  { key: "bedrooms", label: "Bedrooms", group: "basic", type: "number" },
  { key: "bathrooms", label: "Bathrooms", group: "basic", type: "number" },
  { key: "balconies", label: "Balconies", group: "basic", type: "number" },
  { key: "floor", label: "Floor number", group: "basic", type: "number" },
  { key: "total_floors", label: "Total floors", group: "basic", type: "number" },
  { key: "age", label: "Property age", group: "basic", options: ["New / Ready to Move", "1–5 Years", "5–10 Years", "10+ Years"] },
  { key: "entry", label: "Main entry direction", group: "basic", options: ["North", "South", "East", "West", "North-East", "North-West", "South-East", "South-West"] },
  { key: "exit", label: "Exit direction", group: "basic", options: ["North", "South", "East", "West", "North-East", "North-West", "South-East", "South-West"] },
  { key: "furnishing", label: "Furnishing", group: "facilities", options: ["Unfurnished", "Semi-Furnished", "Fully Furnished"] },
  { key: "wifi_available", label: "Wi-Fi available", group: "facilities", options: ["Yes", "No"] },
  { key: "wifi_billing", label: "Wi-Fi charges", group: "facilities", options: ["Included", "Extra Charges"] },
  { key: "wifi_monthly_charges", label: "Monthly Wi-Fi charges (INR)", group: "facilities", type: "number" },
  { key: "wifi_coverage", label: "Wi-Fi coverage", group: "facilities", options: ["Each Room", "Common Area", "Entire Property"] },
  { key: "wifi_speed", label: "Wi-Fi speed (Mbps)", group: "facilities", type: "number" },
];

const rentalFields: AdditionalField[] = [
  { key: "deposit", label: "Security deposit (INR)", group: "pricing", type: "number" },
  { key: "negotiable", label: "Rent negotiable", group: "pricing", options: ["Yes", "No"] },
  { key: "maintenance_included", label: "Maintenance included", group: "pricing", options: ["Yes", "No"] },
  { key: "maintenance", label: "Monthly maintenance charges (INR)", group: "pricing", type: "number" },
  { key: "parking_charges", label: "Parking charges (INR)", group: "facilities", type: "number" },
  { key: "parking_slots", label: "Parking slots", group: "facilities", type: "number" },
  { key: "tenant_preference", label: "Tenant preference", group: "pricing", options: ["Family", "Bachelor", "Working Professionals", "Any"] },
];
const resaleFields: AdditionalField[] = [
  { key: "negotiable", label: "Price negotiable", group: "pricing", options: ["Yes", "No"] },
  { key: "parking_details", label: "Parking details", group: "facilities" },
  { key: "parking_slots", label: "Parking slots", group: "facilities", type: "number" },
  { key: "parking_charges", label: "Parking charges (INR)", group: "facilities", type: "number" },
  { key: "ownership", label: "Ownership type", group: "basic" },
  { key: "possession", label: "Possession status", group: "pricing", options: ["Ready to Move", "Under Construction"] },
  { key: "loan_status", label: "Loan / mortgage status", group: "pricing", options: ["No Loan", "Loan Active", "Loan Eligible", "Not Known"] },
  { key: "maintenance_charges", label: "Monthly maintenance charges (INR)", group: "pricing", type: "number" },
];
const pgFields: AdditionalField[] = [
  { key: "rooms", label: "Total rooms", group: "basic", type: "number" },
  { key: "total_beds", label: "Total beds", group: "basic", type: "number" },
  { key: "available_beds", label: "Available beds", group: "basic", type: "number" },
  { key: "gender", label: "Gender preference", group: "basic", options: ["Boys", "Girls", "Co-Living"] },
  { key: "suitable", label: "Suitable for", group: "basic", options: ["Students", "Working Professionals", "Both"] },
  { key: "curfew", label: "Curfew timing", group: "basic" },
  { key: "visitors", label: "Visitors allowed", group: "basic", options: ["Yes", "No"] },
  { key: "smoking", label: "Smoking allowed", group: "basic", options: ["Yes", "No"] },
  { key: "alcohol", label: "Alcohol allowed", group: "basic", options: ["Yes", "No"] },
  { key: "food_availability", label: "Food availability", group: "facilities", options: ["Not Provided", "Included", "Extra Charges"] },
  { key: "food_charges", label: "Monthly food charges (INR)", group: "facilities", type: "number" },
  { key: "electricity_charges", label: "Monthly electricity charges (INR)", group: "pricing", type: "number" },
  { key: "parking_slots", label: "Parking slots", group: "facilities", type: "number" },
  { key: "parking_charges", label: "Parking charges (INR)", group: "facilities", type: "number" },
  { key: "wifi_available", label: "Wi-Fi available", group: "facilities", options: ["Yes", "No"] },
  { key: "wifi_billing", label: "Wi-Fi charges", group: "facilities", options: ["Included", "Extra Charges"] },
  { key: "wifi_monthly_charges", label: "Monthly Wi-Fi charges (INR)", group: "facilities", type: "number" },
  { key: "wifi_coverage", label: "Wi-Fi coverage", group: "facilities", options: ["Each Room", "Common Area", "Entire Property"] },
  { key: "wifi_speed", label: "Wi-Fi speed (Mbps)", group: "facilities", type: "number" },
];
const airbnbFields: AdditionalField[] = [
  { key: "stay_type", label: "Short-stay property type", group: "basic", options: ["Entire Property", "Private Room", "Shared Room", "Entire Apartment", "Studio Apartment", "Villa", "Other"] },
  { key: "guests", label: "Guest capacity", group: "basic", type: "number" },
  { key: "bedrooms", label: "Bedrooms", group: "basic", type: "number" },
  { key: "bathrooms", label: "Bathrooms", group: "basic", type: "number" },
  { key: "deposit", label: "Security deposit (INR)", group: "pricing", type: "number" },
  { key: "minimum_stay", label: "Minimum stay (nights)", group: "pricing", type: "number" },
  { key: "maximum_stay", label: "Maximum stay (nights)", group: "pricing", type: "number" },
  { key: "weekend_price", label: "Weekend price per night (INR)", group: "pricing", type: "number" },
  { key: "weekly_price", label: "Weekly price (INR)", group: "pricing", type: "number" },
  { key: "monthly_price", label: "Monthly price (INR)", group: "pricing", type: "number" },
  { key: "check_in", label: "Check-in time", group: "pricing", type: "time" },
  { key: "check_out", label: "Check-out time", group: "pricing", type: "time" },
  { key: "cleaning", label: "Cleaning charges (INR)", group: "pricing", type: "number" },
  { key: "rules", label: "House rules", group: "basic" },
  { key: "furnishing", label: "Furnishing", group: "facilities", options: ["Unfurnished", "Semi-Furnished", "Fully Furnished"] },
  { key: "wifi_available", label: "Wi-Fi available", group: "facilities", options: ["Yes", "No"] },
  { key: "wifi_billing", label: "Wi-Fi charges", group: "facilities", options: ["Included", "Extra Charges"] },
  { key: "wifi_monthly_charges", label: "Monthly Wi-Fi charges (INR)", group: "facilities", type: "number" },
  { key: "wifi_coverage", label: "Wi-Fi coverage", group: "facilities", options: ["Each Room", "Common Area", "Entire Property"] },
  { key: "wifi_speed", label: "Wi-Fi speed (Mbps)", group: "facilities", type: "number" },
  { key: "parking_slots", label: "Parking slots", group: "facilities", type: "number" },
  { key: "parking_charges", label: "Parking charges (INR)", group: "facilities", type: "number" },
];

export function additionalFields(category: string): AdditionalField[] {
  if (category === "Rental") return [...flatFields, ...rentalFields];
  if (category === "Resale") return [...flatFields, ...resaleFields];
  if (category === "PG") return pgFields;
  if (category === "Airbnb") return airbnbFields;
  return [];
}

export const sharingFields: AdditionalField[] = sharingTypes.flatMap((type, index) => [
  { key: `sharing_${index}_rent`, label: `${type}: rent per person (INR)`, group: "pricing" as const, type: "number" as const },
  { key: `sharing_${index}_deposit`, label: `${type}: security deposit (INR)`, group: "pricing" as const, type: "number" as const },
  { key: `sharing_${index}_units`, label: `${type}: available units`, group: "pricing" as const, type: "number" as const },
]);

export function amenitiesForCategory(category: string): string[] {
  if (category === "Rental" || category === "Resale") return FLAT_AMENITIES;
  if (category === "PG") return PG_AMENITIES;
  if (category === "Airbnb") return AIRBNB_AMENITIES;
  return [];
}

export function categoryLabel(category: ListingType): string {
  return { Rental: "Flat Rental", Resale: "Flat Resale", PG: "PG / Hostel", Airbnb: "Airbnb / Short Stay" }[category];
}
