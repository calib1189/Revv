import type { AffiliateLink, AffiliateProvider } from "./affiliate-provider";
import type { Part } from "@/lib/db/parts";

/**
 * No real affiliate network is connected. Returns a link to example.com
 * (the IANA-reserved documentation domain — never a real retailer) so the
 * click-through UI and provider abstraction can be exercised without ever
 * risking a real-looking purchase link. Always label this as mock output.
 */
export class MockAffiliateProvider implements AffiliateProvider {
  async getAffiliateLink(part: Part): Promise<AffiliateLink> {
    return {
      url: `https://example.com/mock-affiliate?part=${part.id}`,
      isMock: true,
    };
  }
}
