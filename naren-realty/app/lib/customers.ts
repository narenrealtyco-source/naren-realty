import { createSupabaseBrowserClient } from "./supabase-browser";

export const supabase = createSupabaseBrowserClient();
const OWNER_SESSION_STAGE_TIMEOUT_MS = 10000;

export type CustomerAccount = {
  id: string;
  fullName: string;
  mobileNumber: string;
  email: string;
  createdAt: string;
};

export type CustomerProfile = Pick<CustomerAccount, "id" | "fullName" | "mobileNumber" | "email">;

export type CustomerOrOwnerSession = CustomerAccount & {
  role: "customer" | "owner";
};

async function withOwnerSessionTimeout<T>(operation: PromiseLike<T>, stage: string): Promise<T> {
  let timeoutId: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(
      () => reject(new Error(`Owner session ${stage} timed out.`)),
      OWNER_SESSION_STAGE_TIMEOUT_MS,
    );
  });

  try {
    return await Promise.race<T>([operation, timeout]);
  } finally {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  }
}

type LegacyCustomerAccount = CustomerAccount & {
  passwordSalt: string;
  passwordHash: string;
};

export type CustomerSignupResult = {
  customer: CustomerAccount | null;
  requiresEmailConfirmation: boolean;
};

function getAuthErrorMessage(error: { code?: string; message: string }): string {
  if (error.code === "email_not_confirmed" || error.message.toLowerCase().includes("email not confirmed")) {
    return "Your email is not verified. Check your inbox and confirm your email before logging in.";
  }
  if (error.code === "invalid_credentials") {
    return "Email or password is incorrect.";
  }
  return error.message || "Authentication failed. Please try again.";
}

function getCustomerAccountRedirectUrl(): string {
  return "https://narenrealty.co/account";
}

function getCustomerPasswordResetRedirectUrl(): string {
  return "https://narenrealty.co/account/reset-password";
}

export type CustomerFavorite = {
  customerId: string;
  propertyId: string;
  title: string;
  locality: string;
  type: string;
  price: string;
  bedrooms?: number;
};

const CUSTOMERS_KEY = "naren-realty-customers-v1";
const FAVORITES_KEY = "naren-realty-customer-favorites-v1";
function readCustomers(): LegacyCustomerAccount[] {
  const stored = window.localStorage.getItem(CUSTOMERS_KEY);
  if (!stored) return [];
  const parsed: unknown = JSON.parse(stored);
  if (!Array.isArray(parsed)) throw new Error("Customer account storage is invalid.");
  return parsed as LegacyCustomerAccount[];
}

export function getAllCustomerProfiles(): CustomerProfile[] {
  return readCustomers().map(({ id, fullName, mobileNumber, email }) => ({ id, fullName, mobileNumber, email }));
}

function readFavorites(): CustomerFavorite[] {
  const stored = window.localStorage.getItem(FAVORITES_KEY);
  if (!stored) return [];
  const parsed: unknown = JSON.parse(stored);
  if (!Array.isArray(parsed)) throw new Error("Customer favourite storage is invalid.");
  return parsed as CustomerFavorite[];
}

export async function registerCustomer(input: {
  fullName: string;
  mobileNumber: string;
  email: string;
  password: string;
  referralCode?: string;
  referralCategory?: "tenant" | "owner";
}): Promise<CustomerSignupResult> {
  const email = input.email.trim().toLowerCase();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: {
      emailRedirectTo: getCustomerAccountRedirectUrl(),
      data: {
        full_name: input.fullName.trim(),
        mobile_number: input.mobileNumber.trim(),
        ...(input.referralCode && input.referralCategory
          ? {
              referral_code: input.referralCode.trim().toUpperCase(),
              referral_category: input.referralCategory,
            }
          : {}),
      },
    },
  });

  if (error) {
    throw new Error(getAuthErrorMessage(error));
  }

  if (data.user && data.user.identities?.length === 0) {
    throw new Error("An account with this email already exists. Try logging in or resetting your password.");
  }

  if (!data.session || !data.user) {
    return { customer: null, requiresEmailConfirmation: true };
  }

  let customer: CustomerAccount | null;
  try {
    customer = await getCustomerSession();
  } catch (sessionError) {
    await supabase.auth.signOut();
    throw sessionError;
  }
  if (!customer) {
    await supabase.auth.signOut();
    throw new Error("Your account was created, but the customer profile is not available yet.");
  }
  return { customer, requiresEmailConfirmation: false };
}

export async function resendCustomerConfirmationEmail(emailInput: string): Promise<void> {
  const email = emailInput.trim().toLowerCase();
  if (!email) throw new Error("Enter your email address first.");
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: getCustomerAccountRedirectUrl() },
  });
  if (error) throw new Error(error.message || "Verification email could not be sent. Please try again.");
}

export async function loginCustomer(emailInput: string, password: string): Promise<CustomerAccount> {
  const email = emailInput.trim().toLowerCase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(getAuthErrorMessage(error));
  }

  let customer: CustomerAccount | null;
  try {
    customer = await getCustomerSession();
  } catch (sessionError) {
    await supabase.auth.signOut();
    throw sessionError;
  }
  if (!customer) {
    await supabase.auth.signOut();
    throw new Error("This account is not a customer account.");
  }
  return customer;
}

export async function getCustomerSession(): Promise<CustomerAccount | null> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) throw new Error("Customer profile lookup failed. Please try again.");
  if (!profile) throw new Error("Customer profile is missing. Please contact support.");
  if (profile.role !== "customer") throw new Error("This account is not a customer account.");

  return {
    id: user.id,
    fullName: typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "",
    mobileNumber: typeof user.user_metadata?.mobile_number === "string" ? user.user_metadata.mobile_number : "",
    email: user.email ?? "",
    createdAt: user.created_at,
  };
}

export async function getCustomerOrOwnerSession(): Promise<CustomerOrOwnerSession | null> {
  const { data: { session }, error: sessionError } = await withOwnerSessionTimeout(
    supabase.auth.getSession(),
    "restoration",
  );
  if (sessionError) throw new Error("Account session restoration failed. Please try again.");
  if (!session) return null;

  const { data: { user }, error: userError } = await withOwnerSessionTimeout(
    supabase.auth.getUser(),
    "verification",
  );
  if (userError) throw new Error("Account session lookup failed. Please try again.");
  if (!user) throw new Error("Account session is unavailable. Please try again.");

  const { data: profile, error: profileError } = await withOwnerSessionTimeout(
    supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle(),
    "profile lookup",
  );

  if (profileError) throw new Error("Account profile lookup failed. Please try again.");
  if (!profile || (profile.role !== "customer" && profile.role !== "owner")) {
    throw new Error("This account cannot access the Customer or Owner portal.");
  }

  return {
    id: user.id,
    fullName: typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "",
    mobileNumber: typeof user.user_metadata?.mobile_number === "string" ? user.user_metadata.mobile_number : "",
    email: user.email ?? "",
    createdAt: user.created_at,
    role: profile.role,
  };
}

export async function requestCustomerPasswordReset(emailInput: string): Promise<void> {
  const email = emailInput.trim().toLowerCase();
  const redirectTo = getCustomerPasswordResetRedirectUrl();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) {
    throw new Error(error.message || "Password reset email could not be sent. Please try again.");
  }
}

export async function updateCustomerPassword(password: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("This password reset link is invalid or has expired.");

  await getCustomerSession();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error("Your password could not be updated. Please request a new reset link.");
}

export async function updateCustomerProfile(
  customerId: string,
  profile: Pick<CustomerAccount, "fullName" | "mobileNumber" | "email">,
): Promise<CustomerAccount> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user || user.id !== customerId) {
    throw new Error("Customer authentication is required.");
  }

  const { data, error } = await supabase.auth.updateUser({
    email: profile.email.trim().toLowerCase(),
    data: {
      full_name: profile.fullName.trim(),
      mobile_number: profile.mobileNumber.trim(),
    },
  });
  if (error || !data.user) throw new Error(error?.message ?? "Profile could not be saved.");

  const updated = await getCustomerSession();
  if (!updated) throw new Error("Customer profile could not be loaded after saving.");
  return updated;
}

export async function logoutCustomer(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error("Unable to log out.");
}

export function getCustomerFavorites(customerId: string): CustomerFavorite[] {
  return readFavorites().filter((favorite) => favorite.customerId === customerId);
}

export function toggleCustomerFavorite(customerId: string, property: Omit<CustomerFavorite, "customerId">): boolean {
  const favorites = readFavorites();
  const exists = favorites.some((favorite) => favorite.customerId === customerId && favorite.propertyId === property.propertyId);
  const next = exists
    ? favorites.filter((favorite) => favorite.customerId !== customerId || favorite.propertyId !== property.propertyId)
    : [...favorites, { ...property, customerId }];
  window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  return !exists;
}

export function removeCustomerFavorite(customerId: string, propertyId: string): void {
  const favorites = readFavorites().filter((favorite) => favorite.customerId !== customerId || favorite.propertyId !== propertyId);
  window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}
