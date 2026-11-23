import type { PropertyListing, PgSharingOption } from "../lib/properties";

type PropertyRecord = Record<string, unknown>;

function detailsRecord(listing: PropertyListing): PropertyRecord {
  return (listing.categoryDetails ?? {}) as unknown as PropertyRecord;
}

function text(details: PropertyRecord, key: string, fallback = "Not specified"): string {
  const value = details[key];
  return typeof value === "string" && value ? value : fallback;
}

function amount(details: PropertyRecord, key: string): number | undefined {
  const value = details[key];
  return typeof value === "number" && value > 0 ? value : undefined;
}

function list(details: PropertyRecord, key: string): string[] {
  const value = details[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function currency(value: number): string {
  return `₹${value.toLocaleString("en-IN")}`;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 border-l-2 border-amber-400 pl-3"><dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</dt><dd className="mt-1 break-words font-medium text-slate-800">{value}</dd></div>;
}

function Amenities({ values }: { values: string[] }) {
  if (!values.length) return null;
  return <section className="mt-6"><h3 className="text-sm font-bold text-[#A71930]">Available Amenities</h3><ul className="mt-2 flex flex-wrap gap-2">{values.map((amenity) => <li key={amenity} className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700">{amenity}</li>)}</ul></section>;
}

export default function PropertyInformation({ listing, showOwnerContacts = false }: { listing: PropertyListing; showOwnerContacts?: boolean }) {
  const details = detailsRecord(listing);
  const amenities = list(details, "amenities");
  const availableFrom = listing.availableFrom ? new Date(`${listing.availableFrom}T00:00:00`).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "Not specified";

  return <div className="mt-6 border-t border-slate-200 pt-5">
    <h2 className="text-xs font-bold uppercase tracking-wider text-amber-700">Property Details</h2>
    <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Detail label="Full Address" value={listing.address || `${listing.locality}, Pune`} />
      <Detail label="Locality" value={`${listing.locality}, Pune`} />
      <Detail label="Landmark" value={listing.landmark || "Not specified"} />
      <Detail label="Available From" value={availableFrom} />
      <Detail label="Category" value={listing.type === "Rental" ? "Flat Rental" : listing.type === "Resale" ? "Flat Resale" : listing.type === "PG" ? "PG / Hostel" : "Airbnb / Short Stay"} />
    </dl>

    {(listing.type === "Rental" || listing.type === "Resale") && <>
      <h3 className="mt-6 text-sm font-bold text-[#A71930]">Flat Details</h3>
      <dl className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Detail label="BHK Configuration" value={text(details, "bhkConfiguration", listing.bedrooms ? `${listing.bedrooms} BHK` : "Not specified")} />
        <Detail label="Carpet Area" value={amount(details, "carpetArea") ? `${amount(details, "carpetArea")} sq. ft.` : "Not specified"} />
        <Detail label="Bathrooms" value={String(amount(details, "bathrooms") ?? listing.bathrooms)} />
        <Detail label="Balconies" value={String(typeof details.balconies === "number" ? details.balconies : 0)} />
        <Detail label="Floor" value={`${typeof details.floorNumber === "number" ? details.floorNumber : 0} of ${typeof details.totalFloors === "number" ? details.totalFloors : "?"}`} />
        <Detail label="Furnishing" value={text(details, "furnishingStatus", listing.furnishing)} />
        <Detail label="Property Age" value={text(details, "propertyAge")} />
        <Detail label="Flat Main Entry Direction" value={text(details, "entryDirection")} />
        <Detail label="Flat Exit Direction" value={text(details, "exitDirection")} />
      </dl>
      {listing.type === "Rental" ? <>
        <h3 className="mt-6 text-sm font-bold text-[#A71930]">Rental Pricing</h3>
        <dl className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="Monthly Rent" value={currency(amount(details, "monthlyRent") ?? listing.price)} />
          <Detail label="Security Deposit" value={currency(amount(details, "securityDeposit") ?? 0)} />
          <Detail label="Rent Negotiable" value={details.rentNegotiable === true ? "Yes" : "No"} />
          <Detail label="Maintenance" value={details.maintenanceIncluded === false ? "Maintenance Extra" : "Maintenance Included in Rent"} />
          {details.maintenanceIncluded === false && <Detail label="Monthly Maintenance Charges" value={currency(amount(details, "monthlyMaintenanceCharges") ?? 0)} />}
          {amount(details, "parkingCharges") !== undefined && <Detail label="Parking Charges" value={currency(amount(details, "parkingCharges")!)} />}
          <Detail label="Tenant Preference" value={text(details, "tenantPreference")} />
        </dl>
      </> : <>
        <h3 className="mt-6 text-sm font-bold text-[#A71930]">Resale Pricing</h3>
        <dl className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="Expected Sale Price" value={currency(amount(details, "expectedSalePrice") ?? listing.price)} />
          <Detail label="Price Negotiable" value={details.priceNegotiable === true ? "Yes" : "No"} />
          <Detail label="Possession Status" value={text(details, "possessionStatus")} />
          <Detail label="Parking Details" value={text(details, "parkingDetails")} />
          <Detail label="Ownership Type" value={text(details, "ownershipType")} />
        </dl>
      </>}
    </>}

    {listing.type === "PG" && <>
      <h3 className="mt-6 text-sm font-bold text-[#A71930]">PG / Hostel Details</h3>
      <dl className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Detail label="PG / Hostel Name" value={text(details, "pgName", listing.title)} /><Detail label="Gender Preference" value={text(details, "genderPreference")} /><Detail label="Total Rooms" value={amount(details, "totalRooms")?.toString() ?? "Not specified"} /><Detail label="Suitable For" value={text(details, "suitableFor")} /><Detail label="Curfew Timing" value={text(details, "curfewTiming")} /><Detail label="Visitors Allowed" value={details.visitorsAllowed === true ? "Yes" : "No"} /><Detail label="Smoking Allowed" value={details.smokingAllowed === true ? "Yes" : "No"} /><Detail label="Alcohol Allowed" value={details.alcoholAllowed === true ? "Yes" : "No"} /></dl>
      <h3 className="mt-6 text-sm font-bold text-[#A71930]">Sharing Options & Pricing</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">{((details.sharingOptions as PgSharingOption[] | undefined) ?? []).map((option) => <article key={option.sharingType} className="rounded-md border border-slate-200 p-4"><h4 className="font-semibold text-[#A71930]">{option.sharingType}</h4><dl className="mt-3 grid grid-cols-2 gap-3"><Detail label="Monthly Rent / Person" value={currency(option.monthlyRentPerPerson)} /><Detail label="Security Deposit" value={currency(option.securityDeposit)} /><Detail label="Available Beds / Rooms" value={String(option.availableUnits)} /></dl></article>)}</div>
      <h3 className="mt-6 text-sm font-bold text-[#A71930]">Facilities</h3>
      <ul className="mt-2 flex flex-wrap gap-2">{Object.entries((details.facilities as Record<string, boolean> | undefined) ?? {}).filter(([, included]) => included).map(([facility]) => <li key={facility} className="rounded-md bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-800">{facility}</li>)}</ul>
    </>}

    {listing.type === "Airbnb" && <>
      <h3 className="mt-6 text-sm font-bold text-[#A71930]">Airbnb / Short Stay Details</h3>
      <dl className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Detail label="Property Type" value={text(details, "propertyType")} /><Detail label="Guest Capacity" value={String(amount(details, "guestCapacity") ?? 0)} /><Detail label="Bedrooms" value={String(typeof details.bedrooms === "number" ? details.bedrooms : listing.bedrooms)} /><Detail label="Bathrooms" value={String(amount(details, "bathrooms") ?? listing.bathrooms)} /><Detail label="Carpet Area" value={amount(details, "carpetArea") ? `${amount(details, "carpetArea")} sq. ft.` : "Not specified"} /><Detail label="Furnishing" value={text(details, "furnishingStatus", listing.furnishing)} /><Detail label="Price per Night" value={currency(amount(details, "pricePerNight") ?? listing.price)} /><Detail label="Security Deposit" value={amount(details, "securityDeposit") ? currency(amount(details, "securityDeposit")!) : "None"} /><Detail label="Minimum Stay" value={`${amount(details, "minimumStayNights") ?? 1} nights`} /><Detail label="Maximum Stay" value={amount(details, "maximumStayNights") ? `${amount(details, "maximumStayNights")} nights` : "No limit"} /><Detail label="Check-in" value={text(details, "checkInTime")} /><Detail label="Check-out" value={text(details, "checkOutTime")} /><Detail label="Cleaning Charges" value={amount(details, "cleaningCharges") ? currency(amount(details, "cleaningCharges")!) : "None"} /></dl>
      {text(details, "houseRules", "") && <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700"><strong>House Rules:</strong> {text(details, "houseRules", "")}</p>}
    </>}

    <Amenities values={amenities} />
    {showOwnerContacts && <section className="mt-6 border-t border-rose-100 pt-5"><h3 className="text-sm font-bold text-[#A71930]">Owner Contact (Admin Only)</h3><dl className="mt-3 grid gap-4 sm:grid-cols-3"><Detail label="Owner Name" value={listing.ownerName} /><Detail label="Owner Mobile" value={listing.ownerMobile} /><Detail label="Owner Email" value={listing.ownerEmail} /></dl></section>}
  </div>;
}
