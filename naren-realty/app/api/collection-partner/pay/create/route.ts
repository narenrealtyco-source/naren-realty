import {NextRequest,NextResponse} from "next/server";
import {requireCollectionPartner} from "../../../../lib/collection-partner";
export async function POST(req:NextRequest){
 try{
  const {admin,partner}=await requireCollectionPartner();
  const form=await req.formData();
  const requestId=String(form.get("request_id")||"");
  const {data:b,error}=await admin.from("health_booking_requests").select("id,partner_b2b_amount,partner_b2b_payment_status").eq("id",requestId).eq("collection_partner_id",partner.id).single();
  if(error||!b)throw new Error("Booking not found.");
  if(b.partner_b2b_payment_status==="paid")throw new Error("Already paid.");
  if(Number(b.partner_b2b_amount||0)<=0)throw new Error("B2B amount not configured.");
  return NextResponse.redirect(new URL("/collection-partner/payment-checkout?request_id="+encodeURIComponent(requestId),req.url),303);
 }catch(e:any){return NextResponse.json({error:e.message||"Unable to open payment."},{status:400});}
}