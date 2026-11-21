"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../lib/supabase-server";
import { createSupabaseServiceClient } from "../../lib/supabase-service";

export async function setCustomerAccountAccess(userId: string, action: "deactivate" | "reactivate") {
  await requireAdmin();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) throw new Error("Invalid account.");
  const service = createSupabaseServiceClient();
  const { data: profile, error: profileError } = await service.from("profiles").select("id,role").eq("id", userId).maybeSingle();
  if (profileError || !profile || !["customer", "manager"].includes(profile.role)) throw new Error("Only customer or manager accounts can be changed here.");
  const { error } = await service.auth.admin.updateUserById(userId, { ban_duration: action === "deactivate" ? "876000h" : "none" });
  if (error) throw new Error("Account access could not be updated.");
  revalidatePath("/admin/accounts");
  revalidatePath("/admin/managers");
  return { ok: true };
}
