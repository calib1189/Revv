import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/db/profiles";
import { isSafeAppPath } from "@/lib/push/validation";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  // Only ever a path on this site — `next` arrives in a URL anyone can
  // craft, and "@evil.com" appended to the origin would leave it.
  const requestedNext = searchParams.get("next");
  const explicitNext = isSafeAppPath(requestedNext) ? requestedNext : null;
  const next = explicitNext ?? "/feed";

  // The iOS app's hand-off to the website (createWebHandoffAction): a
  // one-time token for the person already signed in there, redeemed here
  // so this browser is signed in too.
  if (tokenHash && searchParams.get("type") === "magiclink") {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "magiclink",
    });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    // Expired or already used: they sign in by hand and still end up on
    // the page they came for.
    return NextResponse.redirect(`${origin}/login?next=${encodeURIComponent(next)}`);
  }

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
