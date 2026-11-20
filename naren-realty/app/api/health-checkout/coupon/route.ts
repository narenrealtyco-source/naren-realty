import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request:NextRequest){
  try{
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL,service=process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!url||!service)return NextResponse.json({error:"Coupon service unavailable."},{status:503});
    const body=await request.json(),code=String(body?.code||"").trim().toUpperCase(),slugs=Array.isArray(body?.slugs)?body.slugs:[];
    if(!/^[A-Z0-9_-]{3,30}$/.test(code)||!slugs.length)return NextResponse.json({error:"Enter a valid coupon code and select at least one item."},{status:400});
    const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
    const [{data:coupon,error:couponError},{data:items,error:itemError}]=await Promise.all([
      db.from("health_coupons").select("*").eq("code",code).eq("is_active",true).maybeSingle(),
      db.from("health_catalog_items").select("slug,item_type,price,is_active,provider_verified").in("slug",slugs)
    ]);
    if(couponError||itemError)throw couponError||itemError;
    if(!coupon)return NextResponse.json({error:"This coupon is not active. Please check the code."},{status:404});
    const now=Date.now();
    if((coupon.valid_from&&new Date(coupon.valid_from).getTime()>now)||(coupon.valid_until&&new Date(coupon.valid_until).getTime()<now)||(coupon.usage_limit&&coupon.usage_count>=coupon.usage_limit))
      return NextResponse.json({error:"This coupon has expired or reached its usage limit."},{status:400});
    if(!items||items.length!==slugs.length||items.some((x:any)=>!coupon.applicable_item_types.includes(x.item_type)))
      return NextResponse.json({error:"This coupon does not apply to the selected items."},{status:400});
    if(items.some((x:any)=>!x.is_active||!x.provider_verified||x.price===null))
      return NextResponse.json({valid:true,applied:false,code,discount:0,message:"Coupon saved. Its discount will be confirmed after MFIT verifies the partner price."});
    const subtotal=items.reduce((s:number,x:any)=>s+Number(x.price),0);
    if(subtotal<Number(coupon.min_order_amount||0))return NextResponse.json({error:"Your order does not meet this coupon's minimum value."},{status:400});
    const raw=coupon.discount_type==="percentage"?subtotal*Number(coupon.discount_value)/100:Number(coupon.discount_value);
    const discount=Number(Math.min(raw,coupon.max_discount==null?raw:Number(coupon.max_discount),subtotal).toFixed(2));
    return NextResponse.json({valid:true,applied:true,code,subtotal,discount,total:Number((subtotal-discount).toFixed(2)),message:"Coupon applied."});
  }catch(error){console.error("MFIT coupon validation",error);return NextResponse.json({error:"Could not validate coupon. Please try again."},{status:500});}
}
