import {createClient} from "@supabase/supabase-js";
import {createSupabaseServerClient} from "./supabase-server";
export async function requireCollectionPartner(){
 const db=await createSupabaseServerClient();
 const {data:{user},error}=await db.auth.getUser();
 if(error||!user)throw new Error("Authentication required.");
 const {data:profile}=await db.from("profiles").select("role").eq("id",user.id).maybeSingle();
 if(profile?.role!=="collection_partner")throw new Error("Collection partner access only.");
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!key)throw new Error("Partner portal unavailable.");
 const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,key,{auth:{persistSession:false}});
 const {data:partner,error:partnerError}=await admin.from("health_collection_partners").select("*").eq("user_id",user.id).eq("is_active",true).single();
 if(partnerError||!partner)throw new Error("Partner account inactive or not configured.");
 return {admin,user,partner};
}
