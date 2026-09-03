import { RANK_TIERS } from "@/lib/rating/rank";

export interface SubscoreMax {
  appearance: number;
  performance: number;
  wheelsFitment: number;
  interior: number;
  modifications: number;
}

export interface AchievementStats {
  // Garage
  vehicleCount: number;
  verifiedVehicleCount: number;
  categoryCount: number;
  hasVerifiedVehicle: boolean;

  // Rating
  hasBeenRated: boolean;
  maxScoreEver: number | null;
  ratingCount: number;
  maxScoreImprovement: number;
  maxSubscoreEver: SubscoreMax;
  hasAllRounderBuild: boolean;

  // Mods
  modCount: number;
  installedModCount: number;
  hasBudgetSet: boolean;
  totalInvestedCents: number;
  copiedABuild: boolean;
  buildCopiedByOthers: boolean;

  // Photos
  photoCount: number;

  // Posts
  postCount: number;
  hasVideoPost: boolean;

  // Engagement received
  maxPostLikes: number;
  totalLikes: number;
  totalCommentsReceived: number;
  maxPostViews: number;
  maxPostShares: number;
  maxPostSaves: number;

  // Engagement given
  commentsMadeTotal: number;

  // Social
  followerCount: number;
  followingCount: number;

  // Crew
  crewCount: number;
  crewsFounded: number;
  maxFoundedCrewSize: number;

  // Leaderboard
  leaderboardRank: number | null;
  bestCategoryRank: number | null;

  // Meetups
  meetupsHostedCount: number;

  // Maintenance
  maintenanceCount: number;

  // Profile
  profileComplete: boolean;
  isVerifiedBadge: boolean;
  accountAgeDays: number;

  // Weekly challenges
  challengesCompletedTotal: number;
  hadPerfectWeek: boolean;
}

/** Every count-based achievement family shares this shape: unlock at or
 * above a threshold. Centralized so a family's own list of (id,
 * threshold) pairs is the only place its rule lives. */
function thresholdIds(value: number, tiers: { id: string; min: number }[]): string[] {
  return tiers.filter((t) => value >= t.min).map((t) => t.id);
}

/** Pure — checks a stats snapshot against the fixed 100-achievement
 * catalog and returns every id currently qualified for. Deliberately
 * doesn't know about already-unlocked achievements or persistence at
 * all; the caller (lib/achievements/unlock.ts) diffs this against
 * what's already recorded and only inserts what's new. */
export function evaluateAchievements(stats: AchievementStats): string[] {
  const unlocked: string[] = [];

  // Garage
  unlocked.push(
    ...thresholdIds(stats.vehicleCount, [
      { id: "first_car", min: 1 },
      { id: "car_collector_3", min: 3 },
      { id: "car_collector_5", min: 5 },
      { id: "car_collector_10", min: 10 },
    ]),
  );
  if (stats.hasVerifiedVehicle) unlocked.push("verified_owner");
  if (stats.vehicleCount >= 1 && stats.verifiedVehicleCount === stats.vehicleCount) {
    unlocked.push("fully_verified");
  }
  if (stats.categoryCount >= 3) unlocked.push("multi_category");

  // Rating: tiers
  if (stats.maxScoreEver != null) {
    for (const { tier, min } of RANK_TIERS) {
      if (stats.maxScoreEver >= min) unlocked.push(`tier_${tier}`);
    }
  }

  // Rating: activity & excellence
  if (stats.hasBeenRated) unlocked.push("first_rating");
  unlocked.push(
    ...thresholdIds(stats.ratingCount, [
      { id: "rated_5_times", min: 5 },
      { id: "rated_10_times", min: 10 },
      { id: "rated_25_times", min: 25 },
    ]),
  );
  unlocked.push(
    ...thresholdIds(stats.maxScoreImprovement, [
      { id: "improved_10", min: 10 },
      { id: "improved_20", min: 20 },
    ]),
  );
  if (stats.maxSubscoreEver.appearance >= 90) unlocked.push("appearance_90");
  if (stats.maxSubscoreEver.performance >= 90) unlocked.push("performance_90");
  if (stats.maxSubscoreEver.wheelsFitment >= 90) unlocked.push("wheels_fitment_90");
  if (stats.maxSubscoreEver.interior >= 90) unlocked.push("interior_90");
  if (stats.maxSubscoreEver.modifications >= 90) unlocked.push("modifications_90");
  if (stats.hasAllRounderBuild) unlocked.push("all_rounder");

  // Mods
  unlocked.push(
    ...thresholdIds(stats.modCount, [
      { id: "first_mod", min: 1 },
      { id: "mods_5", min: 5 },
      { id: "mods_10", min: 10 },
      { id: "mods_25", min: 25 },
      { id: "mods_50", min: 50 },
    ]),
  );
  unlocked.push(
    ...thresholdIds(stats.installedModCount, [
      { id: "mod_installed", min: 1 },
      { id: "mods_installed_10", min: 10 },
    ]),
  );
  if (stats.hasBudgetSet) unlocked.push("budget_set");
  unlocked.push(
    ...thresholdIds(stats.totalInvestedCents, [
      { id: "invested_1000", min: 100_000 },
      { id: "invested_5000", min: 500_000 },
      { id: "invested_10000", min: 1_000_000 },
    ]),
  );
  if (stats.copiedABuild) unlocked.push("copied_a_build");
  if (stats.buildCopiedByOthers) unlocked.push("build_copied_by_others");

  // Photos
  unlocked.push(
    ...thresholdIds(stats.photoCount, [
      { id: "first_photo", min: 1 },
      { id: "photos_10", min: 10 },
      { id: "photos_25", min: 25 },
      { id: "photos_50", min: 50 },
    ]),
  );

  // Posts
  unlocked.push(
    ...thresholdIds(stats.postCount, [
      { id: "first_post", min: 1 },
      { id: "posts_5", min: 5 },
      { id: "posts_10", min: 10 },
      { id: "posts_25", min: 25 },
      { id: "posts_50", min: 50 },
      { id: "posts_100", min: 100 },
      { id: "posts_200", min: 200 },
    ]),
  );
  if (stats.hasVideoPost) unlocked.push("video_creator");

  // Engagement received
  unlocked.push(
    ...thresholdIds(stats.maxPostLikes, [
      { id: "hundred_likes", min: 100 },
      { id: "likes_500", min: 500 },
      { id: "likes_1000", min: 1000 },
    ]),
  );
  unlocked.push(
    ...thresholdIds(stats.totalLikes, [
      { id: "total_likes_100", min: 100 },
      { id: "total_likes_500", min: 500 },
      { id: "total_likes_1000", min: 1000 },
    ]),
  );
  unlocked.push(
    ...thresholdIds(stats.totalCommentsReceived, [
      { id: "comments_received_10", min: 10 },
      { id: "comments_received_50", min: 50 },
    ]),
  );
  unlocked.push(
    ...thresholdIds(stats.maxPostViews, [
      { id: "views_1000", min: 1000 },
      { id: "views_10000", min: 10000 },
    ]),
  );
  if (stats.maxPostShares >= 10) unlocked.push("shared_10");
  if (stats.maxPostSaves >= 10) unlocked.push("saved_10");

  // Engagement given
  unlocked.push(
    ...thresholdIds(stats.commentsMadeTotal, [
      { id: "first_comment", min: 1 },
      { id: "comments_made_25", min: 25 },
      { id: "comments_made_100", min: 100 },
    ]),
  );

  // Social
  unlocked.push(
    ...thresholdIds(stats.followerCount, [
      { id: "first_follower", min: 1 },
      { id: "followers_10", min: 10 },
      { id: "followers_50", min: 50 },
      { id: "followers_100", min: 100 },
      { id: "followers_500", min: 500 },
      { id: "followers_1000", min: 1000 },
      { id: "followers_5000", min: 5000 },
    ]),
  );
  unlocked.push(
    ...thresholdIds(stats.followingCount, [
      { id: "following_10", min: 10 },
      { id: "following_50", min: 50 },
    ]),
  );

  // Crew
  unlocked.push(
    ...thresholdIds(stats.crewCount, [
      { id: "joined_crew", min: 1 },
      { id: "joined_3_crews", min: 3 },
    ]),
  );
  if (stats.crewsFounded >= 1) unlocked.push("crew_founder");
  unlocked.push(
    ...thresholdIds(stats.maxFoundedCrewSize, [
      { id: "crew_grew_10", min: 10 },
      { id: "crew_grew_50", min: 50 },
    ]),
  );

  // Leaderboard
  if (stats.leaderboardRank != null) {
    if (stats.leaderboardRank <= 100) unlocked.push("top_100");
    if (stats.leaderboardRank <= 50) unlocked.push("top_50");
    if (stats.leaderboardRank <= 10) unlocked.push("top_10");
    if (stats.leaderboardRank <= 3) unlocked.push("top_3");
    if (stats.leaderboardRank === 1) unlocked.push("number_one");
  }
  if (stats.bestCategoryRank != null && stats.bestCategoryRank <= 10) {
    unlocked.push("category_top_10");
  }

  // Meetups
  unlocked.push(
    ...thresholdIds(stats.meetupsHostedCount, [
      { id: "hosted_meetup", min: 1 },
      { id: "hosted_5_meetups", min: 5 },
    ]),
  );

  // Maintenance
  unlocked.push(
    ...thresholdIds(stats.maintenanceCount, [
      { id: "first_maintenance", min: 1 },
      { id: "maintenance_5", min: 5 },
    ]),
  );

  // Profile
  if (stats.profileComplete) unlocked.push("profile_complete");
  if (stats.isVerifiedBadge) unlocked.push("verified_badge");
  unlocked.push(
    ...thresholdIds(stats.accountAgeDays, [
      { id: "member_30_days", min: 30 },
      { id: "member_100_days", min: 100 },
      { id: "member_1_year", min: 365 },
    ]),
  );

  // Weekly challenges
  if (stats.challengesCompletedTotal >= 1) unlocked.push("first_challenge");
  if (stats.hadPerfectWeek) unlocked.push("perfect_week");

  return unlocked;
}
