import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type ShopPromotionEventKind = "impression" | "click" | "profile_visit" | "inquiry" | "website_click";

export async function recordShopPromotionEvent(
  supabase: SupabaseClient<Database>,
  placeId: string,
  kind: ShopPromotionEventKind,
  viewerId: string,
): Promise<void> {
  const { error } = await supabase
    .from("shop_promotion_events")
    .insert({ place_id: placeId, kind, viewer_id: viewerId });
  if (error) throw error;
}

export interface ShopPromotionEventCounts {
  impressions: number;
  clicks: number;
}

/** Reads through get_shop_promotion_event_counts (0053) rather than
 * selecting shop_promotion_events directly — that table has no select
 * policy at all, since it's private performance data, not something
 * readable by RLS row-ownership alone (events are keyed by place_id, not
 * by promotion or promoter). The function checks promoter_id and the
 * promotion's own paid date window server-side before returning
 * anything. Same untyped-cast-and-.rpc() pattern as
 * isUnderShopsSearchRateLimit, since Functions isn't populated in the
 * generated Database type. */
export async function getShopPromotionEventCounts(
  supabase: SupabaseClient<Database>,
  promotionId: string,
): Promise<ShopPromotionEventCounts> {
  const untyped = supabase as unknown as SupabaseClient;
  const { data, error } = await untyped
    .rpc("get_shop_promotion_event_counts", { p_promotion_id: promotionId })
    .single();
  if (error || !data) return { impressions: 0, clicks: 0 };
  const row = data as { impressions: number | string; clicks: number | string };
  return { impressions: Number(row.impressions), clicks: Number(row.clicks) };
}

export interface ShopAnalyticsCounts {
  impressions: number;
  profileVisits: number;
  clicks: number;
  inquiries: number;
  websiteClicks: number;
}

const EMPTY_ANALYTICS: ShopAnalyticsCounts = {
  impressions: 0,
  profileVisits: 0,
  clicks: 0,
  inquiries: 0,
  websiteClicks: 0,
};

/** All-time analytics for a place, not scoped to one promotion's paid
 * date window — reads through get_shop_analytics_counts (0056), which
 * itself checks the caller has ever had an active promotion for this
 * place before returning anything real. Returns all-zero (not an error)
 * for a shop the caller has never promoted, same "fail to an honest
 * empty state" reasoning as getShopPromotionEventCounts. */
export async function getShopAnalyticsCounts(
  supabase: SupabaseClient<Database>,
  placeId: string,
): Promise<ShopAnalyticsCounts> {
  const untyped = supabase as unknown as SupabaseClient;
  const { data, error } = await untyped
    .rpc("get_shop_analytics_counts", { p_place_id: placeId })
    .single();
  if (error || !data) return EMPTY_ANALYTICS;
  const row = data as Record<
    "impressions" | "profile_visits" | "clicks" | "inquiries" | "website_clicks",
    number | string
  >;
  return {
    impressions: Number(row.impressions),
    profileVisits: Number(row.profile_visits),
    clicks: Number(row.clicks),
    inquiries: Number(row.inquiries),
    websiteClicks: Number(row.website_clicks),
  };
}

/** Whether the current user has ever actively promoted this place —
 * gates whether the shop detail page offers a "View analytics" link,
 * without needing a specific promotion id up front. */
export async function hasPromotedShop(
  supabase: SupabaseClient<Database>,
  placeId: string,
): Promise<boolean> {
  const untyped = supabase as unknown as SupabaseClient;
  const { data, error } = await untyped.rpc("has_promoted_shop", { p_place_id: placeId });
  if (error) return false;
  return Boolean(data);
}
