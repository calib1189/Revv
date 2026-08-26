import { getShopCategory } from "@/lib/shops/categories";
import type { PlacesProvider, Shop, ShopSearchResponse } from "./places-provider";

// Places API (New) — Text Search, not the legacy Nearby Search endpoint.
// A plain keyword query ("window tint shop") plus a location bias circle
// is what actually lets a category like "window tint" work at all: New
// Places API's includedTypes enum has nothing finer-grained than
// "car_repair", so there's no first-class type to filter by for most of
// SHOP_CATEGORIES — see categories.ts.
const SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";

// Only request the fields actually used — the New API bills by which
// fields the mask includes, so asking for anything unused (photos, full
// opening-hours schedules, etc.) would just be paying for data this
// feature never shows.
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.userRatingCount",
  "places.currentOpeningHours.openNow",
  "places.googleMapsUri",
].join(",");

// 15 miles — wide enough to surface real results in a suburban or rural
// area without a second round trip, capped well under the API's own
// 50,000m maximum for locationBias.circle.radius.
const SEARCH_RADIUS_METERS = 24_140;
const MAX_RESULTS = 20;

interface GooglePlace {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  rating?: number;
  userRatingCount?: number;
  currentOpeningHours?: { openNow?: boolean };
  googleMapsUri?: string;
}

interface GoogleTextSearchResponse {
  places?: GooglePlace[];
}

export class GooglePlacesProvider implements PlacesProvider {
  constructor(private readonly apiKey: string) {}

  async searchNearbyShops({
    lat,
    lng,
    category,
  }: Parameters<PlacesProvider["searchNearbyShops"]>[0]): Promise<ShopSearchResponse> {
    const { searchQuery } = getShopCategory(category);

    const response = await fetch(SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": this.apiKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery: searchQuery,
        locationBias: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: SEARCH_RADIUS_METERS,
          },
        },
        maxResultCount: MAX_RESULTS,
      }),
    });

    if (!response.ok) {
      throw new Error(`Google Places request failed (${response.status}): ${await response.text()}`);
    }

    const data = (await response.json()) as GoogleTextSearchResponse;
    const shops: Shop[] = (data.places ?? [])
      .filter((place) => place.location?.latitude != null && place.location?.longitude != null)
      .map((place) => ({
        placeId: place.id,
        name: place.displayName?.text ?? "Unnamed shop",
        address: place.formattedAddress ?? "",
        lat: place.location!.latitude!,
        lng: place.location!.longitude!,
        rating: place.rating ?? null,
        reviewCount: place.userRatingCount ?? null,
        isOpenNow: place.currentOpeningHours?.openNow ?? null,
        googleMapsUrl:
          place.googleMapsUri ?? `https://www.google.com/maps/place/?q=place_id:${place.id}`,
      }));

    return { shops, isMock: false };
  }
}
