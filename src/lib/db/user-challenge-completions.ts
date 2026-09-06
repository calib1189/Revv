import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export interface WeekCompletion {
  challengeId: string;
  claimedAt: string | null;
}

/** Every completion for one week, with claim status — replaces a
 * plain Set of ids since the weekly card now needs to know not just
 * "did you finish this" but "have you collected the points for it
 * yet" (see claimChallengePointsAction). */
export async function listWeekCompletions(
  supabase: SupabaseClient<Database>,
  userId: string,
  weekStartKey: string,
): Promise<WeekCompletion[]> {
  const { data, error } = await supabase
    .from("user_challenge_completions")
    .select("challenge_id, claimed_at")
    .eq("user_id", userId)
    .eq("week_start", weekStartKey);
  if (error) throw error;
  return data.map((row) => ({ challengeId: row.challenge_id, claimedAt: row.claimed_at }));
}

/** Every completion this user has ever recorded, across every week —
 * for lifetime achievement thresholds (first_challenge, perfect_week),
 * distinct from listWeekCompletions which is scoped to one week for
 * the live progress card. */
export async function listAllChallengeCompletions(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ challengeId: string; weekStart: string }[]> {
  const { data, error } = await supabase
    .from("user_challenge_completions")
    .select("challenge_id, week_start")
    .eq("user_id", userId);
  if (error) throw error;
  return data.map((row) => ({ challengeId: row.challenge_id, weekStart: row.week_start }));
}

/** Same upsert-with-ignoreDuplicates pattern as insertAchievementUnlocks
 * — the unique (user_id, challenge_id, week_start) constraint is the
 * real race guard, not an existence check beforehand. */
export async function insertChallengeCompletions(
  supabase: SupabaseClient<Database>,
  userId: string,
  challengeIds: string[],
  weekStartKey: string,
): Promise<void> {
  if (challengeIds.length === 0) return;
  const { error } = await supabase
    .from("user_challenge_completions")
    .upsert(
      challengeIds.map((challenge_id) => ({ user_id: userId, challenge_id, week_start: weekStartKey })),
      { onConflict: "user_id,challenge_id,week_start", ignoreDuplicates: true },
    );
  if (error) throw error;
}

/** The one row backing a claim attempt — `claimed_at` tells the caller
 * whether it's already been collected. `null` means no completion
 * recorded at all yet (not the same as "completed but unclaimed"). */
export async function getChallengeCompletion(
  supabase: SupabaseClient<Database>,
  userId: string,
  challengeId: string,
  weekStartKey: string,
): Promise<WeekCompletion | null> {
  const { data, error } = await supabase
    .from("user_challenge_completions")
    .select("challenge_id, claimed_at")
    .eq("user_id", userId)
    .eq("challenge_id", challengeId)
    .eq("week_start", weekStartKey)
    .maybeSingle();
  if (error) throw error;
  return data ? { challengeId: data.challenge_id, claimedAt: data.claimed_at } : null;
}

/** Conditioned on claimed_at still being null — a safety net against a
 * double-claim race alongside points_ledger's own unique constraint,
 * not the only guard. */
export async function markChallengeCompletionClaimed(
  supabase: SupabaseClient<Database>,
  userId: string,
  challengeId: string,
  weekStartKey: string,
): Promise<void> {
  const { error } = await supabase
    .from("user_challenge_completions")
    .update({ claimed_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("challenge_id", challengeId)
    .eq("week_start", weekStartKey)
    .is("claimed_at", null);
  if (error) throw error;
}
