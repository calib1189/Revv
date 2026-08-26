"use server";

import { createClient } from "@/lib/supabase/server";
import { getClientIp } from "@/lib/http/get-client-ip";
import { isUnderShopsSearchRateLimit, recordShopsSearchAttempt } from "@/lib/shops/search-rate-limit";
import { getPlacesProvider } from "@/lib/providers/get-places-provider";
import { isShopCategoryId } from "@/lib/shops/categories";
import type { ShopSearchResponse } from "@/lib/providers/places-provider";

/**
 * Backs the Discover page's "Shops near you" browser — public, so this
 * has to be safe for anonymous callers, same as
 * searchMarketplaceProductsAction. IP-based rate limiting instead of a
 * logged-in-user gate, and tighter than the marketplace one since this
 * one bills per call (see shops_search_attempts, 0044).
 */
export async function searchNearbyShopsAction({
  lat,
  lng,
  category,
}: {
  lat: number;
  lng: number;
  category: string;
}): Promise<ShopSearchResponse> {
  if (!isShopCategoryId(category)) return { shops: [], isMock: false };
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { shops: [], isMock: false };

  const supabase = await createClient();
  const ip = await getClientIp();

  if (!(await isUnderShopsSearchRateLimit(supabase, ip))) {
    return { shops: [], isMock: false };
  }

  try {
    await recordShopsSearchAttempt(supabase, ip);
    return await getPlacesProvider().searchNearbyShops({ lat, lng, category });
  } catch (err) {
    console.error("searchNearbyShopsAction failed:", err);
    return { shops: [], isMock: false };
  }
}
