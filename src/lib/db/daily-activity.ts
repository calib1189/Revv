import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type DailyActivityKind = "entered" | "voted" | "rated_rides" | "placed";

/** Kinds that count as showing up for the streak. Placing isn't one:
 * it's an outcome of entering, which already counts that day. */
export const STREAK_KINDS: DailyActivityKind[] = ["entered", "voted", "rated_rides"];

export interface DailyActivityRow {
  activity_date: string;
  kind: DailyActivityKind;
}

/** Someone's Sorza Daily participation, newest first (0105). RLS only
 * returns the signed-in user's own rows. */
export async function listDailyActivity(
  supabase: SupabaseClient<Database>,
  userId: string,
  limit = 400,
): Promise<DailyActivityRow[]> {
  const { data, error } = await supabase
    .from("daily_activity")
    .select("activity_date, kind")
    .eq("user_id", userId)
    .order("activity_date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

/** Records that someone took part today. Server only (service role):
 * the caller has already confirmed it really happened. Returns whether
 * this was new for the day (false if already recorded). */
export async function recordDailyActivityRow(
  userId: string,
  dateKey: string,
  kind: DailyActivityKind,
): Promise<boolean> {
  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("daily_activity")
    .upsert(
      { user_id: userId, activity_date: dateKey, kind },
      { onConflict: "user_id,activity_date,kind", ignoreDuplicates: true },
    )
    .select("user_id");
  if (error) throw error;
  return (data ?? []).length > 0;
}

/** Pays Sorza Daily points. The ledger's unique (user, source, id) key
 * means a given reward can only ever be paid once. */
export async function awardDailyPoints(userId: string, sourceId: string, amount: number): Promise<void> {
  if (amount <= 0) return;
  const service = createServiceRoleClient();
  const { error } = await service.from("points_ledger").upsert(
    { user_id: userId, amount, source_type: "daily", source_id: sourceId },
    { onConflict: "user_id,source_type,source_id", ignoreDuplicates: true },
  );
  if (error) throw error;
}

/** Whether someone has taken part on a given Sorza day. Throws if the
 * Daily tables don't exist yet, which callers use to hide Daily. */
export async function hasDailyActivityOn(
  supabase: SupabaseClient<Database>,
  userId: string,
  dateKey: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("daily_activity")
    .select("kind")
    .eq("user_id", userId)
    .eq("activity_date", dateKey)
    .in("kind", STREAK_KINDS)
    .limit(1);
  if (error) throw error;
  return data.length > 0;
}
