import type { AffiliateProvider } from "./affiliate-provider";
import { MockAffiliateProvider } from "./mock-affiliate-provider";
import { AmazonAffiliateProvider } from "./amazon-affiliate-provider";

/**
 * Real implementation swaps in the moment an Associates tag is
 * configured (NEXT_PUBLIC_AMAZON_AFFILIATE_TAG — see amazon-search-link.ts
 * for why it's a public var despite being read here on the server).
 * Every environment without one gets the mock, per this project's rule
 * that mock provider output must never be presented as real.
 */
export function getAffiliateProvider(): AffiliateProvider {
  const tag = process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG;
  if (tag) return new AmazonAffiliateProvider(tag);
  return new MockAffiliateProvider();
}
