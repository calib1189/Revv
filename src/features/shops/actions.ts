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
  getShopAnalyticsCounts,
  hasPromotedShop,
  canViewShopAnalytics,
  type ShopPromotionEventCounts,
  type ShopPromotionEventKind,
  type ShopAnalyticsCounts,
} from "@/lib/db/shop-promotion-events";
import {
  deleteShopPicture,
  getShopPicture,
  getShopPictureUrls,
  insertShopPicture,
  updateShopPictureMedia,
} from "@/lib/db/shop-pictures";
import { getMediaById } from "@/lib/db/media";
import {
  buildPlacesCacheKey,
  buildPlacesTextLocationCacheKey,
  getCachedPlacesSearch,
  setCachedPlacesSearch,
  buildShopDetailsCacheKey,
  getCachedShopDetails,
  setCachedShopDetails,
} from "@/lib/db/places-cache";
import type { Shop, ShopSearchResponse, ShopDetails } from "@/lib/providers/places-provider";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export interface ShopResult extends Shop {
  /** Null when this shop has no active promotion. */
  promotionTier: ShopPromotionTier | null;
  /** The shop's profile picture — a verified business's logo, or one a
   * promoter added (see getShopPictureUrls). Null when it has neither. */
  pictureUrl: string | null;
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

  const placeIds = shops.map((s) => s.placeId);
  const tiers = await getActivePromotionTiers(supabase, placeIds);
  // Pictures are decoration: a failed lookup (or 0093 not applied yet)
  // shows the category icon, never an empty search.
  const pictureUrls = await getShopPictureUrls(supabase, placeIds).catch(
    () => new Map<string, string>(),
  );
  const withPromotion: ShopResult[] = shops.map((shop) => ({
    ...shop,
    promotionTier: tiers.get(shop.placeId) ?? null,
    pictureUrl: pictureUrls.get(shop.placeId) ?? null,
  }));
  withPromotion.sort((a, b) => {
    const rankA = a.promotionTier ? SHOP_PROMOTION_TIER_RANK[a.promotionTier] : 0;
    const rankB = b.promotionTier ? SHOP_PROMOTION_TIER_RANK[b.promotionTier] : 0;
    return rankB - rankA;
  });

  return { shops: withPromotion, isMock, rateLimited: false };
}

/**
 * A promoted shop otherwise only ever shows up if Google's own Text
 * Search happens to surface it for this category's keyword query near
 * this location — that's the actual bug behind "I promoted my shop and
 * don't see it": Google's relevance ranking (review count, prominence,
 * name match) decides the 20 results a search returns, and a
 * promotion re-sorts/badges whatever's already in that list, it can't
 * pull in something Google left out. This looks up every active
 * promotion that targets this category (or targets no category at all
 * — see 0059's migration comment for why null means "every category")
 * and, for whichever of those didn't make it into the organic results,
 * fetches its own listing via Place Details and adds it in — a paying
 * customer's guaranteed visibility, not just better placement among
 * whatever Google decided to show anyway.
 *
 * Deliberately doesn't go through the per-IP search rate limit — the
 * Details calls this makes are bounded by how many promotions are
 * actually active (not by how many people are searching) and already
 * share the same 24h cache every other Details lookup uses, so the
 * real incremental Google cost is one call per promoted place per day,
 * not per request.
 */
async function injectMissingPromotedShops(
  supabase: SupabaseClient<Database>,
  category: string,
  shops: Shop[],
): Promise<Shop[]> {
  const nowIso = new Date().toISOString();
  const { data: promotions, error } = await supabase
    .from("shop_promotions")
    .select("place_id")
    .eq("status", "active")
    .gt("ends_at", nowIso)
    .or(`category.eq.${category},category.is.null`);
  if (error) throw error;
  if (promotions.length === 0) return shops;

  const existingIds = new Set(shops.map((s) => s.placeId));
  const missingIds = [...new Set(promotions.map((p) => p.place_id))].filter((id) => !existingIds.has(id));
  if (missingIds.length === 0) return shops;

  const injected = await Promise.all(
    missingIds.map(async (placeId): Promise<ShopDetails | null> => {
      const cacheKey = buildShopDetailsCacheKey(placeId);
      const cached = await getCachedShopDetails(supabase, cacheKey);
      if (cached) return cached.shop;
      try {
        const response = await getPlacesProvider().getShopDetails(placeId);
        if (!response.isMock && response.shop) await setCachedShopDetails(cacheKey, response);
        return response.isMock ? null : response.shop;
      } catch {
        // A promotion whose place_id Google no longer recognizes (the
        // business closed, was removed from Google) just doesn't get
        // injected — nothing left to show.
        return null;
      }
    }),
  );

  return [...shops, ...injected.filter((shop): shop is ShopDetails => shop !== null)];
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
  if (cached) {
    const shops = await injectMissingPromotedShops(supabase, category, cached.shops);
    return await withPromotionStatus(supabase, { shops, isMock: cached.isMock });
  }

  const ip = await getClientIp();
  if (!(await isUnderShopsSearchRateLimit(supabase, ip))) {
    return { shops: [], isMock: false, rateLimited: true };
  }

  try {
    await recordShopsSearchAttempt(supabase, ip);
    const response = await getPlacesProvider().searchNearbyShops({ lat, lng, category });
    // Never cache a mock (not-configured) response — there's no cost to
    // save from it, and caching it would just serve a stale "not set up
    // yet" placeholder after the real key gets configured. Cached before
    // injection, not after — an injected promotion should reflect
    // whatever's active right now, not get frozen into this key's 24h
    // cache regardless of when that promotion actually expires.
    if (!response.isMock) await setCachedPlacesSearch(cacheKey, response);
    const shops = await injectMissingPromotedShops(supabase, category, response.shops);
    return await withPromotionStatus(supabase, { shops, isMock: response.isMock });
  } catch (err) {
    console.error("searchNearbyShopsAction failed:", err);
    return { shops: [], isMock: false, rateLimited: false };
  }
}

const MAX_LOCATION_TEXT_LENGTH = 100;

/**
 * Same category browse as searchNearbyShopsAction, for a viewer who
 * denied (or was never asked for) location and typed a city/zip/address
 * instead — see shops-browser.tsx's "denied" state. No lat/lng at all,
 * so results carry no distance and injectMissingPromotedShops still
 * runs (a promotion should still be guaranteed visible here), but there's
 * no viewer coordinate to sort promoted-vs-not by distance against
 * client-side.
 */
export async function searchShopsInLocationTextAction({
  locationText,
  category,
}: {
  locationText: string;
  category: string;
}): Promise<ShopSearchActionResponse> {
  const trimmed = locationText.trim();
  if (!isShopCategoryId(category) || !trimmed || trimmed.length > MAX_LOCATION_TEXT_LENGTH) {
    return { shops: [], isMock: false, rateLimited: false };
  }

  const supabase = await createClient();

  const cacheKey = buildPlacesTextLocationCacheKey(category, trimmed);
  const cached = await getCachedPlacesSearch(supabase, cacheKey);
  if (cached) {
    const shops = await injectMissingPromotedShops(supabase, category, cached.shops);
    return await withPromotionStatus(supabase, { shops, isMock: cached.isMock });
  }

  const ip = await getClientIp();
  if (!(await isUnderShopsSearchRateLimit(supabase, ip))) {
    return { shops: [], isMock: false, rateLimited: true };
  }

  try {
    await recordShopsSearchAttempt(supabase, ip);
    const response = await getPlacesProvider().searchShopsInLocationText({ locationText: trimmed, category });
    if (!response.isMock) await setCachedPlacesSearch(cacheKey, response);
    const shops = await injectMissingPromotedShops(supabase, category, response.shops);
    return await withPromotionStatus(supabase, { shops, isMock: response.isMock });
  } catch (err) {
    console.error("searchShopsInLocationTextAction failed:", err);
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
 * shops come from Google, not a SORZA account. Combines draft-creation and
 * checkout in one action (unlike meetups, which need a separate step in
 * between to attach photos) — same shape as createAdCampaignAction.
 */
export async function createShopPromotionAction({
  placeId,
  placeName,
  tier,
  category,
  pictureMediaId,
}: {
  placeId: string;
  placeName: string;
  tier: string;
  /** A photo the promoter just uploaded to become the shop's profile
   * picture once this is paid for (see applyPromotionPicture). */
  pictureMediaId?: string | null;
  /** Which category browse this promotion should guarantee visibility
   * in — see searchNearbyShopsAction's injectMissingPromotedShops. Null
   * when the promoter came from a context with no category to infer
   * (currently: the "Promote your shop" search panel) rather than a
   * category-filtered shop card — treated as "every category" rather
   * than "none", since that's a strictly safer default for a paying
   * customer than guaranteeing nothing. */
  category?: string | null;
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
  if (category && !isShopCategoryId(category)) {
    return { error: "Choose a valid category." };
  }

  const { supabase, user } = await requireUser();
  if (!user.email) return { error: "Your account needs a confirmed email." };

  if (pictureMediaId) {
    const media = await getMediaById(supabase, pictureMediaId).catch(() => null);
    if (!media || media.owner_id !== user.id || media.kind !== "image") {
      return { error: "Couldn't use that picture. Choose it again." };
    }
  }

  let promotion;
  try {
    promotion = await createShopPromotion(supabase, {
      promoter_id: user.id,
      place_id: placeId,
      place_name: placeName,
      tier,
      category: category ?? null,
      price_cents: SHOP_PROMOTION_TIERS[tier].priceCents,
      // Only sent when there is one, so promoting still works before
      // 0093 (which adds the column) has been applied.
      ...(pictureMediaId ? { picture_media_id: pictureMediaId } : {}),
    });
  } catch {
    return { error: "Couldn't start that promotion. Try again." };
  }

  // Native never reaches this action at all anymore (see
  // createWebHandoffAction's doc comment) — checkout only ever runs on
  // the web, so these are always plain web URLs. Both come back to the
  // shop's own page: that's where its picture and analytics live.
  const origin = (await headers()).get("origin");
  const shopPath = `/discover/shop/${encodeURIComponent(placeId)}`;
  const categoryQuery = category ? `category=${encodeURIComponent(category)}&` : "";
  const successUrl = `${origin}${shopPath}?${categoryQuery}promoted=1`;
  const cancelUrl = `${origin}${shopPath}${category ? `?category=${encodeURIComponent(category)}` : ""}#promote`;

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
  kind: ShopPromotionEventKind,
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

export async function recordShopProfileVisitAction(placeId: string): Promise<void> {
  await recordShopPromotionEventBestEffort(placeId, "profile_visit");
}

export async function recordShopInquiryAction(placeId: string): Promise<void> {
  await recordShopPromotionEventBestEffort(placeId, "inquiry");
}

export async function recordShopWebsiteClickAction(placeId: string): Promise<void> {
  await recordShopPromotionEventBestEffort(placeId, "website_click");
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

export interface ShopDetailsActionResponse {
  shop: (ShopDetails & { promotionTier: ShopPromotionTier | null }) | null;
  isMock: boolean;
  rateLimited: boolean;
}

/**
 * Backs the shop detail page — public, same reasoning as the search
 * actions (anonymous visitors are the common case for "someone tapped a
 * shop card"). Shares the same IP rate-limit bucket as search: this is
 * a real, separately-billed Google call (Place Details, not Text
 * Search), and there's no reason to give it its own, larger allowance
 * just because it's a different endpoint under the hood.
 */
export async function getShopDetailsAction(placeId: string): Promise<ShopDetailsActionResponse> {
  if (!placeId) return { shop: null, isMock: false, rateLimited: false };

  const supabase = await createClient();

  const cacheKey = buildShopDetailsCacheKey(placeId);
  const cached = await getCachedShopDetails(supabase, cacheKey);
  if (cached) return await withDetailsPromotionStatus(supabase, cached);

  const ip = await getClientIp();
  if (!(await isUnderShopsSearchRateLimit(supabase, ip))) {
    return { shop: null, isMock: false, rateLimited: true };
  }

  try {
    await recordShopsSearchAttempt(supabase, ip);
    const response = await getPlacesProvider().getShopDetails(placeId);
    if (!response.isMock) await setCachedShopDetails(cacheKey, response);
    return await withDetailsPromotionStatus(supabase, response);
  } catch (err) {
    console.error("getShopDetailsAction failed:", err);
    return { shop: null, isMock: false, rateLimited: false };
  }
}

async function withDetailsPromotionStatus(
  supabase: SupabaseClient<Database>,
  { shop, isMock }: { shop: ShopDetails | null; isMock: boolean },
): Promise<ShopDetailsActionResponse> {
  if (!shop) return { shop: null, isMock, rateLimited: false };
  const tiers = await getActivePromotionTiers(supabase, [shop.placeId]);
  return {
    shop: { ...shop, promotionTier: tiers.get(shop.placeId) ?? null },
    isMock,
    rateLimited: false,
  };
}

export interface ShopAnalyticsResponse {
  counts: ShopAnalyticsCounts;
  /** False if the current viewer has never actively promoted this
   * place — the page uses this to hide the analytics section entirely
   * rather than show a wall of zeroes that would look like the shop
   * simply has no traffic. */
  hasAccess: boolean;
  requiresAuth: boolean;
}

/** Backs the "SORZA Business Analytics" section of the shop detail page.
 * Only returns real counts for someone who has actually paid to promote
 * this exact place at some point — enforced server-side by
 * get_shop_analytics_counts itself, not just this action, since shops
 * have no SORZA-account ownership model beyond "you promoted this
 * listing". */
export async function getShopAnalyticsAction(placeId: string): Promise<ShopAnalyticsResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return { counts: EMPTY_SHOP_ANALYTICS, hasAccess: false, requiresAuth: true };
  }

  const supabase = await createClient();
  const hasAccess = await canViewShopAnalytics(supabase, placeId);
  if (!hasAccess) {
    return { counts: EMPTY_SHOP_ANALYTICS, hasAccess: false, requiresAuth: false };
  }

  const counts = await getShopAnalyticsCounts(supabase, placeId);
  return { counts, hasAccess: true, requiresAuth: false };
}

export interface ShopPictureResult {
  error?: string;
}

/** Sets (or changes) a shop's profile picture from a photo the person
 * just uploaded. RLS is the real gate (0093) — these checks are only so
 * each refusal comes back with the actual reason. */
export async function saveShopPictureAction({
  placeId,
  mediaId,
}: {
  placeId: string;
  mediaId: string;
}): Promise<ShopPictureResult> {
  if (!placeId || !mediaId) return { error: "Choose a picture first." };
  const { supabase, user } = await requireUser();

  try {
    const existing = await getShopPicture(supabase, placeId);
    if (existing && existing.owner_id !== user.id) {
      return { error: "Someone else has already added this shop's picture." };
    }
    if (existing) {
      await updateShopPictureMedia(supabase, placeId, mediaId);
      return {};
    }
    if (!(await hasPromotedShop(supabase, placeId))) {
      return { error: "Promote this shop first to add its picture." };
    }
    await insertShopPicture(supabase, { placeId, ownerId: user.id, mediaId });
    return {};
  } catch {
    return { error: "Couldn't save that picture. Try again." };
  }
}

/** For the picture's owner, or an admin taking one down. */
export async function removeShopPictureAction(placeId: string): Promise<ShopPictureResult> {
  const { supabase } = await requireUser();
  try {
    const removed = await deleteShopPicture(supabase, placeId);
    return removed ? {} : { error: "Only whoever added this picture can remove it." };
  } catch {
    return { error: "Couldn't remove that picture. Try again." };
  }
}

const EMPTY_SHOP_ANALYTICS: ShopAnalyticsCounts = {
  impressions: 0,
  profileVisits: 0,
  clicks: 0,
  inquiries: 0,
  websiteClicks: 0,
};
