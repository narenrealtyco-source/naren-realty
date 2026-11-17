import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../../../lib/supabase-server";
import { respondToVendorLead } from "../../../home-services/vendor-actions";

type VendorLead = {
  id: string;
  customer_name: string;
  locality: string;
  contact?: { mobile: string; full_address: string } | null;
  message: string;
  status: "new" | "contacted" | "closed" | "cancelled";
  payment_status: "pending" | "paid" | "waived" | "refunded";
  created_at: string;
};

export default async function VendorDashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/account#login");

  const { data: vendors, error: vendorError } = await supabase
    .from("service_vendors")
    .select("id,business_name,active")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (vendorError) {
    return <main className="min-h-screen bg-slate-50 p-5"><p role="alert">Your service partner account could not be loaded.</p></main>;
  }

  const activeVendors = vendors ?? [];
  if (activeVendors.length === 0) {
    const { data: applications } = await supabase
      .from("service_vendor_applications")
      .select("id,business_name,status,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    return <main className="min-h-screen bg-slate-50 p-5 text-slate-900"><div className="mx-auto max-w-3xl rounded-2xl border bg-white p-6">
      <Link href="/home-services" className="text-sm underline">← Home Services</Link>
      <h1 className="mt-4 text-2xl font-bold text-[#10243A]">Service Partner Dashboard</h1>
      <p className="mt-3 text-slate-600">Your application is not yet approved for an active public listing.</p>
      <div className="mt-4 space-y-2">{(applications ?? []).map((app) => <p key={app.id} className="rounded-lg bg-slate-50 p-3 text-sm">{app.business_name} · {app.status}</p>)}</div>
      <Link href="/home-services/register" className="mt-5 inline-block font-semibold underline">View registration</Link>
    </div></main>;
  }

  const { data, error } = await supabase.rpc("get_vendor_enquiries");
  if (error) {
    console.error("[vendor] Dashboard lead lookup failed", { code: error.code });
    return <main className="min-h-screen bg-slate-50 p-5"><p role="alert">Service leads could not be loaded. Please refresh or contact NAREN REALTY.</p></main>;
  }
  const rawLeads = (Array.isArray(data) ? data : []) as Omit<VendorLead, "contact">[];
  const leads: VendorLead[] = await Promise.all(rawLeads.map(async (lead) => {
    if (lead.payment_status !== "paid" && lead.payment_status !== "waived") return { ...lead, contact: null };
    const { data: contactRows, error: contactError } = await supabase.rpc("get_unlocked_vendor_lead_contact", { p_enquiry_id: lead.id });
    if (contactError) {
      console.error("[vendor] Paid lead contact lookup failed", { code: contactError.code });
      return { ...lead, contact: null };
    }
    const contact = Array.isArray(contactRows) ? contactRows[0] : null;
    return { ...lead, contact: contact ? { mobile: contact.mobile, full_address: contact.full_address } : null };
  }));

  return <main className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-8"><div className="mx-auto max-w-4xl">
    <Link href="/home-services" className="text-sm font-semibold underline">← Home Services</Link>
    <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">NAREN REALTY · SERVICE PARTNER</p>
    <h1 className="mt-2 text-3xl font-bold text-[#10243A]">Service Partner Dashboard</h1>
    <div className="mt-4 rounded-xl border bg-white p-4"><p className="font-semibold">Your approved business profiles</p><ul className="mt-2 space-y-1 text-sm text-slate-600">{activeVendors.map((vendor) => <li key={vendor.id}>{vendor.business_name}</li>)}</ul></div>
    <h2 className="mt-8 text-xl font-bold">Service Leads</h2>
    {leads.length === 0 ? <p className="mt-3 rounded-xl border bg-white p-6 text-sm text-slate-600">No service leads yet. New matching requests will appear here.</p> :
      <div className="mt-4 space-y-4">{leads.map((lead) => <article key={lead.id} className="rounded-xl border bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold text-[#10243A]">{lead.customer_name}</h3><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{lead.status}</span></div>
        <p className="mt-2 text-sm text-slate-600">{lead.locality} · {new Date(lead.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</p>
        <p className="mt-3 whitespace-pre-wrap text-sm">{lead.message}</p>
        <p className="mt-3 text-xs text-slate-500">Lead payment: {lead.payment_status}</p>
        {lead.contact ? <div className="mt-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900"><p className="font-semibold">Customer mobile: {lead.contact.mobile}</p><p className="mt-1">Address: {lead.contact.full_address}</p></div> : <p className="mt-2 text-xs text-slate-500">Customer mobile and full address unlock after the lead payment is marked paid by NAREN REALTY Admin.</p>}
        {lead.status === "new" && <form action={respondToVendorLead} className="mt-4 flex flex-wrap gap-2">
          <input type="hidden" name="enquiry_id" value={lead.id} />
          <button name="decision" value="accept" className="min-h-11 rounded-lg bg-[#10243A] px-5 font-semibold text-white">Accept Lead</button>
          <button name="decision" value="decline" className="min-h-11 rounded-lg border border-slate-300 px-5 font-semibold text-slate-700">Decline</button>
        </form>}
      </article>)}</div>}
  </div></main>;
}
