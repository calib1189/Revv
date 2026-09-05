import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getProfileByUserId } from "@/lib/db/profiles";
import { listVehiclesByOwner, listVerifiedVehicleIds, listVehicleIdsByCategory } from "@/lib/db/vehicles";
import { listActiveBuildsByVehicleIds, listAllRatingScores, countBuildsCopiedFrom } from "@/lib/db/builds";
import { listBuildRatingHistoryForBuilds } from "@/lib/db/build-rating-history";
import { listBuildPartsForBuilds } from "@/lib/db/build-parts";
import { calculateBudgetSummary } from "@/lib/builds/budget";
import { countVehicleMediaForVehicles } from "@/lib/db/vehicle-media";
import { countMaintenanceForVehicles } from "@/lib/db/maintenance";
import { listPostsByAuthor } from "@/lib/db/posts";
import { listPostMediaForPosts } from "@/lib/db/post-media";
import { getLikeCountsForPosts } from "@/lib/db/likes";
import { getCommentCountsForPosts, countCommentsByAuthor } from "@/lib/db/comments";
import { getViewCountsForPosts } from "@/lib/db/post-views";
import { getShareCountsForPosts } from "@/lib/db/post-shares";
import { getSaveCountsForPosts } from "@/lib/db/saves";
import { getFollowerCount, getFollowingCount } from "@/lib/db/follows";
import { listCrewIdsForUser, getCrewMemberCount } from "@/lib/db/crew-members";
import { listCrewsOwnedBy } from "@/lib/db/crews";
import { listMeetupsByHost } from "@/lib/db/meetups";
import { listAllChallengeCompletions } from "@/lib/db/user-challenge-completions";
import { countPeerRatingsGivenByUser } from "@/lib/db/peer-ratings";
import { listUnlockedAchievements, insertAchievementUnlocks } from "@/lib/db/user-achievements";
import { computeRankPosition } from "@/lib/rating/rank-position";
import { evaluateAchievements, type SubscoreMax } from "@/lib/achievements/evaluate";
import { ACHIEVEMENTS, getAchievement, type AchievementDef } from "@/lib/achievements/catalog";
import { CHALLENGES } from "@/lib/challenges/catalog";

const SUBSCORE_KEYS = ["appearance", "performance", "wheelsFitment", "interior", "modifications"] as const;

function hasCompleteSubscores(
  subscores: unknown,
): subscores is Record<(typeof SUBSCORE_KEYS)[number], number> {
  if (!subscores || typeof subscores !== "object") return false;
  return SUBSCORE_KEYS.every((key) => typeof (subscores as Record<string, unknown>)[key] === "number");
}

/** Gathers a real, live snapshot of this user's stats and checks it
 * against the fixed 100-achievement catalog — see evaluate.ts for the
 * actual rules. Lazily unlocks anything newly qualified (a real,
 * timestamped row — see 0072_achievements.sql) and returns those for
 * the caller to celebrate. Cheap early-exit once every achievement is
 * already unlocked, since that only gets truer over time and this only
 * runs on a couple of page views (see call sites), not on every
 * mutation. */
export async function checkAndUnlockAchievements(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<AchievementDef[]> {
  const alreadyUnlocked = await listUnlockedAchievements(supabase, userId);
  const unlockedIds = new Set(alreadyUnlocked.map((a) => a.achievement_id));
  if (unlockedIds.size >= ACHIEVEMENTS.length) return [];

  const [profile, vehicles] = await Promise.all([
    getProfileByUserId(supabase, userId),
    listVehiclesByOwner(supabase, userId),
  ]);

  const vehicleIds = vehicles.map((v) => v.id);
  const verifiedVehicles = vehicles.filter((v) => v.ownership_verification_status === "approved");
  const categoryCount = new Set(vehicles.map((v) => v.category)).size;

  const [
    activeBuildByVehicle,
    photoCount,
    maintenanceCount,
    posts,
    followerCount,
    followingCount,
    crewIds,
    ownedCrews,
    meetupsHosted,
    challengeCompletions,
  ] = await Promise.all([
    listActiveBuildsByVehicleIds(supabase, vehicleIds),
    countVehicleMediaForVehicles(supabase, vehicleIds),
    countMaintenanceForVehicles(supabase, vehicleIds),
    listPostsByAuthor(supabase, userId),
    getFollowerCount(supabase, userId),
    getFollowingCount(supabase, userId),
    listCrewIdsForUser(supabase, userId),
    listCrewsOwnedBy(supabase, userId),
    listMeetupsByHost(supabase, userId),
    listAllChallengeCompletions(supabase, userId),
  ]);

  const activeBuilds = [...activeBuildByVehicle.values()];
  const buildIds = activeBuilds.map((b) => b.id);
  const postIds = posts.map((p) => p.id);

  const [
    ratingHistory,
    buildParts,
    postMedia,
    likeCounts,
    commentCounts,
    viewCounts,
    shareCounts,
    saveCounts,
    commentsMadeTotal,
    buildCopiedByOthersCount,
    ownedCrewSizes,
    peerRatingsGiven,
  ] = await Promise.all([
    listBuildRatingHistoryForBuilds(supabase, buildIds),
    listBuildPartsForBuilds(supabase, buildIds),
    listPostMediaForPosts(supabase, postIds),
    getLikeCountsForPosts(supabase, postIds),
    getCommentCountsForPosts(supabase, postIds),
    getViewCountsForPosts(supabase, postIds),
    getShareCountsForPosts(supabase, postIds),
    getSaveCountsForPosts(supabase, postIds),
    countCommentsByAuthor(supabase, userId),
    countBuildsCopiedFrom(supabase, buildIds),
    Promise.all(ownedCrews.map((c) => getCrewMemberCount(supabase, c.id))),
    countPeerRatingsGivenByUser(supabase, userId),
  ]);

  // Rating: history + current score, same union the percentile/history
  // modal already uses, in case a rating predates the history table.
  const allScoresEver = [
    ...ratingHistory.map((h) => h.score),
    ...activeBuilds.map((b) => b.ai_rating_score).filter((s): s is number => s != null),
  ];
  const maxScoreEver = allScoresEver.length > 0 ? Math.max(...allScoresEver) : null;

  const maxSubscoreEver: SubscoreMax = { appearance: 0, performance: 0, wheelsFitment: 0, interior: 0, modifications: 0 };
  let hasAllRounderBuild = false;
  for (const entry of ratingHistory) {
    if (!hasCompleteSubscores(entry.subscores)) continue;
    for (const key of SUBSCORE_KEYS) {
      maxSubscoreEver[key] = Math.max(maxSubscoreEver[key], entry.subscores[key]);
    }
    if (SUBSCORE_KEYS.every((key) => entry.subscores![key] >= 80)) hasAllRounderBuild = true;
  }

  // Improvement: per build, max score minus its first (oldest) score —
  // then take the best improvement across all builds.
  const historyByBuild = new Map<string, number[]>();
  for (const entry of ratingHistory) {
    const list = historyByBuild.get(entry.buildId) ?? [];
    list.push(entry.score);
    historyByBuild.set(entry.buildId, list);
  }
  let maxScoreImprovement = 0;
  for (const scores of historyByBuild.values()) {
    if (scores.length < 2) continue;
    maxScoreImprovement = Math.max(maxScoreImprovement, Math.max(...scores) - scores[0]);
  }

  const budgetSummary = calculateBudgetSummary(buildParts, null);
  const hasBudgetSet = activeBuilds.some((b) => b.budget_cents != null);
  const copiedABuild = activeBuilds.some((b) => b.copied_from_build_id != null);

  const mediaByPost = new Map(postMedia.map((pm) => [pm.post_id, pm]));
  const hasVideoPost = posts.some((p) => mediaByPost.get(p.id)?.media.kind === "video");

  const maxPostLikes = likeCounts.size > 0 ? Math.max(...likeCounts.values()) : 0;
  const totalLikes = [...likeCounts.values()].reduce((sum, n) => sum + n, 0);
  const totalCommentsReceived = [...commentCounts.values()].reduce((sum, n) => sum + n, 0);
  const maxPostViews = viewCounts.size > 0 ? Math.max(...viewCounts.values()) : 0;
  const maxPostShares = shareCounts.size > 0 ? Math.max(...shareCounts.values()) : 0;
  const maxPostSaves = saveCounts.size > 0 ? Math.max(...saveCounts.values()) : 0;

  const maxFoundedCrewSize = ownedCrewSizes.length > 0 ? Math.max(...ownedCrewSizes) : 0;

  // Global leaderboard rank — same "only verified vehicles are eligible"
  // reasoning rate-position.ts uses elsewhere, so this achievement never
  // claims a rank the real leaderboard wouldn't back up.
  const bestVerifiedScore = activeBuilds
    .filter((b) => verifiedVehicles.some((v) => v.id === b.vehicle_id))
    .reduce<number | null>((best, b) => {
      if (b.ai_rating_score == null) return best;
      return best == null || b.ai_rating_score > best ? b.ai_rating_score : best;
    }, null);

  let leaderboardRank: number | null = null;
  let bestCategoryRank: number | null = null;
  if (bestVerifiedScore != null) {
    const allVerifiedIds = await listVerifiedVehicleIds(supabase);
    leaderboardRank = computeRankPosition(
      bestVerifiedScore,
      await listAllRatingScores(supabase, allVerifiedIds),
    ).rank;

    // Best position across any single category board the user actually
    // has a verified, rated vehicle in — bounded by their own category
    // diversity (typically 1-3), not every category SORZA supports.
    const ownCategories = [...new Set(verifiedVehicles.map((v) => v.category))];
    const categoryRanks = await Promise.all(
      ownCategories.map(async (category) => {
        const vehicleInCategory = verifiedVehicles.find((v) => v.category === category);
        const build = vehicleInCategory ? activeBuildByVehicle.get(vehicleInCategory.id) : undefined;
        if (!build?.ai_rating_score) return null;
        const categoryVehicleIds = await listVehicleIdsByCategory(supabase, category);
        const categoryVerifiedIds = categoryVehicleIds.filter((id) => allVerifiedIds.includes(id));
        const categoryScores = await listAllRatingScores(supabase, categoryVerifiedIds);
        return computeRankPosition(build.ai_rating_score, categoryScores).rank;
      }),
    );
    const realCategoryRanks = categoryRanks.filter((r): r is number => r != null);
    bestCategoryRank = realCategoryRanks.length > 0 ? Math.min(...realCategoryRanks) : null;
  }

  const completionsByWeek = new Map<string, number>();
  for (const c of challengeCompletions) {
    completionsByWeek.set(c.weekStart, (completionsByWeek.get(c.weekStart) ?? 0) + 1);
  }
  const hadPerfectWeek = [...completionsByWeek.values()].some((count) => count >= CHALLENGES.length);

  const accountAgeDays = profile
    ? (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24)
    : 0;

  const qualifiedIds = evaluateAchievements({
    vehicleCount: vehicles.length,
    verifiedVehicleCount: verifiedVehicles.length,
    categoryCount,
    hasVerifiedVehicle: verifiedVehicles.length > 0,

    hasBeenRated: activeBuilds.some((b) => b.ai_rating_score != null),
    maxScoreEver,
    // Counts both rating your own build (AI, confirmed) and rating
    // someone else's (the peer star system) — both are real "you engaged
    // with rating a build" actions, so both count toward this family.
    // Doesn't affect tier/subscore achievements, which stay scoped to
    // your own build's real, confirmed AI score.
    ratingCount: ratingHistory.length + peerRatingsGiven,
    maxScoreImprovement,
    maxSubscoreEver,
    hasAllRounderBuild,

    modCount: buildParts.length,
    installedModCount: buildParts.filter((p) => p.status === "installed").length,
    hasBudgetSet,
    totalInvestedCents: budgetSummary.spentCents,
    copiedABuild,
    buildCopiedByOthers: buildCopiedByOthersCount > 0,

    photoCount,

    postCount: posts.length,
    hasVideoPost,

    maxPostLikes,
    totalLikes,
    totalCommentsReceived,
    maxPostViews,
    maxPostShares,
    maxPostSaves,

    commentsMadeTotal,

    followerCount,
    followingCount,

    crewCount: crewIds.length,
    crewsFounded: ownedCrews.length,
    maxFoundedCrewSize,

    leaderboardRank,
    bestCategoryRank,

    meetupsHostedCount: meetupsHosted.length,

    maintenanceCount,

    profileComplete: Boolean(profile?.bio && profile?.avatar_media_id),
    isVerifiedBadge: Boolean(profile?.is_verified),
    accountAgeDays,

    challengesCompletedTotal: challengeCompletions.length,
    hadPerfectWeek,
  });

  const newIds = qualifiedIds.filter((id) => !unlockedIds.has(id));
  if (newIds.length === 0) return [];

  await insertAchievementUnlocks(supabase, userId, newIds);
  return newIds.map((id) => getAchievement(id)).filter((a): a is AchievementDef => Boolean(a));
}
