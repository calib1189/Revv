export interface ProductSearchResult {
  asin: string;
  title: string;
  /** null when the item has no primary image or Amazon didn't return one
   * for the requested resource — never a placeholder image standing in
   * for a real photo. */
  imageUrl: string | null;
  /** Pre-formatted display price (e.g. "$249.99") — null when unavailable
   * (out of stock, third-party-only listing with no Buy Box, etc.),
   * never a guessed or computed value. */
  displayPrice: string | null;
  /** Already carries the configured Associates tag. */
  detailPageUrl: string;
}

export interface ProductSearchResponse {
  results: ProductSearchResult[];
  isMock: boolean;
}

export interface ProductSearchProvider {
  searchProducts(query: string, limit?: number): Promise<ProductSearchResponse>;
}
