const DAY_MS = 24 * 60 * 60 * 1000;

/** Monday 00:00 UTC of the week containing `now` — a fixed, deterministic
 * boundary (UTC, not the viewer's local timezone) so "this week" means
 * the same thing regardless of who's asking or when their server clock
 * renders the page, the same reasoning the feed's ranking window uses
 * plain day-based cutoffs rather than per-viewer timezone math. */
export function getWeekStart(now: Date = new Date()): Date {
  const day = now.getUTCDay(); // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysSinceMonday),
  );
}

/** The following Monday 00:00 UTC — challenges reset here. */
export function getWeekEnd(weekStart: Date): Date {
  return new Date(weekStart.getTime() + 7 * DAY_MS);
}

/** "2026-09-01" — a stable, sortable key for scoping a completion row to
 * its week (see 0073_weekly_challenges.sql's week_start column). */
export function weekStartKey(weekStart: Date): string {
  return weekStart.toISOString().slice(0, 10);
}
