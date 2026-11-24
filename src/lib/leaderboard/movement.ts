import { scoreAsOf } from "@/lib/rating/rank-drops";

/** How a build's place moved since a moment ago: up or down by some
 * number of places, or new to the board (it had no score then). Zero
 * movement is no entry at all. */
export type RankMovement = { kind: "up" | "down"; places: number } | { kind: "new" };

export interface BoardScore {
  buildId: string;
  score: number;
  /** When the current score was given; null for scores older than
   * timestamps. */
  ratedAt: string | null;
}

/** Each build's movement on a board between `since` and now, rebuilt
 * from rating history: nothing about rank is stored (the same approach
 * as the "your car got passed" push, lib/rating/rank-drops.ts).
 *
 * `board` is every build on this board (the same filter the page uses),
 * not just the ones shown, since a build below the cut yesterday still
 * held a place then. `history` only needs rows for builds rated since
 * `since`; every other build scored the same then as now.
 *
 * A place is 1 + the number of builds that scored strictly higher, the
 * same tie rule as the board's own ordering would give a tied pair. */
export function rankMovement(
  board: readonly BoardScore[],
  history: readonly { buildId: string; score: number; ratedAt: string }[],
  since: Date,
): Map<string, RankMovement> {
  const historyByBuild = new Map<string, { score: number; ratedAt: string }[]>();
  for (const row of history) {
    const rows = historyByBuild.get(row.buildId) ?? [];
    rows.push({ score: row.score, ratedAt: row.ratedAt });
    historyByBuild.set(row.buildId, rows);
  }

  const then = board.map((b) => ({
    buildId: b.buildId,
    now: b.score,
    then: scoreAsOf({ score: b.score, ratedAt: b.ratedAt }, historyByBuild.get(b.buildId) ?? [], since),
  }));
  const nowScores = then.map((b) => b.now).sort((a, b) => b - a);
  const thenScores = then.flatMap((b) => (b.then === null ? [] : [b.then])).sort((a, b) => b - a);

  const movement = new Map<string, RankMovement>();
  for (const b of then) {
    if (b.then === null) {
      movement.set(b.buildId, { kind: "new" });
      continue;
    }
    const placeNow = placeOf(b.now, nowScores);
    const placeThen = placeOf(b.then, thenScores);
    if (placeNow < placeThen) movement.set(b.buildId, { kind: "up", places: placeThen - placeNow });
    else if (placeNow > placeThen) movement.set(b.buildId, { kind: "down", places: placeNow - placeThen });
  }
  return movement;
}

/** 1 + how many scores in a descending list beat `score`. */
function placeOf(score: number, descending: readonly number[]): number {
  let lo = 0;
  let hi = descending.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (descending[mid] > score) lo = mid + 1;
    else hi = mid;
  }
  return lo + 1;
}
