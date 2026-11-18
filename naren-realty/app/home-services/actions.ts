"use server";

import { createSupabaseServerClient } from "../lib/supabase-server";
import { homeServicesReady } from "../lib/home-services-config";
import { validateServiceEnquiry } from "../lib/home-services";

export type ServiceState = { status: "idle" | "success" | "error"; message: string };

export async function requestHomeService(_state: ServiceState, form: FormData): Promise<ServiceState> {
  if (!homeServicesReady()) return { status: "error", message: "Service enquiries are not available yet. Nothing was saved." };
  let input;
  try { input = validateServiceEnquiry(form); }
  catch (error) { return { status: "error", message: error instanceof Error ? error.message : "Invalid enquiry." }; }
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { status: "error", message: "Please sign in to send an enquiry." };
  const { error } = await supabase.from("home_service_enquiries").insert({
    service: input.service, customer_name: input.name,
    mobile_number: input.mobile, requirement: input.requirement, preferred_time: input.preferred,
    locality: input.locality, contact_consent: input.contact_consent,
  });
  if (error) {
    console.error("[home-service] Enquiry could not be saved", { code: error.code });
    return { status: "error", message: "Your enquiry could not be saved. Please try again." };
  }
  return { status: "success", message: "Your enquiry was received. Our team will review it." };
}
