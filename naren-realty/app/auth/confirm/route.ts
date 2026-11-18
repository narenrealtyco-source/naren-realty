import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../lib/supabase-server";

const allowedTypes = new Set(["invite", "recovery", "email"]);
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") || "";
  const origin = url.origin;
  if (!tokenHash || !allowedTypes.has(type)) {
    return NextResponse.redirect(new URL("/manager/login?setup=invalid", origin));
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: type as "invite" | "recovery" | "email",
  });
  if (error) {
    return NextResponse.redirect(new URL("/manager/login?setup=expired", origin));
  }
  if (type === "email") {\n    return NextResponse.redirect(new URL("/account?verified=1", origin));\n  }\n  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.redirect(new URL("/manager/login?setup=failed", origin));
  }
  const { data: profile, error: profileError } = await supabase.from("profiles")
    .select("role,manager_active").eq("id", user.id).maybeSingle();
  if (profileError || profile?.role !== "manager" || profile.manager_active !== true) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/manager/login?setup=unauthorized", origin));
  }
  return NextResponse.redirect(new URL("/manager/accept-invite", origin));
}
