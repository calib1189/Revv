import type { PlacesProvider, ShopSearchResponse } from "./places-provider";

/**
 * No Google Places API key configured. Returns zero results rather than
 * invented shop names, addresses, or ratings — a "mock" that made up
 * fake local businesses would be actively misleading, not a harmless
 * stand-in (someone could genuinely try to drive to a shop that doesn't
 * exist). Same reasoning as MockProductSearchProvider. The UI's job with
 * an empty, isMock: true response is to show its own "not set up yet"
 * empty state, never to render this as if it were a real, empty result.
 */
export class MockPlacesProvider implements PlacesProvider {
  async searchNearbyShops(): Promise<ShopSearchResponse> {
    return { shops: [], isMock: true };
  }

  async searchShopsByQuery(): Promise<ShopSearchResponse> {
    return { shops: [], isMock: true };
  }
}
