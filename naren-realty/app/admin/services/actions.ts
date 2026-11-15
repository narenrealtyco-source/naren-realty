"use server";

import { revalidatePath } from "next/cache";
import { homeServicesReady } from "../../lib/home-services-config";
import { requireAdmin } from "../../lib/supabase-server";

export type ServiceReviewState = { status: "idle" | "success" | "error"; message: string };

export async function updateServiceEnquiry(_previous: ServiceReviewState, form: FormData): Promise<ServiceReviewState> {
  let supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"];
  try { ({ supabase } = await requireAdmin()); }
  catch { return { status: "error", message: "Admin authorization is required." }; }
  if (!homeServicesReady()) return { status: "error", message: "Service enquiries are not available yet." };
  const id = form.get("id");
  const status = form.get("status");
  if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ||
      typeof status !== "string" || !["pending", "contacted", "completed", "cancelled"].includes(status)) {
    return { status: "error", message: "Invalid service enquiry update." };
  }
  const { data, error } = await supabase.from("home_service_enquiries").update({ status }).eq("id", id).select("id").maybeSingle();
  if (error || !data) {
    console.error("[home-service] Admin update failed", { code: error?.code });
    return { status: "error", message: "The service enquiry could not be updated." };
  }
  revalidatePath("/admin/services");
  return { status: "success", message: "Enquiry status updated." };
}
