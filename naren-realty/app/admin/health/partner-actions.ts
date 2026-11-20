"use server";
import {createClient} from "@supabase/supabase-js";
import {revalidatePath} from "next/cache";
import {requireAdmin} from "../../lib/supabase-server";
function service(){const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!key)throw new Error("Service unavailable.");return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,key,{auth:{persistSession:false}});}
export async function createCollectionPartner(formData:FormData){
 await requireAdmin();
 const display_name=String(formData.get("display_name")||"").trim();
 const contact_name=String(formData.get("contact_name")||"").trim();
 const phone=String(formData.get("phone")||"").replace(/\D/g,"").slice(-10);
 const email=String(formData.get("email")||"").trim().toLowerCase();
 const password=String(formData.get("password")||"");
 const public_slug=String(formData.get("public_slug")||"").trim().toLowerCase().replace(/[^a-z0-9-]/g,"-");
 const service_areas=String(formData.get("service_areas")||"").split(",").map(x=>x.trim()).filter(Boolean);
 if(display_name.length<2||phone.length!==10||!/^\S+@\S+\.\S+$/.test(email)||password.length<10||!/^[a-z0-9][a-z0-9-]{2,49}$/.test(public_slug))throw new Error("Enter valid partner details, 10-digit phone, slug and password (10+ chars).");
 const db=service();
 const {data,error}=await db.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:contact_name||display_name}});
 if(error||!data.user)throw new Error(error?.message||"Could not create partner login.");
 const {error:profileError}=await db.from("profiles").upsert({id:data.user.id,full_name:contact_name||display_name,role:"collection_partner",manager_active:true});
 if(profileError){await db.auth.admin.deleteUser(data.user.id);throw new Error("Could not create partner profile.");}
 const {data:partner,error:insertError}=await db.from("health_collection_partners").insert({user_id:data.user.id,public_slug,display_name,contact_name:contact_name||null,phone,email,service_areas,is_active:true,verified_at:new Date().toISOString()}).select("id").single();
 if(insertError){await db.auth.admin.deleteUser(data.user.id);throw new Error(insertError.message);}
 const {data:items}=await db.from("health_catalog_items").select("id,price").eq("is_active",true).in("item_type",["package","test"]);
 if(items?.length)await db.from("health_collection_partner_rates").insert(items.filter(x=>x.price!==null).map(x=>({partner_id:partner.id,catalog_item_id:x.id,b2b_price:Number(x.price),customer_price:Number(x.price),is_active:true})));
 revalidatePath("/admin/health/collection-partners");
}
export async function updateCollectionPartnerRate(formData:FormData){
 await requireAdmin();
 const partner_id=String(formData.get("partner_id")||"");
 const catalog_item_id=String(formData.get("catalog_item_id")||"");
 const b2b=Number(formData.get("b2b_price"));
 const retail=Number(formData.get("customer_price"));
 if(!partner_id||!catalog_item_id||!Number.isFinite(b2b)||b2b<0||!Number.isFinite(retail)||retail<b2b)throw new Error("Customer price must be equal to or above B2B price.");
 const {error}=await service().from("health_collection_partner_rates").upsert({partner_id,catalog_item_id,b2b_price:b2b,customer_price:retail,is_active:true,updated_at:new Date().toISOString()},{onConflict:"partner_id,catalog_item_id"});
 if(error)throw new Error(error.message);
 revalidatePath("/admin/health/collection-partners");
}
