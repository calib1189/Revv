import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { DailySubmission } from "@/lib/db/daily";
import { getProfilesByIds } from "@/lib/db/profiles";
import { listVehiclesByIds, listVehiclesByOwner } from "@/lib/db/vehicles";
import { listActiveBuildsByVehicleIds } from "@/lib/db/builds";
import { getMediaByIds, publicMediaUrl } from "@/lib/db/media";

export interface DailyEntry {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  isVerified: boolean;
  mediaId: string;
  photoUrl: string | null;
  photoWidth: number | null;
  photoHeight: number | null;
  caption: string | null;
  vehicleId: string | null;
  vehicleTitle: string | null;
  /** The car's SORZA AI score, shown as context only, never as a vote. */
  aiScore: number | null;
  createdAt: string;
}

/** Resolves entry rows into what the Daily page shows: the photo, who
 * entered, and which car. Batched, not one query per entry. */
export async function composeDailyEntries(
  supabase: SupabaseClient<Database>,
  submissions: DailySubmission[],
): Promise<DailyEntry[]> {
  if (submissions.length === 0) return [];

  const vehicleIds = submissions.map((s) => s.vehicle_id).filter((id): id is string => id != null);
  const [profiles, vehicles, builds] = await Promise.all([
    getProfilesByIds(supabase, [...new Set(submissions.map((s) => s.user_id))]),
    listVehiclesByIds(supabase, vehicleIds),
    listActiveBuildsByVehicleIds(supabase, vehicleIds),
  ]);
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const vehicleById = new Map(vehicles.map((v) => [v.id, v]));

  const mediaIds = [
    ...submissions.map((s) => s.media_id),
    ...profiles.map((p) => p.avatar_media_id),
  ].filter((id): id is string => Boolean(id));
  const media = await getMediaByIds(supabase, [...new Set(mediaIds)]);
  const mediaById = new Map(media.map((m) => [m.id, m]));
  const url = (id: string | null | undefined) => {
    const m = id ? mediaById.get(id) : undefined;
    return m ? publicMediaUrl(supabase, m.storage_path) : null;
  };

  return submissions.map((s): DailyEntry => {
    const profile = profileById.get(s.user_id);
    const vehicle = s.vehicle_id ? vehicleById.get(s.vehicle_id) : undefined;
    const photo = mediaById.get(s.media_id);
    return {
      id: s.id,
      userId: s.user_id,
      username: profile?.username ?? "unknown",
      avatarUrl: url(profile?.avatar_media_id),
      isVerified: profile?.is_verified ?? false,
      mediaId: s.media_id,
      photoUrl: url(s.media_id),
      photoWidth: photo?.width ?? null,
      photoHeight: photo?.height ?? null,
      caption: s.caption,
      vehicleId: vehicle?.id ?? null,
      vehicleTitle: vehicle ? vehicle.nickname || `${vehicle.year} ${vehicle.make} ${vehicle.model}` : null,
      aiScore: vehicle ? (builds.get(vehicle.id)?.ai_rating_score ?? null) : null,
      createdAt: s.created_at,
    };
  });
}

export interface GaragePhoto {
  mediaId: string;
  url: string;
  vehicleId: string;
  vehicleTitle: string;
}

export interface GarageCar {
  id: string;
  title: string;
}

/** Every photo already in the user's garage (cover photos and galleries),
 * so entering can reuse one instead of uploading it again. */
export async function listGaragePhotos(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ cars: GarageCar[]; photos: GaragePhoto[] }> {
  const vehicles = await listVehiclesByOwner(supabase, userId);
  if (vehicles.length === 0) return { cars: [], photos: [] };

  const titleById = new Map(
    vehicles.map((v) => [v.id, v.nickname || `${v.year} ${v.make} ${v.model}`]),
  );
  const { data: gallery, error } = await supabase
    .from("vehicle_media")
    .select("vehicle_id, media_id, position")
    .in("vehicle_id", vehicles.map((v) => v.id))
    .order("position", { ascending: true });
  if (error) throw error;

  const pairs: { mediaId: string; vehicleId: string }[] = [];
  for (const v of vehicles) {
    if (v.hero_media_id) pairs.push({ mediaId: v.hero_media_id, vehicleId: v.id });
  }
  for (const g of gallery) pairs.push({ mediaId: g.media_id, vehicleId: g.vehicle_id });

  const seen = new Set<string>();
  const unique = pairs.filter((p) => (seen.has(p.mediaId) ? false : (seen.add(p.mediaId), true)));
  const media = await getMediaByIds(supabase, unique.map((p) => p.mediaId));
  const imageById = new Map(media.filter((m) => m.kind === "image").map((m) => [m.id, m]));

  return {
    cars: vehicles.map((v) => ({ id: v.id, title: titleById.get(v.id)! })),
    photos: unique
      .filter((p) => imageById.has(p.mediaId))
      .map((p) => ({
        mediaId: p.mediaId,
        url: publicMediaUrl(supabase, imageById.get(p.mediaId)!.storage_path),
        vehicleId: p.vehicleId,
        vehicleTitle: titleById.get(p.vehicleId)!,
      })),
  };
}
