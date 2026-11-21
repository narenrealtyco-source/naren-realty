"use server";

import { createSupabaseServiceClient } from "../lib/supabase-service";
import { createSupabaseServerClient } from "../lib/supabase-server";
import { POLICY_DOCUMENTS } from "../lib/policies";

const OWNER_CATEGORIES = ["Rental", "Resale", "PG", "Airbnb"] as const;
type OwnerRegistrationCategory = typeof OWNER_CATEGORIES[number];

type OwnerActivationInput = {
  registrationCategory: string;
  ownerPolicyAccepted: boolean;
  privacyPolicyAccepted: boolean;
};

type OwnerActivationResult =
  | { ok: true }
  | { ok: false; message: string };

type ActivationRpcError = {
  code?: string;
};

function getActivationRpcErrorMessage(error: ActivationRpcError): string {
  if (error.code === "PGRST202" || error.code === "PGRST205" || error.code === "42P01" || error.code === "42883") {
    return "Owner activation database security is not deployed. Deploy and verify the hosted Owner activation proposal first.";
  }
  if (error.code === "42501") {
    return "Owner activation database security rejected the server request. Verify the migration function permissions.";
  }
  if (error.code === "P0001") {
    return "Owner activation was rejected by the database security checks.";
  }
  return "Owner activation database request failed. Check the server logs for the safe error code.";
}

function isOwnerRegistrationCategory(value: string): value is OwnerRegistrationCategory {
  return OWNER_CATEGORIES.includes(value as OwnerRegistrationCategory);
}

function getPolicyVersion(type: "owner_terms" | "pg_hostel_policy" | "airbnb_policy" | "privacy_policy"): string {
  const policy = POLICY_DOCUMENTS.find((document) => document.type === type);
  if (!policy?.version) throw new Error("Owner policy versions are not configured.");
  return policy.version;
}

export async function activateOwnerAccount(input: OwnerActivationInput): Promise<OwnerActivationResult> {
  if (!input || !isOwnerRegistrationCategory(input.registrationCategory)) {
    return { ok: false, message: "Select a valid property category." };
  }
  if (input.ownerPolicyAccepted !== true || input.privacyPolicyAccepted !== true) {
    return { ok: false, message: "Accept the selected Owner policy and Privacy Policy to continue." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { ok: false, message: "Your Customer session has expired. Please sign in again." };
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return { ok: false, message: "Your Customer profile could not be verified." };
    }
    if (profile?.role !== "customer") {
      return { ok: false, message: "Only a Customer profile can use Owner activation." };
    }

    const ownerPolicyType = input.registrationCategory === "PG"
      ? "pg_hostel_policy"
      : input.registrationCategory === "Airbnb"
        ? "airbnb_policy"
        : "owner_terms";

    let serviceClient;
    try {
      serviceClient = createSupabaseServiceClient();
    } catch (error) {
      if (error instanceof Error && error.message === "Owner activation is not configured on the server.") {
        return { ok: false, message: "Owner activation requires SUPABASE_SERVICE_ROLE_KEY on the server." };
      }
      return { ok: false, message: "Owner activation server configuration is invalid." };
    }

    const { error: activationError } = await serviceClient.rpc("activate_owner_capability", {
      p_user_id: user.id,
      p_registration_category: input.registrationCategory,
      p_owner_policy_version: getPolicyVersion(ownerPolicyType),
      p_privacy_policy_version: getPolicyVersion("privacy_policy"),
    });

    if (activationError) {
      console.error("[owner-activation] RPC failed", {
        code: activationError.code ?? "unknown",
      });
      return { ok: false, message: getActivationRpcErrorMessage(activationError) };
    }

    return { ok: true };
  } catch (error) {
    console.error("[owner-activation] Server action failed", {
      errorType: error instanceof Error ? error.name : typeof error,
    });
    return { ok: false, message: "Owner activation could not be completed. Check the server configuration and retry." };
  }
}
