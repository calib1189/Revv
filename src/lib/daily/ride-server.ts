import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { addDays } from "@/lib/daily/day";
import { pickRideRound } from "@/lib/daily/ride";
import { getProfilesByIds } from "@/lib/db/profiles";
import { listVehiclesByIds } from "@/lib/db/vehicles";
import { getMediaByIds, publicMediaUrl } from "@/lib/db/media";

/** Cars considered for rounds: the most recently added garage cars that
 * have a cover photo. Plenty for a small community; the cap keeps the
 * query bounded as it grows. */
const CANDIDATE_LIMIT = 500;
/** Cars shown in the last two weeks are only reused when nothing else is left. */
const RECENT_DAYS = 14;

/** The person's three cars for the day, picking and saving them the
 * first time they're asked for, so the set never changes mid-day. */
export async function getOrCreateRideRound(userId: string, dateKey: string): Promise<string[]> {
  const service = createServiceRoleClient();
  const { data: existing, error: readError } = await service
    .from("rate_ride_rounds")
    .select("vehicle_ids")
    .eq("user_id", userId)
    .eq("round_date", dateKey)
    .maybeSingle();
  if (readError) throw readError;
  if (existing) return existing.vehicle_ids;

  const [candidates, rated, recent] = await Promise.all([
    service
      .from("vehicles")
      .select("id, owner_id")
      .not("hero_media_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(CANDIDATE_LIMIT),
    service.from("peer_ratings").select("vehicle_id").eq("rater_id", userId),
    service
      .from("rate_ride_rounds")
      .select("vehicle_ids")
      .eq("user_id", userId)
      .gte("round_date", addDays(dateKey, -RECENT_DAYS)),
  ]);
  if (candidates.error) throw candidates.error;
  if (rated.error) throw rated.error;
  if (recent.error) throw recent.error;

  const vehicleIds = pickRideRound({
    candidates: candidates.data.map((v) => ({ vehicleId: v.id, ownerId: v.owner_id })),
    viewerId: userId,
    rated: new Set(rated.data.map((r) => r.vehicle_id)),
    recentlyShown: new Set(recent.data.flatMap((r) => r.vehicle_ids)),
    seed: `${userId}:${dateKey}`,
  });

  const { error: writeError } = await service
    .from("rate_ride_rounds")
    .upsert({ user_id: userId, round_date: dateKey, vehicle_ids: vehicleIds }, { onConflict: "user_id,round_date", ignoreDuplicates: true });
  if (writeError) throw writeError;

  // Re-read in case a parallel request saved a round first.
  const { data: saved } = await service
    .from("rate_ride_rounds")
    .select("vehicle_ids")
    .eq("user_id", userId)
    .eq("round_date", dateKey)
    .maybeSingle();
  return saved?.vehicle_ids ?? vehicleIds;
}

export interface RideCar {
  vehicleId: string;
  title: string;
  photoUrl: string | null;
  ownerUsername: string;
  ownerAvatarUrl: string | null;
  /** Your stars if you've already rated it today (or before). */
  myStars: number | null;
}

/** The round's cars ready to show, in round order. */
export async function composeRideCars(
  supabase: SupabaseClient<Database>,
  userId: string,
  vehicleIds: string[],
): Promise<RideCar[]> {
  if (vehicleIds.length === 0) return [];
  const [vehicles, myRatings] = await Promise.all([
    listVehiclesByIds(supabase, vehicleIds),
    supabase.from("peer_ratings").select("vehicle_id, stars").eq("rater_id", userId).in("vehicle_id", vehicleIds),
  ]);
  if (myRatings.error) throw myRatings.error;
  const profiles = await getProfilesByIds(supabase, [...new Set(vehicles.map((v) => v.owner_id))]);
  const media = await getMediaByIds(
    supabase,
    [...vehicles.map((v) => v.hero_media_id), ...profiles.map((p) => p.avatar_media_id)].filter(
      (id): id is string => Boolean(id),
    ),
  );
  const urlById = new Map(media.map((m) => [m.id, publicMediaUrl(supabase, m.storage_path)]));
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const vehicleById = new Map(vehicles.map((v) => [v.id, v]));
  const starsById = new Map(myRatings.data.map((r) => [r.vehicle_id, r.stars]));

  return vehicleIds
    .map((id) => vehicleById.get(id))
    .filter((v) => v !== undefined)
    .map((v) => {
      const owner = profileById.get(v.owner_id);
      return {
        vehicleId: v.id,
        title: v.nickname || `${v.year} ${v.make} ${v.model}`,
        photoUrl: v.hero_media_id ? (urlById.get(v.hero_media_id) ?? null) : null,
        ownerUsername: owner?.username ?? "unknown",
        ownerAvatarUrl: owner?.avatar_media_id ? (urlById.get(owner.avatar_media_id) ?? null) : null,
        myStars: starsById.get(v.id) ?? null,
      };
    });
}
