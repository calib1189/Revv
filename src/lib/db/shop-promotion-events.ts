import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export async function recordShopPromotionEvent(
  supabase: SupabaseClient<Database>,
  placeId: string,
  kind: "impression" | "click",
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
