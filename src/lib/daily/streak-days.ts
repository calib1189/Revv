import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { listDailyActivity, STREAK_KINDS } from "@/lib/db/daily-activity";
import { listMyBattleVoteTimes } from "@/lib/db/battles";
import { listStreakRepairs } from "@/lib/db/streak-repairs";
import { dailyDateKey } from "@/lib/daily/day";
import { computeStreak, type Streak } from "@/lib/daily/streak";
import type { StreakDays } from "@/lib/streak/repair";

export interface LoadedStreakDays extends StreakDays {
  /** The Sorza day the latest repair was bought, if any. */
  lastRepairKey: string | null;
}

/** Everything a streak is worked out from (lib/daily/streak.ts): every
 * Sorza day someone showed up (took part in the Daily, or voted in the
 * Build Battle), and any missed days they paid to fill. Nothing about
 * the streak itself is stored. A battle vote counts on the Sorza day it
 * was cast, which is the battle's own day.
 *
 * Battle votes and repairs are best-effort: if they can't be read (or
 * their tables aren't set up yet), the Daily alone still counts. */
export async function listStreakDays(supabase: SupabaseClient<Database>, userId: string): Promise<LoadedStreakDays> {
  const [activity, votes, repairs] = await Promise.all([
    listDailyActivity(supabase, userId),
    listMyBattleVoteTimes(supabase, userId).catch(() => [] as string[]),
    listStreakRepairs(supabase, userId).catch(() => [] as { date: string; createdAt: string }[]),
  ]);
  const latestRepair = repairs.reduce<string | null>((max, r) => (max === null || r.createdAt > max ? r.createdAt : max), null);
  return {
    active: [
      ...activity.filter((a) => STREAK_KINDS.includes(a.kind)).map((a) => a.activity_date),
      ...votes.map((at) => dailyDateKey(new Date(at))),
    ],
    repaired: repairs.map((r) => r.date),
    lastRepairKey: latestRepair ? dailyDateKey(new Date(latestRepair)) : null,
  };
}

/** The streak as of `todayKey`, from what listStreakDays loaded. */
export function streakFrom(days: StreakDays, todayKey: string): Streak {
  return computeStreak(days.active, todayKey, days.repaired);
}
