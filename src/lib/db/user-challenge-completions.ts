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
