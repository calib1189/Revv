import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type ShopReview = Database["public"]["Tables"]["shop_reviews"]["Row"];

/** Every review of one shop, newest first. Shops get few enough reviews
 * that the page reads them all and computes the summary itself. */
export async function listShopReviews(
  supabase: SupabaseClient<Database>,
  placeId: string,
): Promise<ShopReview[]> {
  const { data, error } = await supabase
    .from("shop_reviews")
    .select("*")
    .eq("place_id", placeId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data;
}

export async function getShopReviewById(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<ShopReview | null> {
  const { data, error } = await supabase.from("shop_reviews").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

/** place_id for each of these reviews — lets Activity link a review
 * notification to its shop. */
export async function getShopReviewPlaceIds(
  supabase: SupabaseClient<Database>,
  ids: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  const { data, error } = await supabase.from("shop_reviews").select("id, place_id").in("id", ids);
  if (error) throw error;
  for (const row of data) map.set(row.id, row.place_id);
  return map;
}

/** Writes or rewrites the signed-in user's review of a shop (one each). */
export async function upsertShopReview(
  supabase: SupabaseClient<Database>,
  input: {
    placeId: string;
    authorId: string;
    vehicleId: string | null;
    rating: number;
    service: string | null;
    body: string | null;
  },
): Promise<ShopReview> {
  const { data, error } = await supabase
    .from("shop_reviews")
    .upsert(
      {
        place_id: input.placeId,
        author_id: input.authorId,
        vehicle_id: input.vehicleId,
        rating: input.rating,
        service: input.service,
        body: input.body,
      },
      { onConflict: "place_id,author_id" },
    )
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteShopReview(supabase: SupabaseClient<Database>, id: string): Promise<void> {
  const { error } = await supabase.from("shop_reviews").delete().eq("id", id);
  if (error) throw error;
}

/** The shop owner's reply (null removes it). The 0102 trigger stamps the
 * time and stops anyone but the verified owner from changing it. */
export async function setShopReviewReply(
  supabase: SupabaseClient<Database>,
  id: string,
  reply: string | null,
): Promise<void> {
  const { error } = await supabase.from("shop_reviews").update({ owner_reply: reply }).eq("id", id);
  if (error) throw error;
}
