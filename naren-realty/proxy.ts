import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const ADMIN_LOGIN_PATH = "/admin/login";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const pathname = request.nextUrl.pathname;
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  if (!isAdminRoute || pathname === ADMIN_LOGIN_PATH) return response;

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.redirect(new URL(ADMIN_LOGIN_PATH, request.url));
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || profile?.role !== "admin") {
    return NextResponse.redirect(new URL(ADMIN_LOGIN_PATH, request.url));
  }

  return response;
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
