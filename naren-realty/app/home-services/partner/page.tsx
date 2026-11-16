import Link from "next/link";
import { createSupabaseServerClient } from "../../lib/supabase-server";

type Lead = { id: string; vendor_id: string; status: string; payment_status: string; payment_reference: string | null; created_at: string };
type Contact = { customer_name: string; mobile: string; full_address: string; locality: string; message: string };

function whatsapp(mobile: string, message: string) {
  const phone = mobile.replace(/\D/g, "").replace(/^0+/, "");
  const normalized = phone.length === 10 ? "91" + phone : phone;
  return "https://wa.me/" + normalized + "?text=" + encodeURIComponent(message);
}

export default async function ServicePartnerDashboard() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return <main className="p-6"><h1 className="text-2xl font-bold">Service Partner Login</h1><p className="mt-2">Please sign in to your NAREN REALTY account.</p><Link className="mt-3 inline-block underline" href="/account#login">Sign in</Link></main>;

  const { data: vendors, error } = await supabase.from("service_vendors")
    .select("id,public_name,business_name,services,city,locality,active,service_categories(name,lead_unlock_price)")
    .eq("user_id", user.id).order("created_at", { ascending: false });
  if (error) return <main className="p-6"><p role="alert">Partner account could not be loaded.</p></main>;
  const activeVendors = vendors ?? [];
  if (!activeVendors.length) return <main className="min-h-screen bg-slate-50 p-5"><div className="mx-auto max-w-3xl rounded-2xl bg-white p-6"><h1 className="text-2xl font-bold text-[#10243A]">NAREN REALTY Service Partner</h1><p className="mt-3 text-slate-600">No approved service partner profile is linked to this login yet.</p><Link className="mt-4 inline-block underline" href="/home-services/register">Apply as a service provider</Link></div></main>;

  const ids = activeVendors.map(v => v.id);
  const { data: leads, error: leadError } = await supabase.from("vendor_enquiries")
    .select("id,vendor_id,status,payment_status,payment_reference,created_at")
    .in("vendor_id", ids).order("created_at", { ascending: false }).limit(200);
  if (leadError) return <main className="p-6"><p role="alert">Your leads could not be loaded.</p></main>;

  const contacts = new Map<string, Contact>();
  for (const lead of (leads ?? []) as Lead[]) {
    if (lead.payment_status !== "paid") continue;
    const { data } = await supabase.rpc("get_unlocked_vendor_lead_contact", { p_enquiry_id: lead.id });
    const row = Array.isArray(data) ? data[0] : data;
    if (row?.mobile) contacts.set(lead.id, row as Contact);
  }

  return <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6"><div className="mx-auto max-w-4xl">
    <header className="rounded-2xl bg-[#10243A] p-5 text-white"><p className="text-xs font-bold tracking-widest text-amber-300">NAREN REALTY</p><h1 className="mt-1 text-2xl font-bold">Service Partner Dashboard</h1><p className="mt-1 text-sm text-slate-300">Your approved services and customer leads</p></header>
    <section className="mt-5 grid gap-3 sm:grid-cols-2">{activeVendors.map(v => <article key={v.id} className="rounded-xl border bg-white p-4"><h2 className="font-bold">{v.public_name}</h2><p className="text-sm text-slate-600">{v.business_name}</p><p className="mt-2 text-sm">{v.services}</p><p className="mt-1 text-xs text-slate-500">{v.locality}, {v.city}</p><p className="mt-2 text-sm font-semibold">Lead unlock: ₹{Number((v.service_categories as any)?.lead_unlock_price ?? 0).toLocaleString("en-IN")}</p><span className={v.active ? "text-xs font-semibold text-emerald-700" : "text-xs text-slate-500"}>{v.active ? "Active" : "Inactive"}</span></article>)}</section>
    <section className="mt-7"><h2 className="text-xl font-bold text-[#10243A]">Customer Leads ({(leads ?? []).length})</h2>{!leads?.length ? <p className="mt-3 rounded-xl border bg-white p-5 text-slate-600">No leads yet. New customer enquiries will appear here.</p> : <div className="mt-3 space-y-3">{(leads as Lead[]).map(lead => { const contact=contacts.get(lead.id); const vendor=activeVendors.find(v=>v.id===lead.vendor_id); const price=Number((vendor?.service_categories as any)?.lead_unlock_price ?? 0); return <article key={lead.id} className="rounded-xl border bg-white p-4"><div className="flex flex-wrap justify-between gap-2"><div><h3 className="font-bold">{vendor?.business_name ?? "Service lead"}</h3><p className="text-xs text-slate-500">{new Date(lead.created_at).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Kolkata"})}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{lead.payment_status === "paid" ? "Unlocked" : "Contact locked"}</span></div>{contact ? <div className="mt-3 space-y-1 text-sm"><p><strong>Customer:</strong> {contact.customer_name}</p><p><strong>Mobile:</strong> {contact.mobile}</p><p><strong>Locality:</strong> {contact.locality}</p><p><strong>Address:</strong> {contact.full_address}</p><p className="whitespace-pre-wrap"><strong>Requirement:</strong> {contact.message}</p><div className="mt-3 flex flex-wrap gap-2"><a className="rounded-lg bg-[#10243A] px-4 py-2 text-sm font-semibold text-white" href={"tel:"+contact.mobile}>Call customer</a><a className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white" target="_blank" rel="noreferrer" href={whatsapp(contact.mobile,"Hello "+contact.customer_name+", I am contacting you about your home service enquiry with NAREN REALTY.")}>WhatsApp customer</a></div></div> : <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600"><p>Customer name, number, address and full requirement remain private until payment is verified by NAREN REALTY Admin.</p><p className="mt-2 font-semibold text-[#10243A]">Lead unlock charge: ₹{price.toLocaleString("en-IN")}</p><p className="mt-1 text-xs">Contact Admin for payment instructions. Do not send money to an unverified account.</p></div>}</article>; })}</div>}</section>
    <p className="mt-6 text-xs text-slate-500">Customer contact details are shown only after the lead has been marked paid by NAREN REALTY Admin.</p>
  </div></main>;
}
