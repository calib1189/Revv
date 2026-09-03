import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export async function listCompletedChallengeIds(
  supabase: SupabaseClient<Database>,
  userId: string,
  weekStartKey: string,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("user_challenge_completions")
    .select("challenge_id")
    .eq("user_id", userId)
    .eq("week_start", weekStartKey);
  if (error) throw error;
  return new Set(data.map((row) => row.challenge_id));
}

/** Every completion this user has ever recorded, across every week —
 * for lifetime achievement thresholds (first_challenge, perfect_week),
 * distinct from listCompletedChallengeIds which is scoped to one week
 * for the live progress card. */
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
