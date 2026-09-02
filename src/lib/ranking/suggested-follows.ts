import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getViewerAffinity } from "@/lib/ranking/viewer-affinity";
import { listFollowingIds } from "@/lib/db/follows";
import { listVerifiedVehicleIds } from "@/lib/db/vehicles";
import { getBestRatingScoresByOwnerIds } from "@/lib/rating/best-build-scores";
import { getProfilesByIds, type Profile } from "@/lib/db/profiles";
import { getMediaByIds, publicMediaUrl } from "@/lib/db/media";

const SUGGESTION_LIMIT = 8;

export interface SuggestedFollow {
  profile: Profile;
  avatarUrl: string | null;
  bestScore: number;
}

/** "People you might like" — builders whose verified vehicles match the
 * viewer's own recent category/make affinity (the same signal that
 * boosts their posts in the feed, see viewer-affinity.ts), ranked by
 * their best rated build rather than follower count or recency. This
 * ties the suggestion surface back to the thing REVV is actually about
 * — good builds — instead of being a generic "people you may know"
 * feature. A viewer with no affinity yet (brand new, hasn't engaged
 * with anything) falls back to the best verified builders on REVV
 * overall, so the row still has something real to show rather than
 * nothing. Only ever surfaces accounts with an actual rated, verified
 * build — never a fabricated or empty suggestion. */
export async function listSuggestedFollows(
  supabase: SupabaseClient<Database>,
  viewerId: string,
): Promise<SuggestedFollow[]> {
  const [affinity, followingIds, verifiedVehicleIds] = await Promise.all([
    getViewerAffinity(supabase, viewerId),
    listFollowingIds(supabase, viewerId),
    listVerifiedVehicleIds(supabase),
  ]);
  if (verifiedVehicleIds.length === 0) return [];

  const { data: verifiedVehicles, error } = await supabase
    .from("vehicles")
    .select("owner_id, category, make")
    .in("id", verifiedVehicleIds);
  if (error) throw error;

  const hasAffinity = affinity.categories.size > 0 || affinity.makes.size > 0;
  const matching = hasAffinity
    ? verifiedVehicles.filter(
        (v) => affinity.categories.has(v.category) || (v.make != null && affinity.makes.has(v.make.toLowerCase())),
      )
    : verifiedVehicles;

  const excludeIds = new Set([viewerId, ...followingIds]);
  const candidateOwnerIds = [...new Set(matching.map((v) => v.owner_id))].filter(
    (id) => !excludeIds.has(id),
  );
  if (candidateOwnerIds.length === 0) return [];

  const bestScores = await getBestRatingScoresByOwnerIds(supabase, candidateOwnerIds);
  const ranked = candidateOwnerIds
    .filter((id) => bestScores.has(id))
    .sort((a, b) => bestScores.get(b)! - bestScores.get(a)!)
    .slice(0, SUGGESTION_LIMIT);
  if (ranked.length === 0) return [];

  const profiles = await getProfilesByIds(supabase, ranked);
  const profileById = new Map(profiles.map((p) => [p.id, p]));

  const avatarMediaIds = profiles
    .map((p) => p.avatar_media_id)
    .filter((id): id is string => Boolean(id));
  const avatarMedia = await getMediaByIds(supabase, avatarMediaIds);
  const avatarUrlByMediaId = new Map(
    avatarMedia.map((m) => [m.id, publicMediaUrl(supabase, m.storage_path)]),
  );

  return ranked
    .map((id) => {
      const profile = profileById.get(id);
      if (!profile) return null;
      return {
        profile,
        avatarUrl: profile.avatar_media_id
          ? (avatarUrlByMediaId.get(profile.avatar_media_id) ?? null)
          : null,
        bestScore: bestScores.get(id)!,
      };
    })
    .filter((entry): entry is SuggestedFollow => entry !== null);
}
