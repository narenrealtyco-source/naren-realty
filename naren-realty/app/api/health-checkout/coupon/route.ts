import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
export async function POST(request:NextRequest){
 try{
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,service=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!service)return NextResponse.json({error:"Offer service unavailable."},{status:503});
  const body=await request.json(),code=String(body?.code||"").trim().toUpperCase(),slugs=Array.isArray(body?.slugs)?body.slugs:[],familyMember=body?.familyMember===true;
  if((code&&!/^[A-Z0-9_-]{3,30}$/.test(code))||(!code&&!familyMember)||!slugs.length)return NextResponse.json({error:"Select an item and enter a coupon or family member option."},{status:400});
  const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const [{data:coupon,error:couponError},{data:items,error:itemError},{data:familyRule}]=await Promise.all([
   code?db.from("health_coupons").select("*").eq("code",code).eq("is_active",true).maybeSingle():Promise.resolve({data:null,error:null}),
   db.from("health_catalog_items").select("slug,item_type,price,is_active,provider_verified").in("slug",slugs),
   familyMember?db.from("health_discount_rules").select("*").eq("rule_key","family_member").eq("is_active",true).maybeSingle():Promise.resolve({data:null,error:null})
  ]);
  if(couponError||itemError)throw couponError||itemError;
  if(!items||items.length!==slugs.length)return NextResponse.json({error:"One or more selected items could not be found."},{status:404});
  if(code){
   if(!coupon)return NextResponse.json({error:"This coupon is not active. Please check the code."},{status:404});
   const now=Date.now();
   if((coupon.valid_from&&new Date(coupon.valid_from).getTime()>now)||(coupon.valid_until&&new Date(coupon.valid_until).getTime()<now)||(coupon.usage_limit&&coupon.usage_count>=coupon.usage_limit))return NextResponse.json({error:"This coupon has expired or reached its usage limit."},{status:400});
   if(items.some((x:any)=>!coupon.applicable_item_types.includes(x.item_type)))return NextResponse.json({error:"This coupon does not apply to the selected items."},{status:400});
  }
  const allPriced=items.every((x:any)=>x.is_active&&x.provider_verified&&x.price!==null);
  if(!allPriced)return NextResponse.json({valid:true,applied:false,code:code||null,discount:0,familyDiscount:0,message:"Offer saved. Coupon and family discounts will be calculated once MFIT catalogue prices are available."});
  const subtotal=items.reduce((s:number,x:any)=>s+Number(x.price),0);
  let discount=0,familyDiscount=0;
  if(code){
   if(subtotal<Number(coupon.min_order_amount||0))return NextResponse.json({error:"Your order does not meet this coupon's minimum value."},{status:400});
   const raw=coupon.discount_type==="percentage"?subtotal*Number(coupon.discount_value)/100:Number(coupon.discount_value);
   discount=Number(Math.min(raw,coupon.max_discount==null?raw:Number(coupon.max_discount),subtotal).toFixed(2));
  }
  if(familyMember&&familyRule){
   const now=Date.now();
   if((!familyRule.valid_from||new Date(familyRule.valid_from).getTime()<=now)&&(!familyRule.valid_until||new Date(familyRule.valid_until).getTime()>=now)){
    const raw=subtotal*Number(familyRule.discount_value)/100;
    familyDiscount=Number(Math.min(raw,familyRule.max_discount==null?raw:Number(familyRule.max_discount),Math.max(0,subtotal-discount)).toFixed(2));
   }
  }
  return NextResponse.json({valid:true,applied:true,code:code||null,subtotal,discount,familyDiscount,total:Number((subtotal-discount-familyDiscount).toFixed(2)),message:"Available offers calculated. Final discount is rechecked at checkout."});
 }catch(error){console.error("MFIT offer validation",error);return NextResponse.json({error:"Could not validate offers. Please try again."},{status:500});}
}
