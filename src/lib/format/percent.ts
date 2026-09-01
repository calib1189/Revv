/** Signed percent difference of `value` relative to `baseline` — e.g.
 * relativePercentDiff(174, 100) is 74 ("74% better than average"),
 * relativePercentDiff(50, 100) is -50 ("50% worse"). Returns null for a
 * zero or negative baseline rather than dividing by zero into an
 * infinite or misleading number — there's no meaningful "better than
 * average" when there's no real average to compare against yet (e.g. a
 * creator's first-ever post, or one with no engagement on any post). */
export function relativePercentDiff(value: number, baseline: number): number | null {
  if (baseline <= 0) return null;
  return Math.round(((value - baseline) / baseline) * 100);
}
