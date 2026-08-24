import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/db/profiles";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const explicitNext = searchParams.get("next");
  const next = explicitNext ?? "/feed";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Only the plain signup-confirmation path (no explicit `next`, e.g.
      // password recovery sets one) gets routed through onboarding —
      // never hijack a link that already has somewhere specific to go.
      if (!explicitNext && data.user) {
        const profile = await getProfileByUserId(supabase, data.user.id);
        if (!profile?.onboarded_at) {
          return NextResponse.redirect(`${origin}/welcome`);
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
