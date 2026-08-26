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

export interface ShopSearchResponse {
  shops: Shop[];
  isMock: boolean;
}

export interface PlacesProvider {
  searchNearbyShops(params: {
    lat: number;
    lng: number;
    category: ShopCategoryId;
  }): Promise<ShopSearchResponse>;
}
