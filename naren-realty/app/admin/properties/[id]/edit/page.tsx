import Link from "next/link";
import { requireAdmin } from "../../../../lib/supabase-server";
import { validateSubmissionDetails } from "../../../../lib/submission-details";
import PropertyForm, { type EditProperty } from "../../PropertyForm";

export const instant = false;

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  let supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"];
  try { ({ supabase } = await requireAdmin()); } catch { return <main className="p-4 sm:p-8"><p role="alert">Admin authentication is required.</p><Link href="/admin/login" className="underline">Admin login</Link></main>; }
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return <main className="p-4 sm:p-8" role="alert">Invalid property ID.</main>;
  const { data, error } = await supabase.from("properties").select("id,title,category,locality,price,details,photos").eq("id", id).maybeSingle();
  if (error || !data || data.details?.adminDirect !== true) return <main className="p-4 sm:p-8"><p role="alert">Admin-created property could not be loaded.</p><Link href="/admin/properties" className="underline">Property Management</Link></main>;
  let property: EditProperty;
  try {
    const listing = data.details.publicListing;
    if (!listing || typeof listing.address !== "string" || typeof listing.description !== "string" || typeof listing.carpetArea !== "number" || !Array.isArray(data.photos)) throw new Error("Invalid stored property.");
    if (listing.availabilityConfirmation !== undefined && listing.availabilityConfirmation !== "immediate" && listing.availabilityConfirmation !== "date") throw new Error("Invalid stored availability.");
    property = { id: data.id, title: data.title, category: data.category, locality: data.locality, price: Number(data.price), address: listing.address, description: listing.description, area: listing.carpetArea, details: validateSubmissionDetails(listing.details), photoCount: data.photos.length, availabilityConfirmation: listing.availabilityConfirmation };
  } catch {
    return <main className="p-4 sm:p-8" role="alert">Stored property details are unsupported; editing is disabled to prevent data loss.</main>;
  }
  return <main className="mx-auto max-w-4xl px-4 py-5 sm:p-5"><Link href="/admin/properties" className="underline">Property Management</Link><h1 className="my-5 text-3xl font-bold">Edit Property</h1><PropertyForm property={property} /></main>;
}
