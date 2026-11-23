import type { GifProvider } from "./gif-provider";
import { GiphyGifProvider } from "./giphy-gif-provider";
import { MockGifProvider } from "./mock-gif-provider";

/** GIPHY when GIPHY_API_KEY is set (server-only — never NEXT_PUBLIC_),
 * the labeled mock otherwise. */
export function getGifProvider(): GifProvider {
  const apiKey = process.env.GIPHY_API_KEY;
  if (apiKey) return new GiphyGifProvider(apiKey);
  return new MockGifProvider();
}
