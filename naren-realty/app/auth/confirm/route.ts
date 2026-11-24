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
  if (type === "email") {
    return NextResponse.redirect(new URL("/account?verified=1", origin));
  }
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.redirect(new URL("/manager/login?setup=failed", origin));
  }
  const { data: profile, error: profileError } = await supabase.from("profiles")
    .select("role,manager_active").eq("id", user.id).maybeSingle();
  if (profileError || !profile) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/manager/login?setup=unauthorized", origin));
  }
  if (profile.role === "collection_partner") {
    const { data: partner, error: partnerError } = await supabase
      .from("health_collection_partners")
      .select("is_active")
      .eq("user_id", user.id)
      .maybeSingle();
    if (partnerError || partner?.is_active !== true) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/collection-partner/login?setup=unauthorized", origin));
    }
    return NextResponse.redirect(new URL("/collection-partner/set-password", origin));
  }
  if (profile.role !== "manager" || profile.manager_active !== true) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/manager/login?setup=unauthorized", origin));
  }
  return NextResponse.redirect(new URL("/manager/accept-invite", origin));
}
