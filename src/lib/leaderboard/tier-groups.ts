import { rankForScore, type RankTier } from "@/lib/rating/rank";

export interface TierGroup<T> {
  tier: RankTier;
  /** 1-based board position of the group's first entry. */
  firstRank: number;
  entries: T[];
}

/** How far a score trails the one above it, to the hundredth of a
 * point (so 84.85 − 84.1 reads 0.75, not 0.7499999). Never negative. */
export function pointsBehind(aheadScore: number, score: number): number {
  return Math.max(0, Math.round((aheadScore - score) * 100) / 100);
}

/** Splits a ranked run of entries into consecutive same-tier groups, so
 * the board can name each tier once instead of on every row. `firstRank`
 * is the board position of `entries[0]` (the list below the podium
 * starts at 6). Entries are already sorted by score, so each tier forms
 * one contiguous run. */
export function groupByTier<T extends { score: number }>(entries: readonly T[], firstRank: number): TierGroup<T>[] {
  const groups: TierGroup<T>[] = [];
  entries.forEach((entry, i) => {
    const tier = rankForScore(entry.score);
    const last = groups[groups.length - 1];
    if (last && last.tier === tier) last.entries.push(entry);
    else groups.push({ tier, firstRank: firstRank + i, entries: [entry] });
  });
  return groups;
}
