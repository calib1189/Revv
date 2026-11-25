import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { listDailyActivity, STREAK_KINDS } from "@/lib/db/daily-activity";
import { listMyBattleVoteTimes } from "@/lib/db/battles";
import { listStreakRepairs } from "@/lib/db/streak-repairs";
import { addDays, dailyDateKey } from "@/lib/daily/day";
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

export interface StreakState {
  streak: number;
  showedUpToday: boolean;
  chestUnopened: boolean;
}

/** How far back the evening push looks: enough for any streak worth
 * warning about, without reading everyone's whole history every hour.
 * A longer streak is still warned about, just counted to this many. */
const PUSH_WINDOW_DAYS = 90;

/** Streaks for many people at once, for the evening push (lib/daily/
 * notify.ts): a query per source rather than per person. Server only
 * (service role). Repairs and chests are best-effort, like everywhere
 * else, so a missing table (before 0132/0133) only leaves them out. */
export async function loadStreakStates(
  service: SupabaseClient<Database>,
  userIds: string[],
  todayKey: string,
): Promise<Map<string, StreakState>> {
  const states = new Map<string, StreakState>();
  if (userIds.length === 0) return states;
  const since = addDays(todayKey, -PUSH_WINDOW_DAYS);
  const sinceInstant = `${since}T00:00:00Z`;

  const [activity, votes, repairs, chests] = await Promise.all([
    service
      .from("daily_activity")
      .select("user_id, activity_date")
      .in("user_id", userIds)
      .in("kind", STREAK_KINDS)
      .gte("activity_date", since),
    service.from("build_battle_votes").select("voter_id, created_at").in("voter_id", userIds).gte("created_at", sinceInstant),
    service.from("streak_repairs").select("user_id, repaired_date").in("user_id", userIds).gte("repaired_date", since),
    service.from("streak_chests").select("user_id").in("user_id", userIds).is("opened_at", null),
  ]);
  if (activity.error) throw activity.error;

  const days = new Map<string, StreakDays>();
  const of = (id: string) => {
    let d = days.get(id);
    if (!d) days.set(id, (d = { active: [], repaired: [] }));
    return d;
  };
  for (const row of activity.data) of(row.user_id).active.push(row.activity_date);
  for (const row of votes.error ? [] : votes.data) of(row.voter_id).active.push(dailyDateKey(new Date(row.created_at)));
  for (const row of repairs.error ? [] : repairs.data) of(row.user_id).repaired.push(row.repaired_date);
  const withChest = new Set((chests.error ? [] : chests.data).map((row) => row.user_id));

  for (const id of userIds) {
    const streak = streakFrom(days.get(id) ?? { active: [], repaired: [] }, todayKey);
    states.set(id, { streak: streak.current, showedUpToday: streak.activeToday, chestUnopened: withChest.has(id) });
  }
  return states;
}

/** The streak as of `todayKey`, from what listStreakDays loaded. */
export function streakFrom(days: StreakDays, todayKey: string): Streak {
  return computeStreak(days.active, todayKey, days.repaired);
}
