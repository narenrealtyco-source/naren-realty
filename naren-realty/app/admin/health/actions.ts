"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase-server";

export async function bulkImportHealthCatalog(formData: FormData) {
  const raw = String(formData.get("catalog_json") || "");
  if (!raw.trim() || raw.length > 900000) throw new Error("Valid catalogue JSON is required (maximum 900 KB).");
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error("Catalogue JSON is not valid."); }
  if (!Array.isArray(parsed) || parsed.length < 1 || parsed.length > 1000) throw new Error("Import must contain between 1 and 1,000 items.");
  const allowed = new Set(["package","test","scan"]);
  const rows = parsed.map((item: any) => {
    if (!item || typeof item !== "object" || !/^[a-z0-9-]{3,100}$/.test(String(item.slug || "")) || !allowed.has(item.item_type)) {
      throw new Error("Each item needs a valid slug and item_type (package, test or scan).");
    }
    if (!String(item.title || "").trim() || !String(item.category || "").trim()) throw new Error("Every item needs a title and category.");
    return {
      slug: String(item.slug), item_type: item.item_type, title: String(item.title).slice(0,180),
      category: String(item.category).slice(0,80), description: String(item.description || "").slice(0,3000),
      inclusions: Array.isArray(item.inclusions) ? item.inclusions.filter((x: unknown)=>typeof x==="string").slice(0,100) : [],
      sample_type: item.sample_type ? String(item.sample_type).slice(0,200) : null,
      preparation: item.preparation ? String(item.preparation).slice(0,2000) : null,
      report_tat: item.report_tat ? String(item.report_tat).slice(0,200) : "To be confirmed by the processing laboratory",
      price: null, mrp: null, is_active: false, provider_verified: false, updated_at: new Date().toISOString()
    };
  });
  const unique = new Set(rows.map(x=>x.slug));
  if(unique.size!==rows.length) throw new Error("Duplicate slugs found in this import.");
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("health_catalog_items").upsert(rows,{onConflict:"slug"});
  if(error) throw new Error("Catalogue import failed: "+error.message);
  revalidatePath("/admin/health");
  revalidatePath("/admin/health/catalog");
  revalidatePath("/health-checkup/packages");
  revalidatePath("/health-checkup/tests");
}

export async function updateHealthCatalogItem(formData: FormData) {
  const slug=String(formData.get("slug")||"");
  const priceRaw=String(formData.get("price")||"").trim();
  const mrpRaw=String(formData.get("mrp")||"").trim();
  const price=priceRaw===""?null:Number(priceRaw);
  const mrp=mrpRaw===""?null:Number(mrpRaw);
  if(!slug || (price!==null&&(!Number.isFinite(price)||price<0)) || (mrp!==null&&(!Number.isFinite(mrp)||mrp<0))) throw new Error("Invalid item or price.");
  const is_active=formData.get("is_active")==="on";
  const provider_verified=formData.get("provider_verified")==="on";
  if(is_active && (!provider_verified || price===null)) throw new Error("Verify the lab partner and set a confirmed price before publishing.");
  const {supabase}=await requireAdmin();
  const {error}=await supabase.from("health_catalog_items").update({
    price,mrp,is_active,provider_verified,
    description:String(formData.get("description")||"").slice(0,3000),
    preparation:String(formData.get("preparation")||"").slice(0,2000),
    report_tat:String(formData.get("report_tat")||"").slice(0,200),
    sample_type:String(formData.get("sample_type")||"").slice(0,200),
    updated_at:new Date().toISOString()
  }).eq("slug",slug);
  if(error) throw new Error("Could not update catalogue item: "+error.message);
  revalidatePath("/admin/health/catalog");
  revalidatePath("/health-checkup/packages");
  revalidatePath("/health-checkup/tests");
}
