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
  "/settings/account",
  "/settings/blocked",
  "/messages",
  "/friends",
  "/advertise",
  "/advertise/new",
];
const PROTECTED_PATTERNS = [
  /^\/garage\/[^/]+\/edit$/,
  /^\/garage\/[^/]+\/builds\/[^/]+\/review$/,
  /^\/messages\/[^/]+$/,
  // Every /admin/* route is also independently gated by admin/layout.tsx's
  // own is_admin check — this is defense in depth, not the only gate. A
  // prefix match instead of listing each admin route individually means a
  // newly added admin page can't accidentally ship ungated at this layer
  // just because someone forgot to list it here.
  /^\/admin(\/.*)?$/,
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

  // This runs before every page, navigation and server action, so it
  // matters what it costs. getClaims() refreshes an expired session the
  // same way getUser() does, but then checks the token's signature
  // locally against the project's (cached) ES256 key instead of making a
  // network round trip to Supabase Auth.
  //
  // Signed-in-only pages still call getUser(): they also have to know
  // whether the email is confirmed, which the token doesn't carry.
  if (!isProtectedPath(request.nextUrl.pathname)) {
    await supabase.auth.getClaims();
    return response;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  return response;
}
