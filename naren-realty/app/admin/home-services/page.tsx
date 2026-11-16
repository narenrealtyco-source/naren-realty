import Link from "next/link";
import { connection } from "next/server";
import { requireAdmin } from "../../lib/supabase-server";
import { markVendorLeadPaid, reviewVendorApplication, updateVendorLeadPrice } from "./actions";

export const instant = false;

type Application = { id: string; business_name: string; public_name: string; contact_person: string; mobile: string; email: string | null; services: string; description: string; city: string; locality: string; address: string; status: string; admin_notes: string | null; created_at: string; service_categories: { name: string } | null };
type Vendor = { id: string; business_name: string; public_name: string; active: boolean; service_categories: { name: string; lead_unlock_price: number } | null };
type Lead = { id: string; vendor_id: string; customer_name: string; locality: string; message: string; payment_status: string; payment_reference: string | null; created_at: string };
type Contact = { enquiry_id: string; customer_name: string; mobile: string; full_address: string; locality: string; message: string };

export default async function AdminHomeServicesPage() {
  await connection();
  let supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"];
  try { ({ supabase } = await requireAdmin()); }
  catch { return <main className="p-6"><p role="alert">Admin authorization is required.</p><Link className="underline" href="/admin/login">Admin login</Link></main>; }

  const [appsResult, vendorsResult, leadsResult, categoriesResult, contactsResult] = await Promise.all([
    supabase.from("service_vendor_applications").select("id,business_name,public_name,contact_person,mobile,email,services,description,city,locality,address,status,admin_notes,created_at,service_categories(name)").order("created_at", { ascending: false }).limit(200),
    supabase.from("service_vendors").select("id,business_name,public_name,active,service_categories(name,lead_unlock_price)").order("created_at", { ascending: false }).limit(200),
    supabase.from("vendor_enquiries").select("id,vendor_id,customer_name,locality,message,payment_status,payment_reference,created_at").order("created_at", { ascending: false }).limit(200),
    supabase.from("service_categories").select("id,name,active,lead_unlock_price").order("name"),
    supabase.rpc("admin_list_vendor_lead_contacts"),
  ]);
  const migrationMissing = Boolean(categoriesResult.error && /lead_unlock_price|column/i.test(categoriesResult.error.message));
  const apps = (appsResult.data ?? []) as unknown as Application[];
  const vendors = (vendorsResult.data ?? []) as unknown as Vendor[];
  const leads = (leadsResult.data ?? []) as unknown as Lead[];
  const contacts = new Map<string, Contact>(((contactsResult.data ?? []) as Contact[]).map((item) => [item.enquiry_id, item]));
  const vendorById = new Map(vendors.map((item) => [item.id, item]));

  return <main className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-8"><div className="mx-auto max-w-5xl">
    <Link href="/admin" className="text-sm font-semibold underline">← Admin dashboard</Link>
    <h1 className="mt-4 text-3xl font-bold text-[#10243A]">Home Services Management</h1>
    <p className="mt-2 text-sm text-slate-600">Review vendor applications, set category lead prices and verify vendor lead payments.</p>
    {migrationMissing && <p role="alert" className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">Database setup pending: secure lead-pricing migration has not been applied. Pricing controls and vendor dashboard may remain unavailable until migration is approved and applied.</p>}
    {appsResult.error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-800">Vendor applications could not be loaded ({appsResult.error.code}).</p>}
    <section className="mt-8"><h2 className="text-xl font-bold">Vendor Applications ({apps.length})</h2>
      {apps.length === 0 ? <p className="mt-3 rounded-xl border bg-white p-4 text-sm text-slate-600">No vendor applications found.</p> : <div className="mt-3 space-y-3">{apps.map((app) => <article key={app.id} className="rounded-xl border bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-bold">{app.business_name}</h3><p className="text-sm text-slate-600">{app.public_name} · {app.service_categories?.name ?? "Service category"}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{app.status}</span></div><p className="mt-2 text-sm">Contact: {app.contact_person} · {app.mobile}{app.email ? " · " + app.email : ""}</p><p className="mt-1 text-sm">{app.services}</p><p className="mt-1 text-sm text-slate-600">{app.locality}, {app.city} · {app.address}</p><p className="mt-2 whitespace-pre-wrap text-sm">{app.description}</p>{app.status === "pending" && <form action={reviewVendorApplication} className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]"><input type="hidden" name="application_id" value={app.id}/><input name="admin_notes" maxLength={1000} placeholder="Optional Admin notes" className="min-w-0 rounded-lg border px-3 py-2 text-sm"/><button name="decision" value="approved" className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">Approve</button><button name="decision" value="rejected" className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white">Reject</button></form>}{app.admin_notes && <p className="mt-2 text-xs text-slate-500">Admin note: {app.admin_notes}</p>}</article>)}</div>}
    </section>
    <section className="mt-8"><h2 className="text-xl font-bold">Category Lead Pricing</h2>{categoriesResult.error ? <p role="alert" className="mt-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Category pricing is unavailable until the pricing migration is applied.</p> : <div className="mt-3 grid gap-3 sm:grid-cols-2">{(categoriesResult.data ?? []).map((category) => <form action={updateVendorLeadPrice} key={category.id} className="flex items-end gap-2 rounded-xl border bg-white p-4"><input type="hidden" name="category_id" value={category.id}/><label className="min-w-0 flex-1 text-sm font-semibold">{category.name}<input name="lead_unlock_price" type="number" min="0" max="1000000" step="0.01" defaultValue={category.lead_unlock_price} className="mt-2 w-full rounded-lg border px-3 py-2 font-normal" required/></label><button className="rounded-lg bg-[#10243A] px-4 py-2.5 text-sm font-semibold text-white">Save</button></form>)}</div>}</section>
    <section className="mt-8"><h2 className="text-xl font-bold">Vendor Leads & Payment Verification ({leads.length})</h2>{contactsResult.error && <p role="alert" className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Private contact lookup is unavailable until the secure vendor privacy migration is applied.</p>}{leads.length === 0 ? <p className="mt-3 rounded-xl border bg-white p-4 text-sm text-slate-600">No vendor enquiries found.</p> : <div className="mt-3 space-y-3">{leads.map((lead) => { const vendor = vendorById.get(lead.vendor_id); const contact = contacts.get(lead.id); return <article key={lead.id} className="rounded-xl border bg-white p-4"><div className="flex flex-wrap justify-between gap-2"><div><h3 className="font-bold">{vendor?.business_name ?? "Service enquiry"}</h3><p className="text-xs text-slate-500">{new Date(lead.created_at).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Kolkata"})}</p></div><span className="text-sm font-semibold">{lead.payment_status}</span></div>{contact ? <div className="mt-2 text-sm"><p>{contact.customer_name} · {contact.mobile}</p><p>{contact.locality} · {contact.full_address}</p><p className="whitespace-pre-wrap">{contact.message}</p></div> : <p className="mt-2 text-sm text-slate-600">Private customer contact details are not available from the secure Admin lookup.</p>}{lead.payment_status !== "paid" && <form action={markVendorLeadPaid} className="mt-3 flex flex-wrap gap-2"><input type="hidden" name="enquiry_id" value={lead.id}/><input name="payment_reference" maxLength={120} placeholder="UPI / bank reference (optional)" className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm"/><button className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">Verify payment & unlock</button></form>}{lead.payment_reference && <p className="mt-2 text-xs text-slate-500">Payment reference: {lead.payment_reference}</p>}</article>; })}</div>}</section>
  </div></main>;
}
