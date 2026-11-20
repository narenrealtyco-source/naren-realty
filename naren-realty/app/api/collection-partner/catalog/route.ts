import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
export async function GET(request:Request){
 const slug=new URL(request.url).searchParams.get("partner");
 if(!slug)return NextResponse.json({error:"Partner not found."},{status:404});
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!key)return NextResponse.json({error:"Unavailable."},{status:503});
 const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,key,{auth:{persistSession:false}});
 const {data:p}=await db.from("health_collection_partners").select("id,display_name,public_slug,service_areas").eq("public_slug",slug).eq("is_active",true).maybeSingle();
 if(!p)return NextResponse.json({error:"Booking page unavailable."},{status:404});
 const {data}=await db.from("health_collection_partner_rates").select("catalog_item_id,b2b_price,customer_price,catalog:health_catalog_items(id,slug,title,item_type,category,description,inclusions,sample_type,preparation,report_tat)").eq("partner_id",p.id).eq("is_active",true);
 return NextResponse.json({partner:{display_name:p.display_name,public_slug:p.public_slug,service_areas:p.service_areas},items:(data||[]).filter(x=>x.catalog).map(x=>({id:x.catalog_item_id,...x.catalog,price:x.customer_price,b2b_price:x.b2b_price}))});
}
