import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { listVehiclesByOwner } from "@/lib/db/vehicles";
import { listActiveBuildsByVehicleIds } from "@/lib/db/builds";
import { listPostsByAuthor } from "@/lib/db/posts";
import { countPostsSince, countCommentsSince, countLikesReceivedSince } from "@/lib/db/weekly-stats";
import { listCompletedChallengeIds, insertChallengeCompletions } from "@/lib/db/user-challenge-completions";
import { getWeekStart, weekStartKey } from "@/lib/challenges/week";
import { evaluateChallenges, type ChallengeProgress } from "@/lib/challenges/evaluate";
import { getChallenge, type ChallengeDef } from "@/lib/challenges/catalog";

export interface WeeklyChallengesResult {
  progress: ChallengeProgress[];
  newlyCompleted: ChallengeDef[];
}

/** Gathers this week's real stats, evaluates progress against the fixed
 * catalog (see evaluate.ts), and records any newly-completed challenge
 * (a real, week-scoped row — see 0073_weekly_challenges.sql) so the
 * celebratory toast only ever fires once per completion. Meant to be
 * called from the same kind of frequently-visited page achievements
 * check from (Garage, own profile) — no cron job, no background worker. */
export async function getWeeklyChallengeProgress(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<WeeklyChallengesResult> {
  const weekStart = getWeekStart();
  const weekStartIso = weekStart.toISOString();
  const key = weekStartKey(weekStart);

  const [vehicles, posts, alreadyCompleted] = await Promise.all([
    listVehiclesByOwner(supabase, userId),
    listPostsByAuthor(supabase, userId),
    listCompletedChallengeIds(supabase, userId, key),
  ]);

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

  const ratingAttemptsThisWeek = [...activeBuildByVehicle.values()].filter(
    (b) => b.ai_rating_last_attempt_at != null && b.ai_rating_last_attempt_at >= weekStartIso,
  ).length;

  const progress = evaluateChallenges({
    postsThisWeek,
    ratingAttemptsThisWeek,
    likesReceivedThisWeek,
    commentsMadeThisWeek: commentsThisWeek,
  });

  const newlyCompletedIds = progress
    .filter((p) => p.completed && !alreadyCompleted.has(p.id))
    .map((p) => p.id);

  if (newlyCompletedIds.length > 0) {
    await insertChallengeCompletions(supabase, userId, newlyCompletedIds, key);
  }

  return {
    progress,
    newlyCompleted: newlyCompletedIds
      .map((id) => getChallenge(id))
      .filter((c): c is ChallengeDef => Boolean(c)),
  };
}
