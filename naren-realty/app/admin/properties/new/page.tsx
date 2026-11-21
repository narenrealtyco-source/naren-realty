import Link from "next/link";
import { requireAdmin } from "../../../lib/supabase-server";
import PropertyForm from "../PropertyForm";

export const instant = false;

export default async function NewPropertyPage() {
  try { await requireAdmin(); } catch { return <main className="p-4 sm:p-8"><p role="alert">Admin authentication is required.</p><Link href="/admin/login" className="underline">Admin login</Link></main>; }
  return <main className="mx-auto max-w-4xl px-4 py-5 sm:p-5"><Link href="/admin/properties" className="underline">Property Management</Link><h1 className="my-5 text-3xl font-bold">Add Property</h1><PropertyForm /></main>;
}
