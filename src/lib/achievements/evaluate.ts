import { RANK_TIERS } from "@/lib/rating/rank";

export interface AchievementStats {
  vehicleCount: number;
  hasVerifiedVehicle: boolean;
  hasBeenRated: boolean;
  /** Highest score this user's builds have ever reached, across every
   * confirmed rating in history — not just the current one, so re-rating
   * to a lower score never takes a tier achievement away. Null if never
   * rated. */
  maxScoreEver: number | null;
  postCount: number;
  maxPostLikes: number;
  followerCount: number;
  inCrew: boolean;
  /** This user's own best verified-vehicle leaderboard position, or null
   * if they have no verified, rated vehicle to rank at all. */
  leaderboardRank: number | null;
}

/** Pure — checks a stats snapshot against the fixed achievement catalog
 * and returns every id currently qualified for for. Deliberately doesn't
 * know about already-unlocked achievements or persistence at all; the
 * caller (lib/achievements/unlock.ts) diffs this against what's already
 * recorded and only inserts what's new. */
export function evaluateAchievements(stats: AchievementStats): string[] {
  const unlocked: string[] = [];

  if (stats.vehicleCount >= 1) unlocked.push("first_car");
  if (stats.hasVerifiedVehicle) unlocked.push("verified_owner");
  if (stats.hasBeenRated) unlocked.push("first_rating");

  if (stats.maxScoreEver != null) {
    for (const { tier, min } of RANK_TIERS) {
      if (stats.maxScoreEver >= min) unlocked.push(`tier_${tier}`);
    }
  }

  if (stats.postCount >= 1) unlocked.push("first_post");
  if (stats.maxPostLikes >= 100) unlocked.push("hundred_likes");
  if (stats.followerCount >= 1) unlocked.push("first_follower");
  if (stats.followerCount >= 10) unlocked.push("ten_followers");
  if (stats.inCrew) unlocked.push("joined_crew");

  if (stats.leaderboardRank != null) {
    if (stats.leaderboardRank <= 100) unlocked.push("top_100");
    if (stats.leaderboardRank <= 10) unlocked.push("top_10");
    if (stats.leaderboardRank === 1) unlocked.push("number_one");
  }

  return unlocked;
}
