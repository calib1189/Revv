"use server";

import { createClient } from "@/lib/supabase/server";
import { getClientIp } from "@/lib/http/get-client-ip";
import {
  isUnderMarketplaceSearchRateLimit,
  recordMarketplaceSearchAttempt,
} from "@/lib/marketplace/search-rate-limit";
import { getProductSearchProvider } from "@/lib/providers/get-product-search-provider";
import type { ProductSearchResponse } from "@/lib/providers/product-search-provider";

/**
 * Backs the "shop this category" product grid — /parts is public, so
 * this has to be safe for anonymous callers, unlike the AI provider
 * actions which gate on a logged-in user. IP-based rate limiting
 * instead (see marketplace_search_attempts, 0037).
 */
export async function searchMarketplaceProductsAction(
  query: string,
): Promise<ProductSearchResponse> {
  const supabase = await createClient();
  const ip = await getClientIp();

  if (!(await isUnderMarketplaceSearchRateLimit(supabase, ip))) {
    return { results: [], isMock: false };
  }

  try {
    await recordMarketplaceSearchAttempt(supabase, ip);
    return await getProductSearchProvider().searchProducts(query);
  } catch (err) {
    console.error("searchMarketplaceProductsAction failed:", err);
    return { results: [], isMock: false };
  }
}
