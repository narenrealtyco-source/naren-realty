import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { requireAdmin } from "../../lib/supabase-server";

export const metadata = { title: "MFIT Healthcare Admin | NAREN REALTY" };

async function MfitAdminPageContent() {
  await connection();
  let supabase;
  try { ({ supabase } = await requireAdmin()); } catch { redirect("/admin/login"); }
  const [catalog, orders, partners, slots] = await Promise.all([
    supabase.from("health_catalog_items").select("id,item_type,is_active,provider_verified", { count: "exact" }),
    supabase.from("health_orders").select("id,fulfilment_status", { count: "exact" }),
    supabase.from("health_lab_partners").select("id", { count: "exact" }),
    supabase.from("health_collection_slots").select("id", { count: "exact" }),
  ]);
  const count=(r:{count:number|null,error:unknown})=>r.error? "—":(r.count??0).toLocaleString("en-IN");
  const stats=[
    ["Catalogue items",count(catalog)],
    ["Bookings",count(orders)],
    ["Lab partners",count(partners)],
    ["Collection slots",count(slots)]
  ];
  return <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900">
    <div className="mx-auto max-w-6xl">
      <Link href="/admin" className="text-sm font-semibold text-slate-600">‹ Back to NAREN REALTY Admin</Link>
      <header className="mt-4 rounded-3xl bg-[#0b7778] p-6 text-white">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-teal-100">MFIT Healthcare</p>
        <h1 className="mt-2 text-2xl font-extrabold">Diagnostic Operations</h1>
        <p className="mt-2 max-w-2xl text-sm text-teal-50">Manage diagnostic catalogue, bookings, laboratory partners, sample collection and reports separately from NAREN REALTY property operations.</p>
      </header>
      <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{stats.map(([label,value])=><div key={label} className="rounded-2xl border bg-white p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-extrabold">{value}</p></div>)}</section>
      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ["Packages & Tests","Review catalogue items, update inclusions, prices and verification status","/admin/health/catalog"],
          ["Bookings & Fulfilment","Track booking, collection, sample processing and report status","/admin/health/bookings"],
          ["MFIT Lab Team","Create lab logins, manage collection boys and assignments","/admin/health/team"],
          ["Partner Applications","Review self-service applications and approve verified partner logins","/admin/health/partner-applications"],
          ["Independent Collection Partners","Manage partner booking links, B2B rate cards and settlements","/admin/health/collection-partners"],
          ["Collection Slots","Manage collection areas, dates, capacity and time slots","/admin/health/slots"],
          ["Coupons & Family Discounts","Configure coupon campaigns and family member discounts","/admin/health/coupons"],
          ["Reports","Manage secure diagnostic report records","/admin/health/reports"],
          ["Customer Catalogue","Preview customer-facing packages and tests","/health-checkup/packages"]
        ].map(([title,desc,href])=><Link key={href} href={href} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-400"><h2 className="font-extrabold text-[#126d70]">{title}</h2><p className="mt-2 text-sm leading-5 text-slate-500">{desc}</p><span className="mt-4 inline-block text-xs font-bold text-teal-700">Open →</span></Link>)}
      </section>
      <p className="mt-6 rounded-xl bg-amber-50 p-4 text-xs leading-5 text-amber-900">MFIT runs its own lab workflow. Prices are indicative reference prices and can be edited by Admin. Lab users only see orders assigned to the MFIT team.</p>
    </div>
  </main>;
}

export default function MfitAdminPage() {
  return <Suspense fallback={<main className="min-h-screen bg-slate-50 p-8 text-center text-sm text-slate-500">Loading MFIT Healthcare admin…</main>}><MfitAdminPageContent /></Suspense>;
}
