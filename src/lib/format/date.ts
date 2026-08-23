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
