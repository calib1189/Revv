import type { AffiliateProvider } from "./affiliate-provider";
import { MockAffiliateProvider } from "./mock-affiliate-provider";

/**
 * Swap in a real implementation here once an affiliate network is
 * configured. Until then every environment gets the mock.
 */
export function getAffiliateProvider(): AffiliateProvider {
  return new MockAffiliateProvider();
}
