import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../lib/supabase-server";

const allowedTypes = new Set(["invite", "recovery", "email", "magiclink"]);

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const code = url.searchParams.get("code");
  const type = url.searchParams.get("type") || "";
  const origin = url.origin;

  // Supabase may return either a PKCE authorization code or a token_hash,
  // depending on the email-link flow and project auth configuration.
  if (!code && (!tokenHash || !allowedTypes.has(type))) {
    return NextResponse.redirect(new URL("/?auth_error=invalid_link", origin));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.verifyOtp({
        token_hash: tokenHash!,
        type: type as "invite" | "recovery" | "email" | "magiclink",
      });

  if (error) {
    const destination = type === "magiclink"
      ? "/collection-partner/login?setup=expired"
      : "/?auth_error=expired_link";
    return NextResponse.redirect(new URL(destination, origin));
  }

  if (type === "email") {
    return NextResponse.redirect(new URL("/account?verified=1", origin));
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.redirect(new URL("/?auth_error=verification_failed", origin));
  }

  const { data: profile, error: profileError } = await supabase.from("profiles")
    .select("role,manager_active").eq("id", user.id).maybeSingle();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/?auth_error=account_not_found", origin));
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
    return NextResponse.redirect(new URL("/collection-partner", origin));
  }

  if (profile.role === "manager" && profile.manager_active === true) {
    return NextResponse.redirect(new URL("/manager/accept-invite", origin));
  }

  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/?auth_error=unauthorized", origin));
}
