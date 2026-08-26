import type { PlacesProvider } from "./places-provider";
import { MockPlacesProvider } from "./mock-places-provider";
import { GooglePlacesProvider } from "./google-places-provider";

/**
 * Real provider when GOOGLE_PLACES_API_KEY is configured, mock otherwise
 * — the mock stays fully functional (returns an honest empty result) for
 * local dev / no-key environments, and the UI shows its own "not set up
 * yet" state rather than an empty-but-real-looking shop list.
 */
export function getPlacesProvider(): PlacesProvider {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (apiKey) return new GooglePlacesProvider(apiKey);
  return new MockPlacesProvider();
}
