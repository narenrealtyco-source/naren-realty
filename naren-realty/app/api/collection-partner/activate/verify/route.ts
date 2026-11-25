import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "../../../../lib/supabase-server";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "This verification request could not be trusted. Reload the setup page and try again." }, { status: 403 });
  }

  let tokenHash = "";
  try {
    const body = await request.json();
    tokenHash = typeof body?.token_hash === "string" ? body.token_hash.trim() : "";
  } catch {
    return NextResponse.json({ error: "The setup link is incomplete. Ask the MFIT admin to resend it." }, { status: 400 });
  }

  if (!tokenHash || tokenHash.length > 2048) {
    return NextResponse.json({ error: "The setup link is incomplete. Ask the MFIT admin to resend it." }, { status: 400 });
  }

  try {
    const authClient = await createSupabaseServerClient();
    const { error: verifyError } = await authClient.auth.verifyOtp({
      token_hash: tokenHash,
      type: "recovery",
    });

    if (verifyError) {
      return NextResponse.json({
        error: "This setup link has expired or has already been used. Ask the MFIT admin to send a fresh link.",
      }, { status: 400 });
    }

    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Your email link could not be verified. Please request a new setup link." }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Collection partner activation: server database configuration is missing.");
      return NextResponse.json({ error: "MFIT activation is temporarily unavailable. Please contact support; your link has not been marked as an inactive account." }, { status: 503 });
    }

    const adminDb = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const [profileResult, partnerResult] = await Promise.all([
      adminDb.from("profiles").select("role").eq("id", user.id).maybeSingle(),
      adminDb.from("health_collection_partners").select("is_active").eq("user_id", user.id).maybeSingle(),
    ]);

    if (profileResult.error || partnerResult.error) {
      console.error("Collection partner activation status lookup failed.", {
        profileCode: profileResult.error?.code,
        partnerCode: partnerResult.error?.code,
      });
      return NextResponse.json({ error: "We could not verify your partner status right now. Please try again in a few minutes or contact MFIT support. Your account has not been signed out." }, { status: 503 });
    }

    if (profileResult.data?.role !== "collection_partner" || partnerResult.data?.is_active !== true) {
      return NextResponse.json({ error: "This account is not currently approved and active as an MFIT collection partner. Please contact MFIT Healthcare support." }, { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Collection partner activation verification failed.", error);
    return NextResponse.json({ error: "A temporary verification error occurred. Please retry; your account has not been signed out." }, { status: 503 });
  }
}
