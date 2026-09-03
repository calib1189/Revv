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
