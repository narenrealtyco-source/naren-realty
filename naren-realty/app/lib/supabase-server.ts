import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {}
        },
      },
    },
  );
}

async function requireRole(role: "admin" | "manager") {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Authentication is required.");
  const { data: profile, error: profileError } = await supabase
    .from("profiles").select("role,manager_active").eq("id", user.id).maybeSingle();
  if (profileError || profile?.role !== role || (role === "manager" && profile.manager_active !== true)) {
    throw new Error("You are not authorized to access this area.");
  }
  return { supabase, user, profile };
}

export async function requireAdmin() { return requireRole("admin"); }
export async function requireManager() { return requireRole("manager"); }
