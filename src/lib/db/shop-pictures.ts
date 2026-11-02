import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getMediaById, publicMediaUrl } from "@/lib/db/media";
import type { ShopPromotion } from "@/lib/db/shop-promotions";

export type ShopPicture = Database["public"]["Tables"]["shop_pictures"]["Row"];

/** Which photo each place shows, as media ids: a verified business's own
 * logo wins, then the picture a promoter added (see 0093). Pure so the
 * precedence is testable apart from the queries feeding it. */
export function pickShopPictureMediaIds(
  businessLogos: { place_id: string; logo_media_id: string | null }[],
  shopPictures: { place_id: string; media_id: string }[],
): Map<string, string> {
  const picked = new Map<string, string>();
  for (const picture of shopPictures) picked.set(picture.place_id, picture.media_id);
  for (const business of businessLogos) {
    if (business.logo_media_id) picked.set(business.place_id, business.logo_media_id);
  }
  return picked;
}

/** The photo URL for each of these places that has one — backs the shop
 * cards in Shops. Places with neither a verified logo nor a picture are
 * simply absent. */
export async function getShopPictureUrls(
  supabase: SupabaseClient<Database>,
  placeIds: string[],
): Promise<Map<string, string>> {
  if (placeIds.length === 0) return new Map();

  const [businesses, pictures] = await Promise.all([
    // RLS also returns an owner's own unapproved claim, so the status
    // filter has to be explicit here.
    supabase
      .from("business_profiles")
      .select("place_id, logo_media_id")
      .in("place_id", placeIds)
      .eq("verification_status", "approved"),
    supabase.from("shop_pictures").select("place_id, media_id").in("place_id", placeIds),
  ]);
  if (businesses.error) throw businesses.error;
  if (pictures.error) throw pictures.error;

  const mediaIdByPlace = pickShopPictureMediaIds(businesses.data, pictures.data);
  if (mediaIdByPlace.size === 0) return new Map();

  const { data: media, error } = await supabase
    .from("media")
    .select("id, storage_path")
    .in("id", [...new Set(mediaIdByPlace.values())]);
  if (error) throw error;

  const pathById = new Map(media.map((m) => [m.id, m.storage_path]));
  const urls = new Map<string, string>();
  for (const [placeId, mediaId] of mediaIdByPlace) {
    const path = pathById.get(mediaId);
    if (path) urls.set(placeId, publicMediaUrl(supabase, path));
  }
  return urls;
}

export async function getShopPicture(
  supabase: SupabaseClient<Database>,
  placeId: string,
): Promise<ShopPicture | null> {
  const { data, error } = await supabase
    .from("shop_pictures")
    .select("*")
    .eq("place_id", placeId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function insertShopPicture(
  supabase: SupabaseClient<Database>,
  input: { placeId: string; ownerId: string; mediaId: string },
): Promise<void> {
  const { error } = await supabase
    .from("shop_pictures")
    .insert({ place_id: input.placeId, owner_id: input.ownerId, media_id: input.mediaId });
  if (error) throw error;
}

export async function updateShopPictureMedia(
  supabase: SupabaseClient<Database>,
  placeId: string,
  mediaId: string,
): Promise<void> {
  const { error } = await supabase
    .from("shop_pictures")
    .update({ media_id: mediaId })
    .eq("place_id", placeId);
  if (error) throw error;
}

/** RLS limits this to the picture's owner or an admin; for anyone else
 * it deletes nothing, so the row count is what tells them apart. */
export async function deleteShopPicture(
  supabase: SupabaseClient<Database>,
  placeId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("shop_pictures")
    .delete()
    .eq("place_id", placeId)
    .select("place_id");
  if (error) throw error;
  return data.length > 0;
}

/** Called from the Stripe webhook (service role) once a promotion is
 * paid: the picture chosen in the promote form becomes the shop's — if
 * the shop has none yet, or the promoter already owns it. Someone else's
 * existing picture is left alone, same rule the RLS policies enforce for
 * everyone else. The photo must be the promoter's own upload: the draft
 * row is client-insertable, so its picture_media_id isn't trusted here. */
export async function applyPromotionPicture(
  supabase: SupabaseClient<Database>,
  promotion: Pick<ShopPromotion, "place_id" | "promoter_id" | "picture_media_id">,
): Promise<void> {
  if (!promotion.picture_media_id) return;

  const media = await getMediaById(supabase, promotion.picture_media_id);
  if (!media || media.owner_id !== promotion.promoter_id || media.kind !== "image") return;

  const existing = await getShopPicture(supabase, promotion.place_id);
  if (!existing) {
    await insertShopPicture(supabase, {
      placeId: promotion.place_id,
      ownerId: promotion.promoter_id,
      mediaId: media.id,
    });
  } else if (existing.owner_id === promotion.promoter_id) {
    await updateShopPictureMedia(supabase, promotion.place_id, media.id);
  }
}
