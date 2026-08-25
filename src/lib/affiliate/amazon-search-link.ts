/** Wraps a search query in an Amazon search link, tagged for commission
 * when an Associates tag is configured. `NEXT_PUBLIC_` on purpose — an
 * affiliate tag is meant to sit in the URL, not a secret, and this same
 * value is read both here (client-side, for the "search for this part"
 * fallback on unmatched mods) and server-side in AmazonAffiliateProvider
 * (for matched catalog parts) so one env var covers both paths instead of
 * needing the same value set twice under two different names.
 *
 * Falls back to a plain Google search when no tag is set, so local dev
 * and any deploy that hasn't signed up for Amazon Associates yet still
 * gets a working, honest link instead of a broken or fake one — never
 * fabricate a tag. Get a real one at affiliate-program.amazon.com (free,
 * self-serve, the tag itself is usable immediately). */
export function buildPartSearchUrl(query: string): string {
  const tag = process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG;
  if (tag) {
    return `https://www.amazon.com/s?k=${encodeURIComponent(query)}&tag=${encodeURIComponent(tag)}`;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}
