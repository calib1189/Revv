import type { ProductSearchProvider } from "./product-search-provider";
import { MockProductSearchProvider } from "./mock-product-search-provider";
import { AmazonProductSearchProvider } from "./amazon-product-search-provider";

/**
 * Real implementation swaps in once actual PA-API credentials are
 * configured (AMAZON_PAAPI_ACCESS_KEY / AMAZON_PAAPI_SECRET_KEY —
 * server-only, unlike the public affiliate tag, since these can place
 * signed requests on the account's behalf). A plain Associates tag
 * alone isn't enough: PA-API access is a separate approval gate on top
 * of the Associates program, typically requiring qualifying sales
 * within 180 days of joining, so most environments will run the mock
 * for a while even after NEXT_PUBLIC_AMAZON_AFFILIATE_TAG is set.
 */
export function getProductSearchProvider(): ProductSearchProvider {
  const accessKey = process.env.AMAZON_PAAPI_ACCESS_KEY;
  const secretKey = process.env.AMAZON_PAAPI_SECRET_KEY;
  const partnerTag = process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG;
  if (accessKey && secretKey && partnerTag) {
    return new AmazonProductSearchProvider(accessKey, secretKey, partnerTag);
  }
  return new MockProductSearchProvider();
}
