import type { ProductSearchProvider, ProductSearchResponse } from "./product-search-provider";

/**
 * No PA-API credentials configured. Returns zero results rather than
 * invented placeholder products — a "mock" that made up fake titles,
 * prices, and images would be exactly the fabricated product data this
 * project's rules forbid, not a harmless stand-in. The UI's job with an
 * empty, isMock: true response is to fall back to the plain tagged
 * search link, same as before this provider existed.
 */
export class MockProductSearchProvider implements ProductSearchProvider {
  async searchProducts(): Promise<ProductSearchResponse> {
    return { results: [], isMock: true };
  }
}
