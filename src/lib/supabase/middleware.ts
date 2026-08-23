import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";

// Exact/pattern matches only — /garage/[id] and /p/[id] stay public (both
// vehicles and posts are publicly readable), so a plain prefix match would
// wrongly gate them.
const PROTECTED_EXACT = [
  "/garage",
  "/garage/new",
  "/feed/new",
  "/saved",
  "/notifications",
  "/settings/profile",
];
const PROTECTED_PATTERNS = [/^\/garage\/[^/]+\/edit$/];

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

  if (isProtectedPath(request.nextUrl.pathname) && !user) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
