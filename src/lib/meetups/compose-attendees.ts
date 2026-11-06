import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { MeetupAttendee } from "@/lib/db/meetup-attendees";
import { getProfilesByIds } from "@/lib/db/profiles";
import { listVehiclesByIds } from "@/lib/db/vehicles";
import { listActiveBuildsByVehicleIds } from "@/lib/db/builds";
import { getMediaByIds, publicMediaUrl } from "@/lib/db/media";
import { sortAttendees } from "@/lib/meetups/attendance";

export interface AttendeeEntry {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  vehicleId: string | null;
  vehicleTitle: string | null;
  carPhotoUrl: string | null;
  /** The car's current rating (its active build's score), or null when
   * there's no car or it hasn't been rated. */
  score: number | null;
  joinedAt: string;
}

/** Resolves RSVP rows into what the meet page shows: who, which car,
 * and that car's rating. Batched, not one query per person. A car that
 * has since been deleted reads as "no car" (the FK sets it null). */
export async function composeAttendees(
  supabase: SupabaseClient<Database>,
  attendees: MeetupAttendee[],
): Promise<AttendeeEntry[]> {
  if (attendees.length === 0) return [];

  const vehicleIds = attendees.map((a) => a.vehicle_id).filter((id): id is string => id != null);
  const [profiles, vehicles, builds] = await Promise.all([
    getProfilesByIds(supabase, attendees.map((a) => a.user_id)),
    listVehiclesByIds(supabase, vehicleIds),
    listActiveBuildsByVehicleIds(supabase, vehicleIds),
  ]);
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const vehicleById = new Map(vehicles.map((v) => [v.id, v]));

  const mediaIds = [
    ...vehicles.map((v) => v.hero_media_id),
    ...profiles.map((p) => p.avatar_media_id),
  ].filter((id): id is string => Boolean(id));
  const media = await getMediaByIds(supabase, [...new Set(mediaIds)]);
  const urlByMediaId = new Map(media.map((m) => [m.id, publicMediaUrl(supabase, m.storage_path)]));

  const entries = attendees.map((a): AttendeeEntry => {
    const profile = profileById.get(a.user_id);
    const vehicle = a.vehicle_id ? vehicleById.get(a.vehicle_id) : undefined;
    return {
      userId: a.user_id,
      username: profile?.username ?? "unknown",
      displayName: profile?.display_name ?? null,
      avatarUrl: profile?.avatar_media_id ? (urlByMediaId.get(profile.avatar_media_id) ?? null) : null,
      isVerified: profile?.is_verified ?? false,
      vehicleId: vehicle?.id ?? null,
      vehicleTitle: vehicle ? vehicle.nickname || `${vehicle.make} ${vehicle.model}` : null,
      carPhotoUrl: vehicle?.hero_media_id ? (urlByMediaId.get(vehicle.hero_media_id) ?? null) : null,
      score: vehicle ? (builds.get(vehicle.id)?.ai_rating_score ?? null) : null,
      joinedAt: a.created_at,
    };
  });
  return sortAttendees(entries);
}
