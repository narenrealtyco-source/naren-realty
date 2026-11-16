import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "../../lib/supabase-server";

export default function GoogleFormRequirementsPage() {
  return <Suspense fallback={<main className="p-6">Loading Google Form requirements…</main>}><GoogleFormRequirementsContent /></Suspense>;
}

async function GoogleFormRequirementsContent() {
  let supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"];
  try { ({ supabase } = await requireAdmin()); }
  catch { return <main className="p-6"><p>Admin authorization is required.</p><Link href="/admin/login" className="underline">Admin login</Link></main>; }

  const { data, error } = await supabase
    .from("google_form_property_requirements")
    .select("id,response_id,customer_name,customer_phone,customer_email,requirement_type,preferred_location,preferred_bhk,min_budget,max_budget,status,match_count,matched_property_ids,created_at")
    .order("created_at", { ascending: false }).limit(200);

  if (error) return <main className="p-6"><Link href="/admin" className="underline">← Admin</Link><h1 className="mt-5 text-2xl font-bold">Google Form Requirements</h1><p role="alert" className="mt-4">Requirements could not be loaded. Check the database migration and admin permissions.</p></main>;

  const money = (value: number | null) => value === null ? "—" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
  return <main className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-8">
    <div className="mx-auto max-w-7xl">
      <Link href="/admin" className="text-sm font-semibold underline">← Admin Dashboard</Link>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-bold">Google Form Requirements</h1><p className="mt-1 text-sm text-slate-600">Tenant leads imported from Google Forms, with approved property matches.</p></div><span className="rounded-full bg-white px-3 py-2 text-sm font-semibold shadow-sm">{data?.length ?? 0} recent requirements</span></div>
      {(!data || data.length === 0) ? <div className="mt-6 rounded-xl border bg-white p-6 text-sm text-slate-600">No Google Form requirements received yet. Connect the Google Sheet Apps Script webhook to start receiving tenant responses.</div> :
      <div className="mt-6 overflow-x-auto rounded-xl border bg-white shadow-sm"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="bg-slate-100 text-xs uppercase text-slate-600"><tr>{["Tenant","Contact","Requirement","Budget","Status","Matches","Received"].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody>{data.map((item) => <tr key={item.id} className="border-t align-top"><td className="px-4 py-3 font-semibold">{item.customer_name}<div className="mt-1 text-xs font-normal text-slate-500">{item.customer_email ?? "No email"}</div></td><td className="px-4 py-3">{item.customer_phone}</td><td className="px-4 py-3">{item.requirement_type === "rent" ? "Rental" : "Purchase"} · {item.preferred_location}{item.preferred_bhk ? ` · ${item.preferred_bhk} BHK` : ""}</td><td className="px-4 py-3">{money(item.min_budget)} – {money(item.max_budget)}</td><td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold">{item.status}</span></td><td className="px-4 py-3">{item.match_count} {item.matched_property_ids?.length ? <span className="text-xs text-slate-500">IDs saved</span> : ""}</td><td className="px-4 py-3 whitespace-nowrap">{new Date(item.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td></tr>)}</tbody></table></div>}
      <p className="mt-4 text-xs text-slate-500">Tenant contact details are visible only inside the authenticated Admin area. Matching currently considers approved rental/resale listings, locality, budget and BHK where listing data is available.</p>
    </div>
  </main>;
}
