import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type UserAchievementRow = Database["public"]["Tables"]["user_achievements"]["Row"];

export async function listUnlockedAchievements(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<UserAchievementRow[]> {
  const { data, error } = await supabase
    .from("user_achievements")
    .select("*")
    .eq("user_id", userId)
    .order("unlocked_at", { ascending: true });
  if (error) throw error;
  return data;
}

/** Batched insert of newly-unlocked achievement ids — the unique
 * (user_id, achievement_id) constraint is the real guard against a
 * duplicate unlock race (two concurrent checks both deciding the same
 * achievement is new), so this doesn't need its own existence check
 * first; a conflict here just means someone else's check won the race. */
export async function insertAchievementUnlocks(
  supabase: SupabaseClient<Database>,
  userId: string,
  achievementIds: string[],
): Promise<void> {
  if (achievementIds.length === 0) return;
  const { error } = await supabase
    .from("user_achievements")
    .upsert(
      achievementIds.map((achievement_id) => ({ user_id: userId, achievement_id })),
      { onConflict: "user_id,achievement_id", ignoreDuplicates: true },
    );
  if (error) throw error;
}

/** The one row backing a claim attempt — `null` means this achievement
 * was never unlocked at all (not the same as "unlocked but unclaimed",
 * which is a real row with claimed_at still null). */
export async function getUserAchievement(
  supabase: SupabaseClient<Database>,
  userId: string,
  achievementId: string,
): Promise<UserAchievementRow | null> {
  const { data, error } = await supabase
    .from("user_achievements")
    .select("*")
    .eq("user_id", userId)
    .eq("achievement_id", achievementId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Conditioned on claimed_at still being null — a safety net against a
 * double-claim race alongside points_ledger's own unique constraint,
 * not the only guard. */
export async function markAchievementClaimed(
  supabase: SupabaseClient<Database>,
  userId: string,
  achievementId: string,
): Promise<void> {
  const { error } = await supabase
    .from("user_achievements")
    .update({ claimed_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("achievement_id", achievementId)
    .is("claimed_at", null);
  if (error) throw error;
}
