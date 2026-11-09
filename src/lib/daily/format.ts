const LONG = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
const SHORT = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

function keyToUtcDate(key: string): Date {
  return new Date(`${key}T12:00:00Z`);
}

/** "Sunday, November 8" for a Sorza day key. */
export function formatDayLong(key: string): string {
  return LONG.format(keyToUtcDate(key));
}

/** "Sun, Nov 8". */
export function formatDayShort(key: string): string {
  return SHORT.format(keyToUtcDate(key));
}

/** "5h 12m", "12m 30s", or null once it's over. */
export function formatTimeLeft(ms: number): string | null {
  if (ms <= 0) return null;
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

/** "23:41:07" (hours:minutes:seconds), or null once it's over. */
export function formatClock(ms: number): string | null {
  if (ms <= 0) return null;
  const totalSeconds = Math.floor(ms / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(totalSeconds / 3600))}:${pad(Math.floor((totalSeconds % 3600) / 60))}:${pad(totalSeconds % 60)}`;
}

/** The first Sorza Daily ran on this Sorza day. */
export const FIRST_DAILY_DATE = "2026-11-08";

/** Which Daily this is, counting the first as No. 1. */
export function dailyNumber(key: string): number {
  const ms = Date.parse(`${key}T12:00:00Z`) - Date.parse(`${FIRST_DAILY_DATE}T12:00:00Z`);
  return Math.max(1, Math.round(ms / 86_400_000) + 1);
}
