import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";

// Exact/pattern matches only — /garage/[id] and /p/[id] stay public (both
// vehicles and posts are publicly readable), so a plain prefix match would
// wrongly gate them.
const PROTECTED_EXACT = [
  "/welcome",
  "/garage",
  "/garage/new",
  "/feed/new",
  "/saved",
  "/notifications",
  "/settings",
  "/settings/profile",
  "/settings/notifications",
  "/settings/billing",
  "/messages",
  "/friends",
  "/assistant",
  "/admin/reports",
  "/admin/audit-log",
  "/admin/analytics",
  "/admin/parts",
];
const PROTECTED_PATTERNS = [
  /^\/garage\/[^/]+\/edit$/,
  /^\/garage\/[^/]+\/visualize$/,
  /^\/garage\/[^/]+\/builds\/[^/]+\/review$/,
  /^\/messages\/[^/]+$/,
];

function isProtectedPath(pathname: string) {
  return (
    PROTECTED_EXACT.includes(pathname) ||
    PROTECTED_PATTERNS.some((pattern) => pattern.test(pathname))
  );
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!isSupabaseConfigured()) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isProtectedPath(request.nextUrl.pathname)) {
    if (!user) {
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("next", request.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }
    // A session exists but the email was never confirmed — Supabase still
    // hands back an active session in that case, so this is the actual
    // gate keeping a fake/unconfirmed signup out of the app rather than
    // just out of a login form.
    if (!user.email_confirmed_at) {
      return NextResponse.redirect(new URL("/signup/check-email", request.url));
    }
  }

  return response;
}
