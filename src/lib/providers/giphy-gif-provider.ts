import type { GifProvider, GifResult, GifSearchResponse } from "./gif-provider";

const API = "https://api.giphy.com/v1/gifs";
const LIMIT = 24;
// GIPHY's own content rating. pg-13 keeps profanity-free, non-explicit
// GIFs while still allowing the usual reaction GIFs.
const RATING = "pg-13";
// The beta key allows ~100 calls an hour across all users, so identical
// requests are served from Next's data cache: trending changes slowly,
// and a given search term returns the same results for a while.
const TRENDING_CACHE_SECONDS = 15 * 60;
const SEARCH_CACHE_SECONDS = 60 * 60;

interface GiphyGif {
  id?: unknown;
  title?: unknown;
  images?: { fixed_width?: { width?: unknown; height?: unknown } };
}

interface GiphyResponse {
  data?: GiphyGif[];
}

function toInt(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 2000 ? n : null;
}

/** Keeps only GIFs with a plain id and a usable 200px rendition — the
 * same shape migration 0130 accepts, so anything picked can be sent. */
export function toGifResults(body: GiphyResponse): GifResult[] {
  const results: GifResult[] = [];
  for (const g of body.data ?? []) {
    if (typeof g.id !== "string" || !/^[A-Za-z0-9]{1,64}$/.test(g.id)) continue;
    const width = toInt(g.images?.fixed_width?.width);
    const height = toInt(g.images?.fixed_width?.height);
    if (width === null || height === null) continue;
    results.push({ id: g.id, width, height, title: typeof g.title === "string" ? g.title : "" });
  }
  return results;
}

export class GiphyGifProvider implements GifProvider {
  constructor(private readonly apiKey: string) {}

  trending(): Promise<GifSearchResponse> {
    return this.get("trending", {}, TRENDING_CACHE_SECONDS);
  }

  search(query: string): Promise<GifSearchResponse> {
    return this.get("search", { q: query.trim().toLowerCase().slice(0, 50), lang: "en" }, SEARCH_CACHE_SECONDS);
  }

  private async get(path: string, params: Record<string, string>, revalidate: number): Promise<GifSearchResponse> {
    const url = new URL(`${API}/${path}`);
    url.search = new URLSearchParams({
      api_key: this.apiKey,
      limit: String(LIMIT),
      rating: RATING,
      bundle: "messaging_non_clips",
      ...params,
    }).toString();
    const res = await fetch(url, { next: { revalidate } });
    if (!res.ok) throw new Error(`GIPHY ${path} failed: ${res.status}`);
    return { gifs: toGifResults((await res.json()) as GiphyResponse), isMock: false };
  }
}
