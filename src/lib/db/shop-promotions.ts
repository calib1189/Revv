import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type ShopPromotion = Database["public"]["Tables"]["shop_promotions"]["Row"];
export type ShopPromotionInsert = Database["public"]["Tables"]["shop_promotions"]["Insert"];
export type ShopPromotionTier = ShopPromotion["tier"];

/** The only prices that exist — looked up server-side by tier key, never
 * trusted from the client, same reasoning as AD_TIERS/MEETUP_TIERS.
 * Labels match the Silver/Gold/Diamond branding used across every paid
 * tier in the app (ads, meetups, shop promotions) — purely a naming/UI
 * convention shared with the build-rating rank system's color palette
 * (see components/ui/tier-picker.tsx), not connected to it in any other
 * way. Each tier sorts ahead of every tier below it, not just ahead of
 * un-promoted shops — Diamond is a real guaranteed-top-spot option, not
 * just "ahead of the pack". */
export const SHOP_PROMOTION_TIERS: Record<ShopPromotionTier, { label: string; priceCents: number }> = {
  standard: { label: "Silver", priceCents: 2500 },
  featured: { label: "Gold", priceCents: 5000 },
  diamond: { label: "Diamond", priceCents: 10000 },
};
export const SHOP_PROMOTION_DURATION_DAYS = 30;

/** Higher first — the single source of truth for ranking tiers against
 * each other (and against "no promotion", rank 0). Search-result sorting
 * and the "which tier wins for badging" logic below both derive from
 * this instead of each hardcoding their own copy of the ordering. */
export const SHOP_PROMOTION_TIER_RANK: Record<ShopPromotionTier, number> = {
  diamond: 3,
  featured: 2,
  standard: 1,
};

export function isShopPromotionTier(value: string): value is ShopPromotionTier {
  return value in SHOP_PROMOTION_TIERS;
}

export async function createShopPromotion(
  supabase: SupabaseClient<Database>,
  input: ShopPromotionInsert,
): Promise<ShopPromotion> {
  const { data, error } = await supabase
    .from("shop_promotions")
    .insert(input)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function getShopPromotionById(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<ShopPromotion | null> {
  const { data, error } = await supabase
    .from("shop_promotions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/** Which tier (if any) each of these place_ids currently has an active,
 * unexpired promotion at — used to sort/badge search results after they
 * come back from Places API, since Google itself has no concept of this.
 * A Map rather than a Set now that there's more than one tier to
 * distinguish between for sorting/badging. */
export async function getActivePromotionTiers(
  supabase: SupabaseClient<Database>,
  placeIds: string[],
): Promise<Map<string, ShopPromotionTier>> {
  if (placeIds.length === 0) return new Map();

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("shop_promotions")
    .select("place_id, tier")
    .eq("status", "active")
    .gt("ends_at", nowIso)
    .in("place_id", placeIds);

  if (error) throw error;

  const tiers = new Map<string, ShopPromotionTier>();
  for (const row of data) {
    // A place could theoretically have more than one active promotion
    // (two different people promoting the same shop, or a renewal
    // overlapping an existing one) — the highest tier always wins the
    // display tier regardless of insertion order.
    const existing = tiers.get(row.place_id);
    if (!existing || SHOP_PROMOTION_TIER_RANK[row.tier] > SHOP_PROMOTION_TIER_RANK[existing]) {
      tiers.set(row.place_id, row.tier);
    }
  }
  return tiers;
}
