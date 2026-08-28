import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type ShopPromotion = Database["public"]["Tables"]["shop_promotions"]["Row"];
export type ShopPromotionInsert = Database["public"]["Tables"]["shop_promotions"]["Insert"];
export type ShopPromotionTier = ShopPromotion["tier"];

/** The only prices that exist — looked up server-side by tier key, never
 * trusted from the client, same reasoning as AD_TIERS/MEETUP_TIERS.
 * "Featured" sorts ahead of "standard" promotions too, not just ahead of
 * un-promoted shops — a real guaranteed-top-spot option, not just "ahead
 * of the pack". */
export const SHOP_PROMOTION_TIERS: Record<ShopPromotionTier, { label: string; priceCents: number }> = {
  standard: { label: "Promoted", priceCents: 2500 },
  featured: { label: "Featured — top spot", priceCents: 5000 },
};
export const SHOP_PROMOTION_DURATION_DAYS = 30;

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
    // overlapping an existing one) — featured always wins the display
    // tier regardless of insertion order.
    if (row.tier === "featured" || !tiers.has(row.place_id)) {
      tiers.set(row.place_id, row.tier);
    }
  }
  return tiers;
}
