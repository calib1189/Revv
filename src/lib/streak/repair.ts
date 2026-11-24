import { addDays } from "@/lib/daily/day";
import { computeStreak } from "@/lib/daily/streak";
import { STREAK_REPAIR_POINTS } from "@/lib/points/values";

/*
 * Restoring a lost streak. Miss a couple of days and the streak breaks
 * (lib/daily/streak.ts); for a few days after, its owner can pay to fill
 * the days they missed, which joins the run back up. The filled days
 * don't count toward its length or pay track points: you get back what
 * you had, not days you didn't play.
 *
 * Offered only when it's worth something and only shortly after: a run
 * of at least MIN_LOST_RUN days, lost no more than MAX_MISSED_DAYS ago,
 * and not more than once every COOLDOWN_DAYS.
 */

export const MAX_MISSED_DAYS = 3;
export const MIN_LOST_RUN = 2;
export const COOLDOWN_DAYS = 7;

export interface StreakDays {
  /** Days you took part (lib/daily/streak-days.ts). */
  active: string[];
  /** Days you paid to fill (streak_repairs, 0133). */
  repaired: string[];
}

export interface RepairOffer {
  /** The streak you lost. */
  lostRun: number;
  /** What it becomes once restored (plus today, if you've played). */
  restoredTo: number;
  /** The missed days the repair fills. */
  missingDays: string[];
  cost: number;
}

function daysBetween(fromKey: string, toKey: string): number {
  return Math.round((Date.parse(`${toKey}T00:00:00Z`) - Date.parse(`${fromKey}T00:00:00Z`)) / 86_400_000);
}

/** Whether a lost streak can be restored today, and what it would take.
 * `lastRepairKey` is the Sorza day of the most recent repair, if any. */
export function streakRepairOffer(days: StreakDays, todayKey: string, lastRepairKey: string | null): RepairOffer | null {
  const active = [...new Set(days.active)].filter((d) => d <= todayKey).sort();
  const activeToday = active[active.length - 1] === todayKey;
  const before = active.filter((d) => d < todayKey);
  if (before.length === 0) return null;
  const last = before[before.length - 1];

  const repaired = new Set(days.repaired);
  const missingDays: string[] = [];
  for (let d = addDays(last, 1); d < todayKey; d = addDays(d, 1)) if (!repaired.has(d)) missingDays.push(d);
  if (missingDays.length === 0 || missingDays.length > MAX_MISSED_DAYS) return null;

  // Not lost if the streak itself still carries it (a single missed day
  // it can bridge, or today still to play after missing only yesterday).
  const now = computeStreak(active, todayKey, days.repaired);
  const lost = activeToday ? now.current <= 1 : now.current === 0;
  if (!lost) return null;

  const lostRun = computeStreak(before, last, days.repaired).current;
  if (lostRun < MIN_LOST_RUN) return null;
  if (lastRepairKey && daysBetween(lastRepairKey, todayKey) < COOLDOWN_DAYS) return null;

  return { lostRun, restoredTo: lostRun + (activeToday ? 1 : 0), missingDays, cost: STREAK_REPAIR_POINTS };
}
