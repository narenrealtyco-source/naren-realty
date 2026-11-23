import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";

const CBC_REFERENCE_PARAMETERS=[
 "Differential Neutrophil Count","Differential Lymphocyte Count","Differential Monocyte Count","Differential Eosinophil Count","Differential Basophil Count",
 "Red Blood Cell (RBC) Count","Haemoglobin (Hb)","Platelet Count","Total Leukocyte Count (TLC)","Hematocrit (HCT)","Mean Corpuscular Volume (MCV)",
 "Mean Corpuscular Haemoglobin (MCH)","Mean Corpuscular Haemoglobin Concentration (MCHC)","Mean Platelet Volume (MPV)","Platelet Distribution Width (PDW)",
 "Red Cell Distribution Width (RDW-CV)","Absolute Lymphocyte Count","Absolute Neutrophil Count","Absolute Basophil Count","Absolute Monocyte Count","Absolute Eosinophil Count"
];
function enrich(item:any){
 const stored=Array.isArray(item.inclusions)?item.inclusions:[];
 const cbc=item.slug==="cbc-complete-blood-count";
 return {...item,inclusions:stored.length?stored:(cbc?CBC_REFERENCE_PARAMETERS:[]),
 inclusionsNote:stored.length?null:(cbc?"Typical 21-parameter CBC reference panel. Exact components vary by laboratory; confirm the performing lab's panel before collection.":"Detailed parameter breakdown has not yet been supplied or verified by the performing laboratory.")};
}
export async function GET(request:Request){
 const slug=new URL(request.url).searchParams.get("partner");if(!slug)return NextResponse.json({error:"Partner not found."},{status:404});
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY,url=process.env.NEXT_PUBLIC_SUPABASE_URL;if(!key||!url)return NextResponse.json({error:"Unavailable."},{status:503});
 const db=createClient(url,key,{auth:{persistSession:false}});
 const {data:p}=await db.from("health_collection_partners").select("id,display_name,public_slug,service_areas").eq("public_slug",slug).eq("is_active",true).maybeSingle();
 if(!p)return NextResponse.json({error:"Booking page unavailable."},{status:404});
 const [{data:catalog,error:catalogError},{data:rates},{data:mappings,error:mappingError}]=await Promise.all([
  db.from("health_catalog_items").select("id,slug,title,item_type,category,description,inclusions,sample_type,preparation,report_tat,price,mrp,is_active,provider_verified").eq("is_active",true).in("item_type",["package","test"]).order("title"),
  db.from("health_collection_partner_rates").select("catalog_item_id,b2b_price,customer_price").eq("partner_id",p.id).eq("is_active",true),
  db.from("health_package_test_items").select("package_id,test_id,sort_order,mapping_status")
 ]);
 if(catalogError||mappingError)return NextResponse.json({error:"Unable to load the health catalogue."},{status:500});
 const byId=new Map((catalog||[]).map(x=>[x.id,x]));
 const packageTests:Record<string,any[]>={};
 for(const m of mappings||[]){const test=byId.get(m.test_id);if(!test)continue;(packageTests[m.package_id]||=[]).push({...enrich(test),mapping_status:m.mapping_status,sort_order:m.sort_order});}
 const rateMap=new Map((rates||[]).map(r=>[r.catalog_item_id,r]));
 const items=(catalog||[]).map(raw=>{
  const x=enrich(raw),rate=rateMap.get(x.id),customer=rate?.customer_price??x.price;
  return {id:x.id,slug:x.slug,title:x.title,item_type:x.item_type,category:x.category,description:x.description,inclusions:x.inclusions,inclusionsNote:x.inclusionsNote,
   sample_type:x.sample_type,preparation:x.preparation,report_tat:x.report_tat,provider_verified:!!x.provider_verified,
   package_tests:(packageTests[x.id]||[]).sort((a,b)=>a.sort_order-b.sort_order||a.title.localeCompare(b.title)),
   mrp_price:(x.mrp??x.price)===null?null:Number(x.mrp??x.price),customer_price:customer===null?null:Number(customer),available:!!x.is_active&&!!x.provider_verified&&customer!==null&&Number.isFinite(Number(customer))&&Number(customer)>=0};
 });
 return NextResponse.json({partner:{display_name:p.display_name,public_slug:p.public_slug,service_areas:p.service_areas},items},{headers:{"Cache-Control":"no-store"}});
}
