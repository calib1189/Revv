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
import type { Shop } from "@/lib/providers/places-provider";

export interface ShopResult extends Shop {
  isPromoted: boolean;
}

export interface ShopSearchActionResponse {
  shops: ShopResult[];
  isMock: boolean;
}

/**
 * Backs the Discover page's "Shops near you" browser — public, so this
 * has to be safe for anonymous callers, same as
 * searchMarketplaceProductsAction. IP-based rate limiting instead of a
 * logged-in-user gate, and tighter than the marketplace one since this
 * one bills per call (see shops_search_attempts, 0044).
 *
 * Promoted-first ordering is computed here rather than in the UI: this
 * is the one place that already has both the raw Places results and a
 * real Supabase client to check shop_promotions against.
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
  if (!isShopCategoryId(category)) return { shops: [], isMock: false };
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { shops: [], isMock: false };

  const supabase = await createClient();
  const ip = await getClientIp();

  if (!(await isUnderShopsSearchRateLimit(supabase, ip))) {
    return { shops: [], isMock: false };
  }

  try {
    await recordShopsSearchAttempt(supabase, ip);
    const { shops, isMock } = await getPlacesProvider().searchNearbyShops({ lat, lng, category });
    if (shops.length === 0) return { shops: [], isMock };

    const promotedIds = await getActivePromotedPlaceIds(
      supabase,
      shops.map((s) => s.placeId),
    );
    const withPromotion: ShopResult[] = shops.map((shop) => ({
      ...shop,
      isPromoted: promotedIds.has(shop.placeId),
    }));
    // Promoted first; distance sort within each group happens client-side
    // (shops-browser.tsx already computes distance from the viewer's own
    // coordinates for display, so re-deriving it here would be
    // duplicated work for no benefit — this only needs to guarantee the
    // promoted/not-promoted grouping survives that later sort, which a
    // stable sort here does).
    withPromotion.sort((a, b) => Number(b.isPromoted) - Number(a.isPromoted));

    return { shops: withPromotion, isMock };
  } catch (err) {
    console.error("searchNearbyShopsAction failed:", err);
    return { shops: [], isMock: false };
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
