import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "./supabase-server";

export async function requireMfitLab() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Authentication required.");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "lab") throw new Error("Lab access only.");
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!service) throw new Error("Lab service is unavailable.");
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, service, { auth: { persistSession: false } });
  const { data: staff } = await admin.from("health_lab_staff").select("user_id,lab_partner_id,full_name,is_active").eq("user_id", user.id).maybeSingle();
  if (!staff?.is_active) throw new Error("This lab account is inactive.");
  return { admin, user, staff };
}
