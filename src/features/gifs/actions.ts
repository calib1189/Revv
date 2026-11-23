"use server";

import { getCurrentUser } from "@/lib/auth/get-user";
import { getGifProvider } from "@/lib/providers/get-gif-provider";
import type { GifResult } from "@/lib/providers/gif-provider";

export interface GifSearchResult {
  gifs: GifResult[];
  isMock: boolean;
  error: string | null;
}

/** Backs the GIF picker. Signed-in only, so the shared GIPHY quota can't
 * be spent by anonymous traffic; the key itself never leaves the server. */
export async function searchGifsAction(query: string): Promise<GifSearchResult> {
  const user = await getCurrentUser();
  if (!user) return { gifs: [], isMock: false, error: "Sign in to search GIFs." };

  const provider = getGifProvider();
  const trimmed = query.trim();
  try {
    const result = trimmed ? await provider.search(trimmed) : await provider.trending();
    return { ...result, error: null };
  } catch {
    return { gifs: [], isMock: false, error: "Couldn't load GIFs. Try again in a moment." };
  }
}
