import type { GifRef } from "@/lib/gifs";

export interface GifResult extends GifRef {
  title: string;
}

export interface GifSearchResponse {
  gifs: GifResult[];
  /** True when no GIF service is configured — the picker says so instead
   * of showing an empty grid as if nothing matched. */
  isMock: boolean;
}

export interface GifProvider {
  /** Popular right now, shown before anything is typed. */
  trending(): Promise<GifSearchResponse>;
  search(query: string): Promise<GifSearchResponse>;
}
