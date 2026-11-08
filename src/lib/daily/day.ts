/** Sorza Daily runs on one clock for everyone: a "Sorza day" is midnight
 * to midnight US Central time (America/Chicago), daylight saving
 * included. Each day is identified by its date key, e.g. "2026-11-08".
 * Every challenge, deadline, result and streak hangs off these keys, so
 * nobody ever sees a different challenge than anyone else, and a
 * submission can't be reset by the viewer's own time zone. */
export const DAILY_TIME_ZONE = "America/Chicago";

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
const WEEKDAYS: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 24 * 60 * 60 * 1000;

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: DAILY_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function centralParts(date: Date): Record<string, number> {
  const parts: Record<string, number> = {};
  for (const p of partsFormatter.formatToParts(date)) {
    if (p.type !== "literal") parts[p.type] = Number(p.value);
  }
  return parts;
}

/** Central time's offset from UTC at this instant, in ms (negative). */
function centralOffsetMs(date: Date): number {
  const p = centralParts(date);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

function parseKey(key: string): { y: number; m: number; d: number } {
  const match = KEY_PATTERN.exec(key);
  if (!match) throw new Error(`Not a date key: ${key}`);
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) {
    throw new Error(`Not a real date: ${key}`);
  }
  return { y, m, d };
}

function toKey(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** The Sorza day an instant falls in. */
export function dailyDateKey(now: Date = new Date()): string {
  const p = centralParts(now);
  return toKey(p.year, p.month, p.day);
}

/** Midnight Central on that date, as a real instant. US clocks change at
 * 2am, so midnight itself always exists exactly once. */
function centralMidnight(key: string): Date {
  const { y, m, d } = parseKey(key);
  const guess = Date.UTC(y, m - 1, d);
  let instant = guess - centralOffsetMs(new Date(guess));
  const corrected = guess - centralOffsetMs(new Date(instant));
  if (corrected !== instant) instant = corrected;
  return new Date(instant);
}

export function addDays(key: string, days: number): string {
  const { y, m, d } = parseKey(key);
  const shifted = new Date(Date.UTC(y, m - 1, d) + days * DAY_MS);
  return toKey(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
}

/** When a Sorza day opens and closes. 23 or 25 hours long on the two
 * daylight-saving days, 24 otherwise. */
export function dayBounds(key: string): { startsAt: Date; endsAt: Date } {
  return { startsAt: centralMidnight(key), endsAt: centralMidnight(addDays(key, 1)) };
}

export function weekdayOf(key: string): Weekday {
  const { y, m, d } = parseKey(key);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

export function isDateKey(value: string): boolean {
  try {
    parseKey(value);
    return true;
  } catch {
    return false;
  }
}

/** Whether a challenge is taking entries and votes right now. */
export function isChallengeOpen(challenge: { starts_at: string; ends_at: string }, now: Date = new Date()): boolean {
  const t = now.getTime();
  return t >= new Date(challenge.starts_at).getTime() && t < new Date(challenge.ends_at).getTime();
}
