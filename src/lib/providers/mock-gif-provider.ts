import type { GifProvider, GifSearchResponse } from "./gif-provider";

/** No GIPHY_API_KEY configured. Returns no GIFs and says it's the mock,
 * so the picker shows "GIFs aren't set up" rather than an empty result
 * that looks real. */
export class MockGifProvider implements GifProvider {
  async trending(): Promise<GifSearchResponse> {
    return { gifs: [], isMock: true };
  }

  async search(): Promise<GifSearchResponse> {
    return { gifs: [], isMock: true };
  }
}
