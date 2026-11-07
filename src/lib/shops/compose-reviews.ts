import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { ShopReview } from "@/lib/db/shop-reviews";
import { getProfilesByIds } from "@/lib/db/profiles";
import { listVehiclesByIds } from "@/lib/db/vehicles";
import { listActiveBuildsByVehicleIds } from "@/lib/db/builds";
import { getMediaByIds, publicMediaUrl } from "@/lib/db/media";

export interface ReviewEntry {
  id: string;
  authorId: string;
  username: string;
  avatarUrl: string | null;
  isVerified: boolean;
  rating: number;
  service: string | null;
  body: string | null;
  ownerReply: string | null;
  ownerRepliedAt: string | null;
  createdAt: string;
  edited: boolean;
  vehicleId: string | null;
  vehicleTitle: string | null;
  carPhotoUrl: string | null;
  /** The car's current SORZA rating, or null if unrated. */
  carScore: number | null;
}

/** Resolves review rows into what the shop page shows: who wrote it, the
 * car they brought and its rating. Batched, not one query per review. */
export async function composeReviews(
  supabase: SupabaseClient<Database>,
  reviews: ShopReview[],
): Promise<ReviewEntry[]> {
  if (reviews.length === 0) return [];

  const vehicleIds = reviews.map((r) => r.vehicle_id).filter((id): id is string => id != null);
  const [profiles, vehicles, builds] = await Promise.all([
    getProfilesByIds(supabase, [...new Set(reviews.map((r) => r.author_id))]),
    listVehiclesByIds(supabase, vehicleIds),
    listActiveBuildsByVehicleIds(supabase, vehicleIds),
  ]);
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const vehicleById = new Map(vehicles.map((v) => [v.id, v]));

  const mediaIds = [...vehicles.map((v) => v.hero_media_id), ...profiles.map((p) => p.avatar_media_id)].filter(
    (id): id is string => Boolean(id),
  );
  const media = await getMediaByIds(supabase, [...new Set(mediaIds)]);
  const urlByMediaId = new Map(media.map((m) => [m.id, publicMediaUrl(supabase, m.storage_path)]));

  return reviews.map((r): ReviewEntry => {
    const profile = profileById.get(r.author_id);
    const vehicle = r.vehicle_id ? vehicleById.get(r.vehicle_id) : undefined;
    return {
      id: r.id,
      authorId: r.author_id,
      username: profile?.username ?? "unknown",
      avatarUrl: profile?.avatar_media_id ? (urlByMediaId.get(profile.avatar_media_id) ?? null) : null,
      isVerified: profile?.is_verified ?? false,
      rating: r.rating,
      service: r.service,
      body: r.body,
      ownerReply: r.owner_reply,
      ownerRepliedAt: r.owner_replied_at,
      createdAt: r.created_at,
      edited: new Date(r.updated_at).getTime() - new Date(r.created_at).getTime() > 60_000,
      vehicleId: vehicle?.id ?? null,
      vehicleTitle: vehicle ? vehicle.nickname || `${vehicle.year} ${vehicle.make} ${vehicle.model}` : null,
      carPhotoUrl: vehicle?.hero_media_id ? (urlByMediaId.get(vehicle.hero_media_id) ?? null) : null,
      carScore: vehicle ? (builds.get(vehicle.id)?.ai_rating_score ?? null) : null,
    };
  });
}
