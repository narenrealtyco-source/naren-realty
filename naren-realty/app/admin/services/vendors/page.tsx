import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "../../../lib/supabase-server";
import { vendorMarketplaceReady, type MarketplaceCategory } from "../../../lib/vendor-marketplace";
import { CategoryForm, CategoryToggle, CategoryPriceForm, MarkLeadPaidForm, ReviewForm } from "./Forms";

type Application = { id: string; business_name: string; public_name: string; category_id: string; contact_person: string; mobile: string; email: string | null; services: string; description: string; city: string; locality: string; address: string; admin_notes: string | null; status: string };
type Enquiry = { id: string; vendor_id: string; customer_name: string; locality: string; message: string; status: string; payment_status: string; payment_reference: string | null; created_at: string };

export default function MarketplaceAdminPage() {
  return <Suspense fallback={<main className="p-5">Loading marketplace...</main>}><Content /></Suspense>;
}
async function Content() {
  let supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"];
  try { ({ supabase } = await requireAdmin()); }
  catch { return <main className="p-5"><p role="alert">Admin authorization is required.</p><Link className="underline" href="/admin/login">Admin login</Link></main>; }
  if (!vendorMarketplaceReady()) return <main className="p-5"><Link href="/admin/services" className="underline">Home Services</Link><h1 className="mt-4 text-2xl font-bold">Service providers</h1><p role="status" className="mt-3">Marketplace management is unavailable until secure database setup is verified.</p></main>;
  const [categoryResult, applicationResult, vendorResult, enquiryResult, contactResult] = await Promise.all([
    supabase.from("service_categories").select("id,name,slug,active,lead_unlock_price").order("name"),
    supabase.from("service_vendor_applications").select("id,business_name,public_name,category_id,contact_person,mobile,email,services,description,city,locality,address,admin_notes,status").order("created_at", { ascending: false }).limit(100),
    supabase.from("service_vendors").select("id,application_id,active,business_name").limit(1000),
    supabase.from("vendor_enquiries").select("id,vendor_id,customer_name,locality,message,status,payment_status,payment_reference,created_at").order("created_at", { ascending: false }).limit(100),
    supabase.rpc("admin_list_vendor_lead_contacts"),
  ]);
  const errors = [categoryResult.error, applicationResult.error, vendorResult.error, enquiryResult.error, contactResult.error].filter(Boolean);
  if (errors.length) {
    console.error("[vendor] Admin lookup failed", errors.map((error) => ({ code: error?.code })));
    return <main className="p-5"><Link href="/admin/services" className="underline">Home Services</Link><p role="alert" className="mt-4">Marketplace data could not be loaded.</p></main>;
  }
  const categories: MarketplaceCategory[] = categoryResult.data ?? [];
  const applications: Application[] = applicationResult.data ?? [];
  const enquiries: Enquiry[] = enquiryResult.data ?? [];
  const vendors = vendorResult.data ?? [];
  const contacts = new Map((contactResult.data ?? []).map((contact: any) => [contact.enquiry_id, contact]));
  return <main className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-8"><div className="mx-auto max-w-5xl">
    <Link href="/admin/services" className="underline">← Home Services</Link><h1 className="mt-4 text-3xl font-bold text-[#10243A]">Service provider management</h1>
    <section className="mt-6 rounded-xl border bg-white p-4"><h2 className="text-xl font-bold">Categories</h2><div className="mt-4 max-w-md"><CategoryForm /></div><div className="mt-5 space-y-3">{categories.map((c) => <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 border-t pt-3"><div className="min-w-0"><span>{c.name} ({c.active ? "active" : "inactive"})</span><p className="text-xs text-slate-500">Lead unlock: ₹{Number(c.lead_unlock_price ?? 0).toLocaleString("en-IN")}</p><CategoryPriceForm id={c.id} price={Number(c.lead_unlock_price ?? 0)}/></div><CategoryToggle key={`${c.id}-${c.active}-${c.name}`} id={c.id} active={c.active} name={c.name} /></div>)}</div></section>
    <section className="mt-6"><h2 className="text-xl font-bold">Applications</h2>{applications.length === 0 && <p className="mt-3">No applications yet.</p>}
      <div className="mt-3 space-y-3">{applications.map((a) => <article key={a.id} className="rounded-xl border bg-white p-4 [overflow-wrap:anywhere]">
        <h3 className="font-bold">{a.public_name} · {a.business_name}</h3><p className="mt-1 text-sm">{categories.find((c) => c.id === a.category_id)?.name ?? "Category unavailable"} · {a.status}{a.status === "approved" && ` · ${vendors.find((v) => v.application_id === a.id)?.active ? "active" : "inactive"}`}</p>
        <p className="mt-2 text-sm"><strong>Contact:</strong> {a.contact_person} · {a.mobile}{a.email && ` · ${a.email}`}</p>
        <p className="mt-2 text-sm"><strong>Location:</strong> {a.locality}, {a.city}</p><p className="mt-2 text-sm"><strong>Services:</strong> {a.services}</p><p className="mt-2 whitespace-pre-wrap text-sm">{a.description}</p>
        <ReviewForm key={`${a.id}-${a.status}-${a.admin_notes}`} id={a.id} status={a.status} notes={a.admin_notes ?? ""} />
      </article>)}</div>{applications.length === 100 && <p className="mt-3 text-sm">Showing the latest 100 applications.</p>}
    </section>
    <section className="mt-6"><h2 className="text-xl font-bold">Vendor enquiries & lead payments</h2>{enquiries.length === 0 && <p className="mt-3">No enquiries yet.</p>}
      <div className="mt-3 space-y-3">{enquiries.map((e) => <article key={e.id} className="rounded-xl border bg-white p-4 [overflow-wrap:anywhere]"><h3 className="font-bold">{vendors.find((v) => v.id === e.vendor_id)?.business_name ?? "Service provider enquiry"}</h3><p className="mt-1 text-sm">{e.customer_name} · {e.locality}</p><p className="mt-2 whitespace-pre-wrap text-sm">{e.message}</p>{(() => { const contact = contacts.get(e.id) as any; return contact ? <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm"><p><strong>Customer:</strong> {contact.customer_name}</p><p><strong>Mobile:</strong> {contact.mobile}</p><p><strong>Locality:</strong> {contact.locality}</p><p><strong>Address:</strong> {contact.full_address}</p><p><strong>Requirement:</strong> {contact.message}</p><div className="mt-2 flex gap-2"><a className="underline" href={"tel:"+contact.mobile}>Call</a><a className="font-semibold text-emerald-700 underline" target="_blank" rel="noreferrer" href={"https://wa.me/"+contact.mobile.replace(/\\D/g,"").replace(/^0+/,"").replace(/^([6-9]\\d{9})$/,"91$1")}>WhatsApp</a></div></div> : null; })()}<p className="mt-2 text-sm">{e.status} · {e.created_at}</p><MarkLeadPaidForm key={`${e.id}-${e.payment_status}-${e.payment_reference}`} id={e.id} paymentStatus={e.payment_status} reference={e.payment_reference} /></article>)}</div>{enquiries.length === 100 && <p className="mt-3 text-sm">Showing the latest 100 enquiries.</p>}
    </section>
  </div></main>;
}
