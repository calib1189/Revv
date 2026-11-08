import { addDays } from "@/lib/daily/day";

/** How long a bridged (missed) day blocks another bridge, in days. */
const BRIDGE_COOLDOWN_DAYS = 7;

export interface Streak {
  /** Active days in the current run (bridged days don't count). */
  current: number;
  longest: number;
  activeToday: boolean;
  /** The run only survives if you take part today (you missed yesterday
   * and it was bridged). */
  atRisk: boolean;
}

function daysBetween(fromKey: string, toKey: string): number {
  return Math.round((Date.parse(`${toKey}T00:00:00Z`) - Date.parse(`${fromKey}T00:00:00Z`)) / 86_400_000);
}

/** A Sorza Daily participation streak, computed from the days someone
 * took part (any of: entered, voted, rated their rides). Built to reward
 * showing up, not to punish a busy day: one missed day is bridged as
 * long as the last bridge was at least a week earlier. Two missed days
 * in a row, or two misses in one week, start a new run. */
export function computeStreak(activeDateKeys: string[], todayKey: string): Streak {
  const dates = [...new Set(activeDateKeys)].filter((d) => d <= todayKey).sort();
  if (dates.length === 0) return { current: 0, longest: 0, activeToday: false, atRisk: false };

  let run = 0;
  let longest = 0;
  let lastBridge: string | null = null;
  let previous: string | null = null;
  for (const date of dates) {
    const gap = previous ? daysBetween(previous, date) : 0;
    if (previous === null) {
      run = 1;
    } else if (gap === 1) {
      run += 1;
    } else if (gap === 2 && (lastBridge === null || daysBetween(lastBridge, addDays(date, -1)) >= BRIDGE_COOLDOWN_DAYS)) {
      run += 1;
      lastBridge = addDays(date, -1);
    } else {
      run = 1;
      lastBridge = null;
    }
    longest = Math.max(longest, run);
    previous = date;
  }

  const last = dates[dates.length - 1];
  const sinceLast = daysBetween(last, todayKey);
  const canBridgeYesterday =
    lastBridge === null || daysBetween(lastBridge, addDays(todayKey, -1)) >= BRIDGE_COOLDOWN_DAYS;
  const alive = sinceLast <= 1 || (sinceLast === 2 && canBridgeYesterday);

  return {
    current: alive ? run : 0,
    longest,
    activeToday: sinceLast === 0,
    atRisk: alive && sinceLast === 2,
  };
}
