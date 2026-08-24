import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Build } from "@/lib/db/builds";
import { listVehiclesByIds } from "@/lib/db/vehicles";
import { getProfilesByIds } from "@/lib/db/profiles";
import { getMediaByIds, publicMediaUrl } from "@/lib/db/media";
import { isVehicleCategory, type VehicleCategory } from "@/lib/vehicles/category";

export interface LeaderboardEntry {
  buildId: string;
  vehicleId: string;
  vehicleTitle: string;
  category: VehicleCategory;
  heroUrl: string | null;
  score: number;
  ownerUsername: string;
  ownerAvatarUrl: string | null;
}

/** Resolves rated builds into leaderboard rows — vehicle title/photo and
 * owner identity, batched rather than N+1 per row. Builds whose vehicle no
 * longer resolves (shouldn't happen given the FK, but the score itself
 * being null would mean it isn't rated) are dropped rather than shown with
 * placeholders. */
export async function composeLeaderboard(
  supabase: SupabaseClient<Database>,
  builds: Build[],
): Promise<LeaderboardEntry[]> {
  if (builds.length === 0) return [];

  const vehicles = await listVehiclesByIds(
    supabase,
    builds.map((b) => b.vehicle_id),
  );
  const vehicleById = new Map(vehicles.map((v) => [v.id, v]));

  const owners = await getProfilesByIds(
    supabase,
    [...new Set(vehicles.map((v) => v.owner_id))],
  );
  const ownerById = new Map(owners.map((o) => [o.id, o]));

  const mediaIds = [
    ...vehicles.map((v) => v.hero_media_id),
    ...owners.map((o) => o.avatar_media_id),
  ].filter((id): id is string => Boolean(id));
  const media = await getMediaByIds(supabase, [...new Set(mediaIds)]);
  const urlByMediaId = new Map(
    media.map((m) => [m.id, publicMediaUrl(supabase, m.storage_path)]),
  );

  return builds
    .map((build) => {
      const vehicle = vehicleById.get(build.vehicle_id);
      if (!vehicle || build.ai_rating_score == null) return null;
      const owner = ownerById.get(vehicle.owner_id);

      return {
        buildId: build.id,
        vehicleId: vehicle.id,
        vehicleTitle: vehicle.nickname || `${vehicle.make} ${vehicle.model}`,
        category: isVehicleCategory(vehicle.category) ? vehicle.category : "cars",
        heroUrl: vehicle.hero_media_id
          ? (urlByMediaId.get(vehicle.hero_media_id) ?? null)
          : null,
        score: build.ai_rating_score,
        ownerUsername: owner?.username ?? "unknown",
        ownerAvatarUrl: owner?.avatar_media_id
          ? (urlByMediaId.get(owner.avatar_media_id) ?? null)
          : null,
      };
    })
    .filter((entry): entry is LeaderboardEntry => entry !== null);
}
