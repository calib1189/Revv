import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type ShopPromotion = Database["public"]["Tables"]["shop_promotions"]["Row"];
export type ShopPromotionInsert = Database["public"]["Tables"]["shop_promotions"]["Insert"];

/** One flat price/duration — anyone can promote any shop straight from
 * its card, no plan to pick. */
export const SHOP_PROMOTION_PRICE_CENTS = 1500;
export const SHOP_PROMOTION_DURATION_DAYS = 30;

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

/** Which of these place_ids currently have an active, unexpired
 * promotion — used to sort/badge search results after they come back
 * from Places API, since Google itself has no concept of this. */
export async function getActivePromotedPlaceIds(
  supabase: SupabaseClient<Database>,
  placeIds: string[],
): Promise<Set<string>> {
  if (placeIds.length === 0) return new Set();

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("shop_promotions")
    .select("place_id")
    .eq("status", "active")
    .gt("ends_at", nowIso)
    .in("place_id", placeIds);

  if (error) throw error;
  return new Set(data.map((row) => row.place_id));
}
