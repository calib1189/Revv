export interface RankPosition {
  /** 1-indexed — the same "how many strictly-better scores exist, plus
   * one" rule computeTopPercent uses, so a tie doesn't count as ahead
   * of you. */
  rank: number;
  /** Points needed to overtake the next-best score above yours, or null
   * if you're already #1. Always rounded to 2 decimal places — the same
   * precision scores themselves are shown at. */
  gapToNext: number | null;
}

/** "You're #42 · 2.15 to pass #41" — computed live against `allScores`
 * (which should include this score itself), never stored. Ties don't
 * separate two builds' rank (both would report the same rank number),
 * matching how a real leaderboard would render them as sharing a
 * position rather than an arbitrary tiebreak deciding who's "above"
 * whom here. */
export function computeRankPosition(score: number, allScores: number[]): RankPosition {
  const better = allScores.filter((s) => s > score);
  const rank = better.length + 1;

  if (better.length === 0) return { rank, gapToNext: null };

  const nextBest = Math.min(...better);
  return { rank, gapToNext: Math.round((nextBest - score) * 100) / 100 };
}
