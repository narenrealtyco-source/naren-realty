import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createSupabaseServerClient } from "../../lib/supabase-server";
import CollectionPartnerLogoutButton from "./logout-button";

export const metadata = { title: "Collection Partner Dashboard | MFIT Healthcare" };

export default async function CollectionPartnerDashboardPage() {
  await connection();
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/collection-partner/login");

  const { data: profile, error: profileError } = await supabase
    .from("profiles").select("role,full_name").eq("id", user.id).maybeSingle();
  if (profileError || profile?.role !== "collection_partner") redirect("/collection-partner/login");

  const { data: partner, error: partnerError } = await supabase
    .from("health_collection_partners")
    .select("id,display_name,contact_name,email,phone,service_areas,is_active,verified_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (partnerError || !partner || partner.is_active !== true) redirect("/collection-partner/login");

  const areas = Array.isArray(partner.service_areas) ? partner.service_areas : [];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#0b7778] p-5 text-white sm:p-6">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] text-teal-100">MFIT HEALTHCARE</p>
            <h1 className="mt-1 text-2xl font-extrabold">Collection Partner Dashboard</h1>
            <p className="mt-1 text-sm text-teal-50">Partner operations portal</p>
          </div>
          <CollectionPartnerLogoutButton />
        </header>

        <section className="mt-5 rounded-2xl border border-teal-100 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#0b7778]">Active partner account</p>
              <h2 className="mt-1 text-xl font-extrabold text-[#18343b]">{partner.display_name}</h2>
              <p className="mt-1 text-sm text-slate-600">Welcome, {partner.contact_name || profile.full_name || user.email}.</p>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">Active</span>
          </div>
          <dl className="mt-5 grid gap-4 border-t pt-4 text-sm sm:grid-cols-2">
            <div><dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Registered email</dt><dd className="mt-1 break-all">{partner.email || user.email}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Contact number</dt><dd className="mt-1">{partner.phone || "—"}</dd></div>
            <div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Service areas</dt><dd className="mt-1">{areas.length ? areas.join(", ") : "Not specified"}</dd></div>
          </dl>
        </section>

        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-extrabold text-[#18343b]">Bookings & Reports</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Your partner account is verified and active. Booking and report records will be shown here when assigned to this partner.</p>
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            <strong>Report access policy:</strong> Only MFIT-admin-approved reports can be downloaded. Report access remains locked until your B2B payment to MFIT Healthcare is fully confirmed. Customer-to-partner payment does not unlock reports.
          </div>
        </section>

        <footer className="mt-6 text-center text-xs text-slate-500">
          Need assistance? Contact MFIT Healthcare support. <Link href="/collection-partner/apply" className="font-semibold text-[#0b7778] underline">Partner information</Link>
        </footer>
      </div>
    </main>
  );
}
