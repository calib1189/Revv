"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { requireConfirmedUser as requireUser } from "@/lib/auth/require-confirmed-user";
import { getClientIp } from "@/lib/http/get-client-ip";
import { isUnderShopsSearchRateLimit, recordShopsSearchAttempt } from "@/lib/shops/search-rate-limit";
import { getPlacesProvider } from "@/lib/providers/get-places-provider";
import { isShopCategoryId } from "@/lib/shops/categories";
import { isShopPromotionBillingConfigured } from "@/lib/billing/config";
import { createShopPromotionCheckoutSession } from "@/lib/billing/stripe";
import { createShopPromotion, getActivePromotedPlaceIds, SHOP_PROMOTION_PRICE_CENTS } from "@/lib/db/shop-promotions";
import { buildPlacesCacheKey, getCachedPlacesSearch, setCachedPlacesSearch } from "@/lib/db/places-cache";
import type { Shop, ShopSearchResponse } from "@/lib/providers/places-provider";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export interface ShopResult extends Shop {
  isPromoted: boolean;
}

export interface ShopSearchActionResponse {
  shops: ShopResult[];
  isMock: boolean;
  /** True when this came back empty specifically because the rate limit
   * was hit — kept separate from a genuine zero-result search so the UI
   * can tell someone "you've searched a lot, try again shortly" instead
   * of the misleading "nothing nearby." */
  rateLimited: boolean;
}

/** Cross-references raw Places results against shop_promotions and sorts
 * promoted ones first — shared by both search actions below, since
 * "promote your shop" needs to show the same "already promoted" state a
 * category browse would. Distance sort within each group happens
 * client-side (shops-browser.tsx already computes distance from the
 * viewer's own coordinates for display), so this only needs to guarantee
 * the promoted/not-promoted grouping survives that later sort, which a
 * stable sort here does. */
async function withPromotionStatus(
  supabase: SupabaseClient<Database>,
  { shops, isMock }: ShopSearchResponse,
): Promise<ShopSearchActionResponse> {
  if (shops.length === 0) return { shops: [], isMock, rateLimited: false };

  const promotedIds = await getActivePromotedPlaceIds(
    supabase,
    shops.map((s) => s.placeId),
  );
  const withPromotion: ShopResult[] = shops.map((shop) => ({
    ...shop,
    isPromoted: promotedIds.has(shop.placeId),
  }));
  withPromotion.sort((a, b) => Number(b.isPromoted) - Number(a.isPromoted));

  return { shops: withPromotion, isMock, rateLimited: false };
}

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
}): Promise<ShopSearchActionResponse> {
  if (!isShopCategoryId(category)) return { shops: [], isMock: false, rateLimited: false };
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { shops: [], isMock: false, rateLimited: false };
  }

  const supabase = await createClient();

  // Checked before the rate limit, and a hit bypasses it entirely — a
  // cached answer costs nothing and didn't call Google at all, so there's
  // no reason to burn someone's limited quota (or make them wait) for a
  // search someone else already ran for the same category/area today.
  const cacheKey = buildPlacesCacheKey("category", category, lat, lng);
  const cached = await getCachedPlacesSearch(supabase, cacheKey);
  if (cached) return await withPromotionStatus(supabase, cached);

  const ip = await getClientIp();
  if (!(await isUnderShopsSearchRateLimit(supabase, ip))) {
    return { shops: [], isMock: false, rateLimited: true };
  }

  try {
    await recordShopsSearchAttempt(supabase, ip);
    const response = await getPlacesProvider().searchNearbyShops({ lat, lng, category });
    // Never cache a mock (not-configured) response — there's no cost to
    // save from it, and caching it would just serve a stale "not set up
    // yet" placeholder after the real key gets configured.
    if (!response.isMock) await setCachedPlacesSearch(cacheKey, response);
    return await withPromotionStatus(supabase, response);
  } catch (err) {
    console.error("searchNearbyShopsAction failed:", err);
    return { shops: [], isMock: false, rateLimited: false };
  }
}

const MAX_QUERY_LENGTH = 200;

/**
 * Backs "Promote your shop" — a free-text lookup so someone can find
 * their own business by name instead of browsing by category. Same
 * rate limit bucket as searchNearbyShopsAction (shared cost control, not
 * a separate allowance) since this is the same billed Places API call
 * under the hood, just with a different query.
 */
export async function searchShopsByQueryAction({
  lat,
  lng,
  query,
}: {
  lat: number;
  lng: number;
  query: string;
}): Promise<ShopSearchActionResponse> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length > MAX_QUERY_LENGTH) {
    return { shops: [], isMock: false, rateLimited: false };
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { shops: [], isMock: false, rateLimited: false };
  }

  const supabase = await createClient();

  // Same cache-before-rate-limit reasoning as searchNearbyShopsAction —
  // a repeat lookup for the same business name in the same area (someone
  // re-opening "Promote your shop" a day later, or two different people
  // searching the same shop) reuses the answer instead of paying again.
  const cacheKey = buildPlacesCacheKey("query", trimmed, lat, lng);
  const cached = await getCachedPlacesSearch(supabase, cacheKey);
  if (cached) return await withPromotionStatus(supabase, cached);

  const ip = await getClientIp();
  if (!(await isUnderShopsSearchRateLimit(supabase, ip))) {
    return { shops: [], isMock: false, rateLimited: true };
  }

  try {
    await recordShopsSearchAttempt(supabase, ip);
    const response = await getPlacesProvider().searchShopsByQuery({ lat, lng, query: trimmed });
    if (!response.isMock) await setCachedPlacesSearch(cacheKey, response);
    return await withPromotionStatus(supabase, response);
  } catch (err) {
    console.error("searchShopsByQueryAction failed:", err);
    return { shops: [], isMock: false, rateLimited: false };
  }
}

export interface CreateShopPromotionResult {
  error?: string;
  url?: string;
}

/**
 * Anyone can promote any shop — there's no ownership to verify since
 * shops come from Google, not a REVV account. Combines draft-creation and
 * checkout in one action (unlike meetups, which need a separate step in
 * between to attach photos) — same shape as createAdCampaignAction.
 */
export async function createShopPromotionAction({
  placeId,
  placeName,
  isNative,
}: {
  placeId: string;
  placeName: string;
  /** Same native-app redirect handling as ad/meetup checkout — Checkout
   * has to run in the system browser there, which needs a revv://
   * custom-scheme success/cancel URL instead of a normal one. */
  isNative: boolean;
}): Promise<CreateShopPromotionResult> {
  if (!isShopPromotionBillingConfigured()) {
    return { error: "Promoting a shop isn't set up yet." };
  }
  if (!placeId || !placeName) {
    return { error: "Couldn't identify that shop." };
  }

  const { supabase, user } = await requireUser();
  if (!user.email) return { error: "Your account needs a confirmed email." };

  let promotion;
  try {
    promotion = await createShopPromotion(supabase, {
      promoter_id: user.id,
      place_id: placeId,
      place_name: placeName,
      price_cents: SHOP_PROMOTION_PRICE_CENTS,
    });
  } catch {
    return { error: "Couldn't start that promotion. Try again." };
  }

  const origin = (await headers()).get("origin");
  const successUrl = isNative
    ? "revv://shop-promotion-checkout?success=1"
    : `${origin}/discover?success=1`;
  const cancelUrl = isNative ? "revv://shop-promotion-checkout" : `${origin}/discover`;

  let url: string | null;
  try {
    const session = await createShopPromotionCheckoutSession({
      promotionId: promotion.id,
      placeName: promotion.place_name,
      priceCents: promotion.price_cents,
      customerEmail: user.email,
      successUrl,
      cancelUrl,
    });
    url = session.url;
  } catch {
    return { error: "Couldn't start checkout. Try again." };
  }

  if (!url) return { error: "Couldn't start checkout. Try again." };
  return { url };
}
