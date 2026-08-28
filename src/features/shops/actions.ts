"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { requireConfirmedUser as requireUser } from "@/lib/auth/require-confirmed-user";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getClientIp } from "@/lib/http/get-client-ip";
import { isUnderShopsSearchRateLimit, recordShopsSearchAttempt } from "@/lib/shops/search-rate-limit";
import { getPlacesProvider } from "@/lib/providers/get-places-provider";
import { isShopCategoryId } from "@/lib/shops/categories";
import { isShopPromotionBillingConfigured } from "@/lib/billing/config";
import { createShopPromotionCheckoutSession } from "@/lib/billing/stripe";
import {
  createShopPromotion,
  getActivePromotionTiers,
  isShopPromotionTier,
  listShopPromotionsByPromoter,
  SHOP_PROMOTION_TIERS,
  SHOP_PROMOTION_TIER_RANK,
  type ShopPromotion,
  type ShopPromotionTier,
} from "@/lib/db/shop-promotions";
import {
  recordShopPromotionEvent,
  getShopPromotionEventCounts,
  type ShopPromotionEventCounts,
} from "@/lib/db/shop-promotion-events";
import { buildPlacesCacheKey, getCachedPlacesSearch, setCachedPlacesSearch } from "@/lib/db/places-cache";
import type { Shop, ShopSearchResponse } from "@/lib/providers/places-provider";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export interface ShopResult extends Shop {
  /** Null when this shop has no active promotion. */
  promotionTier: ShopPromotionTier | null;
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
 * Diamond first, then Gold, then Silver, then everything else — shared
 * by both search actions below, since "promote your shop" needs to show
 * the same tier state a category browse would. Distance sort within each
 * group happens client-side (shops-browser.tsx already computes distance
 * from the viewer's own coordinates for display), so this only needs to
 * guarantee the tier grouping survives that later sort, which a stable
 * sort here does. */
async function withPromotionStatus(
  supabase: SupabaseClient<Database>,
  { shops, isMock }: ShopSearchResponse,
): Promise<ShopSearchActionResponse> {
  if (shops.length === 0) return { shops: [], isMock, rateLimited: false };

  const tiers = await getActivePromotionTiers(
    supabase,
    shops.map((s) => s.placeId),
  );
  const withPromotion: ShopResult[] = shops.map((shop) => ({
    ...shop,
    promotionTier: tiers.get(shop.placeId) ?? null,
  }));
  withPromotion.sort((a, b) => {
    const rankA = a.promotionTier ? SHOP_PROMOTION_TIER_RANK[a.promotionTier] : 0;
    const rankB = b.promotionTier ? SHOP_PROMOTION_TIER_RANK[b.promotionTier] : 0;
    return rankB - rankA;
  });

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
  tier,
  isNative,
}: {
  placeId: string;
  placeName: string;
  tier: string;
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
  if (!isShopPromotionTier(tier)) {
    return { error: "Choose a valid plan." };
  }

  const { supabase, user } = await requireUser();
  if (!user.email) return { error: "Your account needs a confirmed email." };

  let promotion;
  try {
    promotion = await createShopPromotion(supabase, {
      promoter_id: user.id,
      place_id: placeId,
      place_name: placeName,
      tier,
      price_cents: SHOP_PROMOTION_TIERS[tier].priceCents,
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

/** Fire-and-forget from ShopCard when a promoted card becomes visible or
 * gets tapped. Swallows its own errors and silently no-ops when logged
 * out — same reasoning and shape as recordAdEventBestEffort in
 * features/ads/actions.ts. */
async function recordShopPromotionEventBestEffort(
  placeId: string,
  kind: "impression" | "click",
): Promise<void> {
  try {
    const user = await getCurrentUser();
    if (!user) return;
    const supabase = await createClient();
    await recordShopPromotionEvent(supabase, placeId, kind, user.id);
  } catch {
    // best-effort only
  }
}

export async function recordShopPromotionImpressionAction(placeId: string): Promise<void> {
  await recordShopPromotionEventBestEffort(placeId, "impression");
}

export async function recordShopPromotionClickAction(placeId: string): Promise<void> {
  await recordShopPromotionEventBestEffort(placeId, "click");
}

export interface ShopPromotionWithCounts {
  promotion: ShopPromotion;
  counts: ShopPromotionEventCounts;
}

export interface MyShopPromotionsResponse {
  promotions: ShopPromotionWithCounts[];
  requiresAuth: boolean;
}

/** Backs the "My promotions" panel. Returns requiresAuth rather than
 * throwing when logged out, so the panel can show a clean "log in to see
 * this" message instead of a generic error. */
export async function getMyShopPromotionsAction(): Promise<MyShopPromotionsResponse> {
  const user = await getCurrentUser();
  if (!user) return { promotions: [], requiresAuth: true };

  const supabase = await createClient();
  const promotions = await listShopPromotionsByPromoter(supabase, user.id);
  const withCounts = await Promise.all(
    promotions.map(async (promotion) => ({
      promotion,
      counts: await getShopPromotionEventCounts(supabase, promotion.id),
    })),
  );
  return { promotions: withCounts, requiresAuth: false };
}
