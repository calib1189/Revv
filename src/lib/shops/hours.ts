/** A shop's weekly hours as its owner sets them (business_profiles.hours,
 * 0101). Every day is present: an object means open, null means closed. */
export const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type DayKey = (typeof DAY_KEYS)[number];

export const DAY_LABELS: Record<DayKey, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

// A type alias, not an interface, so it can be stored as JSON.
export type DayHours = { open: string; close: string };

export type BusinessHours = Record<DayKey, DayHours | null>;

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function isTime(value: unknown): value is string {
  return typeof value === "string" && TIME_PATTERN.test(value);
}

/** Validates stored or submitted hours. Returns null for anything that
 * isn't a complete, sensible week, so a bad value is never displayed. */
export function parseBusinessHours(value: unknown): BusinessHours | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const result = {} as BusinessHours;

  for (const key of DAY_KEYS) {
    if (!(key in record)) return null;
    const day = record[key];
    if (day === null) {
      result[key] = null;
      continue;
    }
    if (typeof day !== "object" || Array.isArray(day)) return null;
    const { open, close } = day as Record<string, unknown>;
    if (!isTime(open) || !isTime(close) || close <= open) return null;
    result[key] = { open, close };
  }
  return result;
}

/** "17:30" -> "5:30 PM", "08:00" -> "8 AM". */
export function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const suffix = h < 12 ? "AM" : "PM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour12} ${suffix}` : `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function formatDayHours(day: DayHours | null): string {
  return day ? `${formatTime(day.open)} – ${formatTime(day.close)}` : "Closed";
}

/** Which day key a date falls on, in the viewer's local time. */
export function dayKeyFor(date: Date): DayKey {
  // getDay(): 0 = Sunday … 6 = Saturday
  return DAY_KEYS[(date.getDay() + 6) % 7];
}
