"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../lib/supabase-server";
import { validVisitId, validateVisitTime, visitStatuses, type VisitStatus } from "../../lib/visit-requests";

export type AdminVisitResult = { status: "idle" | "error" | "success"; message: string };

export async function updateVisit(_state: AdminVisitResult, form: FormData): Promise<AdminVisitResult> {
  let supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"];
  try { ({ supabase } = await requireAdmin()); } catch { return { status: "error", message: "Admin authorization is required." }; }
  const id = form.get("id");
  const expected = form.get("expected_status");
  const expectedDate = form.get("expected_date");
  const expectedTime = form.get("expected_time");
  const next = form.get("status");
  if (!validVisitId(id) || typeof expected !== "string" || !visitStatuses.some((s) => s === expected) || typeof next !== "string" || !visitStatuses.some((s) => s === next) || typeof expectedDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(expectedDate) || typeof expectedTime !== "string" || !/^\d{2}:\d{2}(?::\d{2})?$/.test(expectedTime)) return { status: "error", message: "Invalid request update." };
  const status = next as VisitStatus;
  if (status === "pending") return { status: "error", message: "Select a review status." };
  let schedule;
  if (status === "rescheduled") {
    try { schedule = validateVisitTime(form.get("date"), form.get("time")); } catch (error) { return { status: "error", message: error instanceof Error ? error.message : "Invalid date or time." }; }
  }
  const values = schedule ? { status, visit_date: schedule.date, visit_time: schedule.time } : { status };
  const { data, error } = await supabase.from("visit_requests").update(values).eq("id", id).eq("status", expected).eq("visit_date", expectedDate).eq("visit_time", expectedTime).select("id").maybeSingle();
  if (error || !data) {
    console.error("[visit-admin] Update not confirmed", { code: error?.code });
    return { status: "error", message: "Update could not be saved. The request may have changed; refresh and try again." };
  }
  revalidatePath("/admin/visits");
  return { status: "success", message: "Visit request updated." };
}
