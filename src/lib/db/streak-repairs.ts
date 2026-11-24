import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/** The days someone paid to fill in their streak (0133), newest first,
 * with when each repair was bought. RLS: your own only. */
export async function listStreakRepairs(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ date: string; createdAt: string }[]> {
  const { data, error } = await supabase
    .from("streak_repairs")
    .select("repaired_date, created_at")
    .eq("user_id", userId)
    .order("repaired_date", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data.map((row) => ({ date: row.repaired_date, createdAt: row.created_at }));
}

/** Fills missed days. Server only, after the points are taken. */
export async function insertStreakRepairs(
  service: SupabaseClient<Database>,
  userId: string,
  dates: string[],
): Promise<void> {
  if (dates.length === 0) return;
  const { error } = await service
    .from("streak_repairs")
    .upsert(
      dates.map((d) => ({ user_id: userId, repaired_date: d })),
      { onConflict: "user_id,repaired_date", ignoreDuplicates: true },
    );
  if (error) throw error;
}
