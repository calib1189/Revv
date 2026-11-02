import { SITE_URL } from "@/lib/site-url";

/** The link the iOS app opens in the system browser to carry someone
 * across already signed in (see createWebHandoffAction). It lands on this
 * site's own /auth/callback, which redeems the one-time token server-side
 * and sets the session cookies, then forwards to `nextPath` — query and
 * #fragment included, so the browser opens on the same spot they left. */
export function webHandoffUrl(tokenHash: string, nextPath: string): string {
  const params = new URLSearchParams({
    token_hash: tokenHash,
    type: "magiclink",
    next: nextPath,
  });
  return `${SITE_URL}/auth/callback?${params}`;
}
