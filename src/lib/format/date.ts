/**
 * Formats a date-only string ("YYYY-MM-DD") without shifting days due to
 * timezone conversion — `new Date("2026-06-15")` parses as UTC midnight,
 * which displays as the previous day in any timezone behind UTC.
 */
export function formatDateOnly(dateOnly: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateOnly);
  if (!match) return dateOnly;

  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric", year: "numeric" },
  );
}

/** Formats a full timestamp as e.g. "Sat, Mar 14 · 6:00 PM" in the viewer's
 * local timezone. */
export function formatDateTime(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  const datePart = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timePart = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${datePart} · ${timePart}`;
}
