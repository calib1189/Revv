import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { listVehiclesByOwner, listVerifiedVehicleIds } from "@/lib/db/vehicles";
import { listActiveBuildsByVehicleIds, listAllRatingScores } from "@/lib/db/builds";
import { listBuildRatingHistory } from "@/lib/db/build-rating-history";
import { listPostsByAuthor } from "@/lib/db/posts";
import { getLikeCountsForPosts } from "@/lib/db/likes";
import { getFollowerCount } from "@/lib/db/follows";
import { listCrewIdsForUser } from "@/lib/db/crew-members";
import { listUnlockedAchievements, insertAchievementUnlocks } from "@/lib/db/user-achievements";
import { computeRankPosition } from "@/lib/rating/rank-position";
import { evaluateAchievements } from "@/lib/achievements/evaluate";
import { ACHIEVEMENTS, getAchievement, type AchievementDef } from "@/lib/achievements/catalog";

/** Gathers a real, live snapshot of this user's stats and checks it
 * against the fixed catalog — see evaluate.ts for the actual rules.
 * Lazily unlocks anything newly qualified (a real, timestamped row —
 * see 0072_achievements.sql for why this isn't just computed on every
 * read) and returns those for the caller to celebrate. Cheap early-exit
 * once every achievement is already unlocked, since that only gets
 * truer over time and this only runs on a couple of page views (see
 * call sites), not on every mutation. */
export async function checkAndUnlockAchievements(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<AchievementDef[]> {
  const alreadyUnlocked = await listUnlockedAchievements(supabase, userId);
  const unlockedIds = new Set(alreadyUnlocked.map((a) => a.achievement_id));
  if (unlockedIds.size >= ACHIEVEMENTS.length) return [];

  const vehicles = await listVehiclesByOwner(supabase, userId);
  const vehicleIds = vehicles.map((v) => v.id);
  const hasVerifiedVehicle = vehicles.some((v) => v.ownership_verification_status === "approved");

  const [activeBuildByVehicle, posts, followerCount, crewIds] = await Promise.all([
    listActiveBuildsByVehicleIds(supabase, vehicleIds),
    listPostsByAuthor(supabase, userId),
    getFollowerCount(supabase, userId),
    listCrewIdsForUser(supabase, userId),
  ]);

  const activeBuilds = [...activeBuildByVehicle.values()];
  const hasBeenRated = activeBuilds.some((b) => b.ai_rating_score != null);

  const historyPerBuild = await Promise.all(
    activeBuilds.map((b) => listBuildRatingHistory(supabase, b.id)),
  );
  const allScoresEver = [
    ...historyPerBuild.flat().map((h) => h.score),
    ...activeBuilds.map((b) => b.ai_rating_score).filter((s): s is number => s != null),
  ];
  const maxScoreEver = allScoresEver.length > 0 ? Math.max(...allScoresEver) : null;

  const likeCounts = await getLikeCountsForPosts(supabase, posts.map((p) => p.id));
  const maxPostLikes = likeCounts.size > 0 ? Math.max(...likeCounts.values()) : 0;

  // Leaderboard rank uses only this user's own VERIFIED vehicles' best
  // score — an unverified build isn't actually on the real leaderboard,
  // so it shouldn't be able to earn a leaderboard achievement either.
  const verifiedVehicleIds = new Set(vehicles.filter((v) => v.ownership_verification_status === "approved").map((v) => v.id));
  const bestVerifiedScore = activeBuilds
    .filter((b) => verifiedVehicleIds.has(b.vehicle_id))
    .reduce<number | null>((best, b) => {
      if (b.ai_rating_score == null) return best;
      return best == null || b.ai_rating_score > best ? b.ai_rating_score : best;
    }, null);
  const leaderboardRank =
    bestVerifiedScore != null
      ? computeRankPosition(bestVerifiedScore, await listAllRatingScores(supabase, await listVerifiedVehicleIds(supabase))).rank
      : null;

  const qualifiedIds = evaluateAchievements({
    vehicleCount: vehicles.length,
    hasVerifiedVehicle,
    hasBeenRated,
    maxScoreEver,
    postCount: posts.length,
    maxPostLikes,
    followerCount,
    inCrew: crewIds.length > 0,
    leaderboardRank,
  });

  const newIds = qualifiedIds.filter((id) => !unlockedIds.has(id));
  if (newIds.length === 0) return [];

  await insertAchievementUnlocks(supabase, userId, newIds);
  return newIds.map((id) => getAchievement(id)).filter((a): a is AchievementDef => Boolean(a));
}
