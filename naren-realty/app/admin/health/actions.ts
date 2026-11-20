"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../lib/supabase-server";

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

export async function updateHealthBooking(formData: FormData) {
  const id=String(formData.get("order_id")||"");
  const status=String(formData.get("fulfilment_status")||"");
  const allowed=new Set(["new_booking","confirmed","collection_scheduled","sample_collected","processing","report_ready","completed","cancelled"]);
  if(!id || !allowed.has(status)) throw new Error("Invalid booking update.");
  const collectionDate=String(formData.get("collection_date")||"").trim();
  const collectionSlot=String(formData.get("collection_slot")||"").trim();
  const notes=String(formData.get("admin_notes")||"").slice(0,3000);
  if(status==="collection_scheduled" && (!/^\\d{4}-\\d{2}-\\d{2}$/.test(collectionDate)||!collectionSlot)) throw new Error("Collection date and slot are required.");
  const {supabase,user}=await requireAdmin();
  const {data:before,error:readError}=await supabase.from("health_orders").select("fulfilment_status").eq("id",id).single();
  if(readError) throw new Error("Booking not found.");
  const update:any={fulfilment_status:status,admin_notes:notes,updated_at:new Date().toISOString()};
  if(collectionDate) update.collection_date=collectionDate;
  if(collectionSlot) update.collection_slot=collectionSlot;
  if(status==="report_ready") update.report_ready_at=new Date().toISOString();
  if(status==="cancelled") update.cancelled_at=new Date().toISOString();
  const {error}=await supabase.from("health_orders").update(update).eq("id",id);
  if(error) throw new Error("Could not update booking: "+error.message);
  await supabase.from("health_order_status_history").insert({order_id:id,from_status:before.fulfilment_status,to_status:status,note:notes||null,changed_by:user.id});
  revalidatePath("/admin/health");
  revalidatePath("/admin/health/bookings");
}

export async function addHealthCollectionSlot(formData: FormData) {
  const service_area=String(formData.get("service_area")||"").trim();
  const collection_date=String(formData.get("collection_date")||"");
  const slot_label=String(formData.get("slot_label")||"").trim();
  const capacity=Number(formData.get("capacity")||1);
  if(!service_area||!/\\d{4}-\\d{2}-\\d{2}/.test(collection_date)||!slot_label||!Number.isInteger(capacity)||capacity<1||capacity>100) throw new Error("Enter valid collection slot details.");
  const {supabase}=await requireAdmin();
  const {error}=await supabase.from("health_collection_slots").insert({service_area,collection_date,slot_label,capacity,is_active:false});
  if(error) throw new Error("Could not create slot: "+error.message);
  revalidatePath("/admin/health/slots");
}

export async function addHealthLabPartner(formData: FormData) {
  const name=String(formData.get("name")||"").trim();
  const contact_name=String(formData.get("contact_name")||"").trim();
  const phone=String(formData.get("phone")||"").replace(/\\D/g,"").slice(-10);
  const email=String(formData.get("email")||"").trim();
  const service_areas=String(formData.get("service_areas")||"").split(",").map(x=>x.trim()).filter(Boolean).slice(0,50);
  if(name.length<2 || (phone && phone.length!==10) || (email&&!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email))) throw new Error("Enter valid lab partner details.");
  const {supabase}=await requireAdmin();
  const {error}=await supabase.from("health_lab_partners").insert({name,contact_name:contact_name||null,phone:phone||null,email:email||null,service_areas,is_active:false});
  if(error) throw new Error("Could not add lab partner: "+error.message);
  revalidatePath("/admin/health/labs");
}
