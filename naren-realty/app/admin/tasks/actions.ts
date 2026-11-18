"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../lib/supabase-server";

export async function updatePendingTask(formData: FormData): Promise<void> {
  const id = String(formData.get("taskId") ?? "").trim();
  const status = String(formData.get("status") ?? "");
  if (!id || !["completed", "dismissed"].includes(status)) throw new Error("Invalid task update.");
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("pending_tasks")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "open")
    .select("id")
    .maybeSingle();
  if (error) throw new Error("Could not update the follow-up task.");
  if (!data) throw new Error("This task is no longer open.");
  revalidatePath("/admin/tasks");
  revalidatePath("/admin/analytics");
}
