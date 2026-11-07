/** How long an admin can promote a shop for free, in days. A fixed list
 * (not a free number) so a typo can't comp a shop for 3,000 days. */
export const COMP_LENGTH_DAYS = [30, 60, 90, 180] as const;
export type CompLengthDays = (typeof COMP_LENGTH_DAYS)[number];

export function isCompLengthDays(value: number): value is CompLengthDays {
  return (COMP_LENGTH_DAYS as readonly number[]).includes(value);
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** When a comp that starts at `start` runs out. */
export function compEndsAt(start: Date, days: CompLengthDays): Date {
  return new Date(start.getTime() + days * DAY_MS);
}
