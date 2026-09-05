/** "Top X% of SORZA builds" — computed at read time from the same
 * leaderboard-eligible population (see listAllRatingScores), never
 * stored. `allScores` should include this build's own score. Returns
 * null when there's no real population to compare against (an empty or
 * single-build population isn't a percentile). */
export function computeTopPercent(score: number, allScores: number[]): number | null {
  if (allScores.length <= 1) return null;

  const better = allScores.filter((s) => s > score).length;
  const topPercent = (better / allScores.length) * 100;
  // Never claim literal 0.0% (nothing is "the top of nothing to compare
  // against") and keep one decimal — "Top 3.2%" reads as real
  // measurement, "Top 3%" reads like a round guess.
  return Math.max(0.1, Math.round(topPercent * 10) / 10);
}
