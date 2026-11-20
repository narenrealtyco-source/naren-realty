import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
export async function GET(request:Request){
 const slug=new URL(request.url).searchParams.get("partner");if(!slug)return NextResponse.json({error:"Partner not found."},{status:404});
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!key)return NextResponse.json({error:"Unavailable."},{status:503});
 const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,key,{auth:{persistSession:false}});
 const {data:p}=await db.from("health_collection_partners").select("id,display_name,public_slug,service_areas").eq("public_slug",slug).eq("is_active",true).maybeSingle();if(!p)return NextResponse.json({error:"Booking page unavailable."},{status:404});
 const [{data:catalog,error:catalogError},{data:rates}]=await Promise.all([
  db.from("health_catalog_items").select("id,slug,title,item_type,category,description,inclusions,sample_type,preparation,report_tat,price").eq("is_active",true).in("item_type",["package","test"]).order("item_type").order("title"),
  db.from("health_collection_partner_rates").select("catalog_item_id,b2b_price,customer_price").eq("partner_id",p.id).eq("is_active",true)
 ]);
 if(catalogError)return NextResponse.json({error:"Unable to load the test catalogue."},{status:500});
 const rateMap=new Map((rates||[]).map(r=>[r.catalog_item_id,r]));
 const items=(catalog||[]).map(x=>{const r=rateMap.get(x.id);const customer=r?.customer_price??x.price;return {id:x.id,slug:x.slug,title:x.title,item_type:x.item_type,category:x.category,description:x.description,inclusions:x.inclusions,sample_type:x.sample_type,preparation:x.preparation,report_tat:x.report_tat,mrp_price:x.price===null?null:Number(x.price),customer_price:customer===null?null:Number(customer),available:customer!==null&&Number(customer)>=0};});
 return NextResponse.json({partner:{display_name:p.display_name,public_slug:p.public_slug,service_areas:p.service_areas},items});
}
