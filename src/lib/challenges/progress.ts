import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { listVehiclesByOwner } from "@/lib/db/vehicles";
import { listActiveBuildsByVehicleIds } from "@/lib/db/builds";
import { listPostsByAuthor } from "@/lib/db/posts";
import { countPostsSince, countCommentsSince, countLikesReceivedSince } from "@/lib/db/weekly-stats";
import { countPeerRatingsGivenSince } from "@/lib/db/peer-ratings";
import { listWeekCompletions, insertChallengeCompletions } from "@/lib/db/user-challenge-completions";
import { getWeekStart, weekStartKey } from "@/lib/challenges/week";
import { evaluateChallenges, type ChallengeProgress } from "@/lib/challenges/evaluate";
import { getChallenge, type ChallengeDef } from "@/lib/challenges/catalog";

export interface WeeklyChallengesResult {
  /** `claimed` is only meaningful when `completed` is true — an
   * in-progress challenge is neither claimed nor unclaimed, it just
   * isn't done yet. */
  progress: (ChallengeProgress & { claimed: boolean })[];
  newlyCompleted: ChallengeDef[];
}

/** Gathers this week's real stats, evaluates progress against the fixed
 * catalog (see evaluate.ts), and records any newly-completed challenge
 * (a real, week-scoped row — see 0073_weekly_challenges.sql) so the
 * celebratory toast only ever fires once per completion. Points aren't
 * awarded here — the owner claims them explicitly via
 * claimChallengePointsAction, same as achievements. Meant to be called
 * from the same kind of frequently-visited page achievements check runs
 * from (Garage, own profile) — no cron job, no background worker. */
export async function getWeeklyChallengeProgress(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<WeeklyChallengesResult> {
  const weekStart = getWeekStart();
  const weekStartIso = weekStart.toISOString();
  const key = weekStartKey(weekStart);

  const [vehicles, posts, weekCompletions] = await Promise.all([
    listVehiclesByOwner(supabase, userId),
    listPostsByAuthor(supabase, userId),
    listWeekCompletions(supabase, userId, key),
  ]);
  const claimedById = new Map(weekCompletions.map((c) => [c.challengeId, c.claimedAt != null]));
  const alreadyCompleted = new Set(weekCompletions.map((c) => c.challengeId));

  const [activeBuildByVehicle, postsThisWeek, commentsThisWeek, likesReceivedThisWeek] = await Promise.all([
    listActiveBuildsByVehicleIds(supabase, vehicles.map((v) => v.id)),
    countPostsSince(supabase, userId, weekStartIso),
    countCommentsSince(supabase, userId, weekStartIso),
    countLikesReceivedSince(
      supabase,
      posts.map((p) => p.id),
      weekStartIso,
    ),
  ]);

  const ownRatingAttempts = [...activeBuildByVehicle.values()].filter(
    (b) => b.ai_rating_last_attempt_at != null && b.ai_rating_last_attempt_at >= weekStartIso,
  ).length;
  // Rating someone else's build (the new peer-rating system, completely
  // separate from the AI's SORZA Rating) satisfies "rate a build" just as
  // much as rating your own — isolated in its own try/catch so a
  // not-yet-migrated peer_ratings table degrades this one number to 0
  // instead of failing the whole weekly check.
  let peerRatingsGiven = 0;
  try {
    peerRatingsGiven = await countPeerRatingsGivenSince(supabase, userId, weekStartIso);
  } catch (err) {
    console.error("countPeerRatingsGivenSince failed:", err);
  }
  const ratingAttemptsThisWeek = ownRatingAttempts + peerRatingsGiven;

  const rawProgress = evaluateChallenges({
    postsThisWeek,
    ratingAttemptsThisWeek,
    likesReceivedThisWeek,
    commentsMadeThisWeek: commentsThisWeek,
  });

  const newlyCompletedIds = rawProgress
    .filter((p) => p.completed && !alreadyCompleted.has(p.id))
    .map((p) => p.id);

  if (newlyCompletedIds.length > 0) {
    // Same reasoning as checkAndUnlockAchievements: the completion was
    // just derived from the user's own real, RLS-scoped activity this
    // week, so this is the trusted place to record it — but the write
    // itself needs the service-role client since the insert policy on
    // user_challenge_completions was dropped (0081_lock_down_points_
    // economy.sql) to close the direct-API self-completion hole.
    await insertChallengeCompletions(createServiceRoleClient(), userId, newlyCompletedIds, key);
  }

  return {
    progress: rawProgress.map((p) => ({ ...p, claimed: claimedById.get(p.id) ?? false })),
    newlyCompleted: newlyCompletedIds
      .map((id) => getChallenge(id))
      .filter((c): c is ChallengeDef => Boolean(c)),
  };
}
