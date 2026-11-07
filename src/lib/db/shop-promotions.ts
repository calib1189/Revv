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
 * un-promoted shops — Diamond is real top-tier placement. It is NOT a
 * guaranteed #1 slot: if two shops in the same area both buy Diamond,
 * they're tie-broken by distance from whoever's viewing (see the sort in
 * shops-browser.tsx), same as any other tier group. Don't market it as
 * exclusive in copy — see promote-shop-panel.tsx's tier subtitles. */
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

/** Backs the "My promotions" panel — every promotion someone has ever
 * paid for, newest first, regardless of status (a pending_payment row
 * that never completed still shows, same as a `pending_review` ad
 * campaign would on /advertise). */
export async function listShopPromotionsByPromoter(
  supabase: SupabaseClient<Database>,
  promoterId: string,
): Promise<ShopPromotion[]> {
  const { data, error } = await supabase
    .from("shop_promotions")
    .select("*")
    .eq("promoter_id", promoterId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

/** Every currently active (paid, unexpired) shop promotion, regardless of
 * who bought it — the admin "what's live right now" view, unlike
 * listShopPromotionsByPromoter (scoped to one person) or
 * getActivePromotionTiers (scoped to specific place_ids). */
export async function listAllActiveShopPromotions(
  supabase: SupabaseClient<Database>,
): Promise<ShopPromotion[]> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("shop_promotions")
    .select("*")
    .eq("status", "active")
    .gt("ends_at", nowIso)
    .order("ends_at", { ascending: true });

  if (error) throw error;
  return data;
}

/** Every live (unexpired) promotion on one shop, newest first — backs the
 * admin's comp card on the shop page, which needs to see what's already
 * running there before granting another. */
export async function listLiveShopPromotionsForPlace(
  supabase: SupabaseClient<Database>,
  placeId: string,
): Promise<ShopPromotion[]> {
  const { data, error } = await supabase
    .from("shop_promotions")
    .select("*")
    .eq("place_id", placeId)
    .eq("status", "active")
    .gt("ends_at", new Date().toISOString())
    .order("ends_at", { ascending: false });

  if (error) throw error;
  return data;
}

/** An admin's free promotion (0100). Inserted already active — there's
 * no payment to wait for — under the admin's own session, which RLS only
 * allows for a $0 row stamped with that admin's id. */
export async function createCompedShopPromotion(
  supabase: SupabaseClient<Database>,
  input: {
    adminId: string;
    placeId: string;
    placeName: string;
    tier: ShopPromotionTier;
    category: string | null;
    startsAt: Date;
    endsAt: Date;
  },
): Promise<ShopPromotion> {
  return createShopPromotion(supabase, {
    promoter_id: input.adminId,
    comped_by: input.adminId,
    place_id: input.placeId,
    place_name: input.placeName,
    tier: input.tier,
    category: input.category,
    price_cents: 0,
    status: "active",
    starts_at: input.startsAt.toISOString(),
    ends_at: input.endsAt.toISOString(),
  });
}

/** Ends a comped promotion now. RLS (0100) only lets an admin do this,
 * and only to a comped row — a paid promotion's dates never move. */
export async function endCompedShopPromotion(
  supabase: SupabaseClient<Database>,
  promotionId: string,
): Promise<void> {
  const { error } = await supabase
    .from("shop_promotions")
    .update({ ends_at: new Date().toISOString() })
    .eq("id", promotionId)
    .not("comped_by", "is", null);

  if (error) throw error;
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
