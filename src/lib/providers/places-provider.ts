export type ShopCategoryId =
  | "repair"
  | "body_shop"
  | "tint"
  | "exhaust"
  | "tires_wheels"
  | "performance"
  | "detailing"
  | "audio";

export interface Shop {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  /** 0-5, one decimal. Null when Google has no rating for this place yet
   * — never a guessed or defaulted score. */
  rating: number | null;
  reviewCount: number | null;
  /** Null when Google doesn't report opening-hours data for this place —
   * distinct from actually being closed right now. */
  isOpenNow: boolean | null;
  /** Real place page on Google's own site — used for the "Open in Google
   * Maps" link. Apple Maps is built from lat/lng + name instead, since
   * Google doesn't hand back an Apple Maps URL. */
  googleMapsUrl: string;
}

/** Extra fields only fetched for the shop detail page, not the search
 * list — Places API (New) bills by field mask, and a search result list
 * has no use for a phone number or website link, only the detail page
 * where someone might actually act on them. */
export interface ShopDetails extends Shop {
  websiteUrl: string | null;
  phoneNumber: string | null;
}

export interface ShopSearchResponse {
  shops: Shop[];
  isMock: boolean;
}

export interface ShopDetailsResponse {
  shop: ShopDetails | null;
  isMock: boolean;
}

export interface PlacesProvider {
  searchNearbyShops(params: {
    lat: number;
    lng: number;
    category: ShopCategoryId;
  }): Promise<ShopSearchResponse>;

  /** Free-text lookup — backs "Promote your shop": someone types their own
   * shop's name to find and promote it, rather than browsing by category. */
  searchShopsByQuery(params: { lat: number; lng: number; query: string }): Promise<ShopSearchResponse>;

  /** Backs the shop detail page — a separate, billed Place Details call
   * (not Text Search), since that's the only endpoint that returns a
   * website/phone number and works from just a place ID with no location
   * needed. */
  getShopDetails(placeId: string): Promise<ShopDetailsResponse>;
}
