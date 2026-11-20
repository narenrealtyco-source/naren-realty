import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { requireAdmin } from "../../../lib/supabase-server";
import { bulkImportHealthCatalog, updateHealthCatalogItem, updateHealthPackageTests } from "../actions";

export const metadata={title:"MFIT Catalogue Management"};
async function HealthCatalogAdminPageContent(){
  await connection();
 const {supabase}=await requireAdmin();
 const [{data,error},{data:mappings}]=await Promise.all([
  supabase.from("health_catalog_items").select("id,slug,item_type,title,category,description,inclusions,sample_type,preparation,report_tat,report_tat_hours,price,mrp,is_active,provider_verified,price_source,price_checked_at").order("item_type").order("category").order("title"),
  supabase.from("health_package_test_items").select("package_id,test_id,sort_order")
 ]);
 if(error) throw new Error("Could not load MFIT catalogue.");
 const rows=data||[];
 const testSlugById=new Map(rows.filter(x=>x.item_type==="test").map(x=>[x.id,x.slug]));
 const mappedByPackage=new Map<string,string[]>();
 for(const mapping of mappings||[]){const slug=testSlugById.get(mapping.test_id);if(slug)(mappedByPackage.get(mapping.package_id)|| (mappedByPackage.set(mapping.package_id,[]),mappedByPackage.get(mapping.package_id)!)).push(slug);}

 const packages=rows.filter(x=>x.item_type==="package").length;
 const tests=rows.filter(x=>x.item_type==="test").length;
 const scans=rows.filter(x=>x.item_type==="scan").length;
 return <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900"><div className="mx-auto max-w-6xl">
 <Link href="/admin/health" className="text-sm font-semibold text-slate-600">‹ MFIT Admin</Link>
 <header className="mt-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-teal-700">MFIT Healthcare</p><h1 className="mt-1 text-2xl font-extrabold">Packages & Tests Catalogue</h1><p className="mt-1 text-sm text-slate-500">One-time bulk import plus individual price and publish controls.</p></div><span className="rounded-xl bg-white px-4 py-3 text-xs font-bold shadow-sm">{packages} packages · {tests} tests · {scans} scans</span></header>
 <section className="mt-5 rounded-2xl border bg-white p-5"><h2 className="font-extrabold">Bulk catalogue import</h2><p className="mt-1 text-xs leading-5 text-slate-500">Paste a JSON array. Imported items are saved as drafts; Admin can set or adjust prices before publishing.</p><form action={bulkImportHealthCatalog} className="mt-3"><textarea name="catalog_json" required rows={8} placeholder='[{"slug":"cbc","item_type":"test","title":"Complete Blood Count","category":"Blood","description":"...","inclusions":["Haemoglobin"],"sample_type":"Blood","preparation":"Confirm with lab","report_tat":"To be confirmed"}]' className="w-full rounded-xl border p-3 font-mono text-xs" /><button className="mt-3 rounded-xl bg-[#087f82] px-5 py-3 text-sm font-bold text-white">Import all catalogue items</button></form></section>
 <section className="mt-6 space-y-3">{rows.map(item=><details key={item.slug} className="rounded-2xl border bg-white p-4"><summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2"><span><span className="mr-2 rounded-full bg-teal-50 px-2 py-1 text-[10px] font-bold uppercase text-teal-800">{item.item_type}</span><b>{item.title}</b><span className="ml-2 text-xs text-slate-500">{item.category}</span></span><span className="text-xs text-slate-500">{item.is_active?"Published":"Draft"} · {item.provider_verified?"Panel verified":"Panel not verified"}</span></summary>
 <form action={updateHealthCatalogItem} className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2"><input type="hidden" name="slug" value={item.slug}/><label className="text-xs font-semibold">Price (INR)<input name="price" type="number" min="0" step="0.01" defaultValue={item.price??""} className="mt-1 w-full rounded-lg border p-2"/></label><label className="text-xs font-semibold">MRP (INR)<input name="mrp" type="number" min="0" step="0.01" defaultValue={item.mrp??""} className="mt-1 w-full rounded-lg border p-2"/></label><label className="text-xs font-semibold sm:col-span-2">Description<textarea name="description" rows={2} defaultValue={item.description||""} className="mt-1 w-full rounded-lg border p-2"/></label><label className="text-xs font-semibold">Sample type<input name="sample_type" defaultValue={item.sample_type||""} className="mt-1 w-full rounded-lg border p-2"/></label><label className="text-xs font-semibold">Report TAT description<input name="report_tat" defaultValue={item.report_tat||""} className="mt-1 w-full rounded-lg border p-2"/></label><label className="text-xs font-semibold">Report TAT (hours, 24×7)<input name="report_tat_hours" type="number" min="0.25" max="720" step="0.25" defaultValue={item.report_tat_hours??""} placeholder="e.g. 6, 12, 24" className="mt-1 w-full rounded-lg border p-2"/><small className="mt-1 block text-slate-500">Deadline starts when MFIT Lab confirms sample receipt. Weekends and holidays included.</small></label><label className="text-xs font-semibold sm:col-span-2">Preparation<textarea name="preparation" rows={2} defaultValue={item.preparation||""} className="mt-1 w-full rounded-lg border p-2"/></label><p className="text-[11px] text-slate-500 sm:col-span-2">Price source: {item.price_source||"Not recorded"} · Last checked: {item.price_checked_at?new Date(item.price_checked_at).toLocaleDateString("en-IN"):"—"}</p><label className="flex items-center gap-2 text-xs"><input type="checkbox" name="provider_verified" defaultChecked={item.provider_verified}/> MFIT panel verified</label><label className="flex items-center gap-2 text-xs"><input type="checkbox" name="is_active" defaultChecked={item.is_active}/> Publish to customer catalogue</label><div className="sm:col-span-2"><button className="rounded-lg bg-[#087f82] px-4 py-2 text-xs font-bold text-white">Save item</button></div></form>
 {item.item_type==="package"&&<form action={updateHealthPackageTests} className="mt-4 rounded-xl border border-teal-100 bg-teal-50/40 p-3"><input type="hidden" name="package_slug" value={item.slug}/><label className="block text-xs font-bold text-teal-900">Exact single-test slugs included in this package (one per line)<textarea name="test_slugs" rows={4} defaultValue={(mappedByPackage.get(item.id)||[]).join("\n")} placeholder="cbc-complete-blood-count&#10;hba1c&#10;lipid-profile" className="mt-2 w-full rounded-lg border bg-white p-2 font-mono text-xs"/></label><p className="mt-1 text-[10px] leading-4 text-slate-500">Only existing single-test slugs are accepted. MFIT Admin controls final panel verification.</p><button className="mt-2 rounded-lg border border-teal-700 px-4 py-2 text-xs font-bold text-teal-800">Save package test mapping</button></form>}
 <p className="mt-2 text-[10px] text-slate-400">Slug: {item.slug} · Included markers: {(item.inclusions||[]).join(", ")||"Not yet specified"}</p></details>)}</section>
 </div></main>;
}

export default function HealthCatalogAdminPage() {
  return <Suspense fallback={<main className="min-h-screen bg-slate-50 p-8 text-center text-sm text-slate-500">Loading MFIT Healthcare admin…</main>}><HealthCatalogAdminPageContent /></Suspense>;
}
