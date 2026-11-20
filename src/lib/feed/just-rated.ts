import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { listTopRatedBuilds } from "@/lib/db/builds";
import { listLeaderboardVehicleIds, listVehiclesByOwner } from "@/lib/db/vehicles";
import { composeLeaderboard } from "@/lib/leaderboard/compose-leaderboard";
import { computeRankPosition } from "@/lib/rating/rank-position";

/** A car that was rated in the last few days, as a slide in the feed
 * (features/feed/just-rated-slide). Most days nobody posts, so the feed
 * was the same feed as yesterday. A new score is something new every
 * time, and it's real: rank and score are the same ones the leaderboard
 * shows, computed now. */
export interface JustRatedSlideData {
  vehicleId: string;
  title: string;
  heroUrl: string;
  score: number;
  rank: number;
  boardSize: number;
  ownerUsername: string;
  ownerIsVerified: boolean;
  ratedAt: string;
}

const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
export const JUST_RATED_LIMIT = 3;

export async function loadJustRated(
  supabase: SupabaseClient<Database>,
  viewerId: string | null,
  now: Date = new Date(),
): Promise<JustRatedSlideData[]> {
  const [approvedIds, ownVehicles] = await Promise.all([
    listLeaderboardVehicleIds(supabase),
    viewerId ? listVehiclesByOwner(supabase, viewerId) : Promise.resolve([]),
  ]);
  const builds = await listTopRatedBuilds(supabase, 1000, approvedIds);
  const scores = builds.flatMap((b) => (b.ai_rating_score === null ? [] : [b.ai_rating_score]));

  // Your own car isn't news to you.
  const own = new Set(ownVehicles.map((v) => v.id));
  const since = now.getTime() - WINDOW_MS;
  const recent = builds
    .filter((b) => !own.has(b.vehicle_id) && b.ai_rating_rated_at && new Date(b.ai_rating_rated_at).getTime() >= since)
    .sort((a, b) => (b.ai_rating_rated_at ?? "").localeCompare(a.ai_rating_rated_at ?? ""))
    // A few spare, in case one has no cover photo.
    .slice(0, JUST_RATED_LIMIT * 2);
  if (recent.length === 0) return [];

  const ratedAtByBuild = new Map(recent.map((b) => [b.id, b.ai_rating_rated_at ?? ""]));
  const entries = await composeLeaderboard(supabase, recent);
  return entries
    .flatMap((e) =>
      e.heroUrl
        ? [
            {
              vehicleId: e.vehicleId,
              title: e.vehicleTitle,
              heroUrl: e.heroUrl,
              score: e.score,
              rank: computeRankPosition(e.score, scores).rank,
              boardSize: scores.length,
              ownerUsername: e.ownerUsername,
              ownerIsVerified: e.ownerIsVerified,
              ratedAt: ratedAtByBuild.get(e.buildId) ?? "",
            },
          ]
        : [],
    )
    .slice(0, JUST_RATED_LIMIT);
}
