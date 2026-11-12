/** How long an owner waits between free ratings of the same car. */
export const RATE_LIMIT_HOURS = 24;

/** What skipping that wait costs, in points. 100 points is the $0.99
 * pack, comfortably above what one rating costs to run, and points
 * earned in the app count too. */
export const INSTANT_RERATE_POINTS = 100;

const HOUR_MS = 60 * 60 * 1000;

/** When the car can next be rated for free, or null if it can be now.
 * `lastAttemptAt` is the last real AI call (the gate counts every
 * attempt, saved or not). */
export function nextFreeRateAt(lastAttemptAt: string | null, now: Date = new Date()): Date | null {
  if (!lastAttemptAt) return null;
  const next = new Date(new Date(lastAttemptAt).getTime() + RATE_LIMIT_HOURS * HOUR_MS);
  return next.getTime() > now.getTime() ? next : null;
}

/** "5h" / "45m": the wait, rounded up, for the re-rate prompt. */
export function formatWait(until: Date, now: Date = new Date()): string {
  const ms = Math.max(0, until.getTime() - now.getTime());
  if (ms >= HOUR_MS) return `${Math.ceil(ms / HOUR_MS)}h`;
  return `${Math.max(1, Math.ceil(ms / 60_000))}m`;
}
