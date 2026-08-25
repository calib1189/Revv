import type { AffiliateLink, AffiliateProvider } from "./affiliate-provider";
import type { Part } from "@/lib/db/parts";

/**
 * Links a matched catalog part to an Amazon search for it, tagged with
 * the site's Associates tag so a purchase can actually earn a commission.
 * Not a real product lookup — REVV doesn't have an Amazon catalog
 * integration, just a search query built from the part's own brand and
 * name, same honesty level as the "search for this part" fallback shown
 * for unmatched mods (buildPartSearchUrl). A search link, not a claim
 * that this exact listing is the exact part.
 */
export class AmazonAffiliateProvider implements AffiliateProvider {
  constructor(private readonly tag: string) {}

  async getAffiliateLink(part: Part): Promise<AffiliateLink> {
    const query = [part.brand, part.product].filter(Boolean).join(" ").trim();
    if (!query) return { url: null, isMock: false };
    const url = `https://www.amazon.com/s?k=${encodeURIComponent(query)}&tag=${encodeURIComponent(this.tag)}`;
    return { url, isMock: false };
  }
}
