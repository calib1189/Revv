/** The highest non-null score in a list, or null if none exist — shared
 * by both "this crew's best rank" (the discover-page glow) and "this
 * member's best rank" (the avatar ring next to their cars), since both
 * are the same reduction over a different slice of scores. */
export function maxScore(scores: (number | null | undefined)[]): number | null {
  return scores.reduce<number | null>((best, score) => {
    if (score == null) return best;
    return best == null || score > best ? score : best;
  }, null);
}
