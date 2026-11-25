export type VoteSide = "a" | "b";

/** The votes as a run of single ticks for the result reveal, spread
 * evenly between the two cars so the bar sways the way the totals did
 * and lands exactly on them. It's a replay of the result, not of the
 * order people voted in, which stays private. */
export function voteSequence(a: number, b: number): VoteSide[] {
  const total = Math.max(0, a) + Math.max(0, b);
  const out: VoteSide[] = [];
  let da = 0;
  let db = 0;
  for (let i = 0; i < total; i++) {
    // Whichever side is furthest behind its share of the ticks so far.
    const owedA = a > 0 ? (i + 1) * (a / total) - da : -Infinity;
    const owedB = b > 0 ? (i + 1) * (b / total) - db : -Infinity;
    if (owedA >= owedB && da < a) {
      out.push("a");
      da += 1;
    } else {
      out.push("b");
      db += 1;
    }
  }
  return out;
}

/** When each tick lands, in ms from the start of the count: quick enough
 * that a big battle doesn't drag, slow enough that a small one reads
 * vote by vote, easing in so the last few land with weight. */
export function voteTickTimes(count: number): number[] {
  if (count === 0) return [];
  const duration = Math.min(2400, Math.max(900, count * 170));
  return Array.from({ length: count }, (_, k) => Math.round(duration * Math.pow((k + 1) / count, 1.25)));
}
