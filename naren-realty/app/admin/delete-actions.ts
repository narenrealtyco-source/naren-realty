"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../lib/supabase-server";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type AdminDeleteKind = "enquiry" | "home-service" | "visit" | "task";

const config: Record<AdminDeleteKind, { table: string; paths: string[] }> = {
  enquiry: { table: "enquiries", paths: ["/admin/enquiries", "/admin/tasks", "/admin/analytics"] },
  "home-service": { table: "home_service_enquiries", paths: ["/admin/services"] },
  visit: { table: "visit_requests", paths: ["/admin/visits", "/manager"] },
  task: { table: "pending_tasks", paths: ["/admin/tasks", "/admin/analytics"] },
};

export async function deleteAdminRecord(kind: AdminDeleteKind, id: string): Promise<{ ok: boolean; message: string }> {
  const { supabase } = await requireAdmin();
  if (!(kind in config) || typeof id !== "string" || !uuid.test(id)) {
    return { ok: false, message: "Invalid record selection." };
  }
  const item = config[kind];
  const { data, error } = await supabase.from(item.table).delete().eq("id", id).select("id").maybeSingle();
  if (error) {
    console.error("[admin-record-delete] Delete failed", { kind, code: error.code });
    return { ok: false, message: "Record could not be deleted. It may be linked to protected records." };
  }
  if (!data) return { ok: false, message: "Record not found or already deleted." };
  for (const path of item.paths) revalidatePath(path);
  return { ok: true, message: "Record deleted successfully." };
}
