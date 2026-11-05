import { computeRankPosition } from "./rank-position";

export const LEADERBOARD_TOP_SIZE = 10;

export interface LeaderboardEntry {
  buildId: string;
  score: number;
}

export interface LeaderboardDisplacement {
  buildId: string;
  /** "first": this build was #1 and isn't any more. "top10": it was in
   * the top 10 and has just been pushed out. */
  lost: "first" | "top10";
}

/** Who to tell when one build's score changes from `oldScore` (null when
 * it wasn't on the board) to `newScore`.
 *
 * `others` is every OTHER build on the board, not including the one that
 * moved. Only two moments count: losing #1 and dropping out of the top
 * 10. Dropping from #4 to #5 is not worth a notification. Each moment can
 * only reach a build again after it has climbed back into that spot,
 * which is what keeps this from flooding anyone's phone. Ranks use the
 * same rule as computeRankPosition, so a tie never counts as being
 * passed. */
export function findLeaderboardDisplacements(
  others: LeaderboardEntry[],
  oldScore: number | null,
  newScore: number,
): LeaderboardDisplacement[] {
  const otherScores = others.map((e) => e.score);
  const before = oldScore === null ? otherScores : [...otherScores, oldScore];
  const after = [...otherScores, newScore];

  const displaced: LeaderboardDisplacement[] = [];
  for (const entry of others) {
    const rankBefore = computeRankPosition(entry.score, before).rank;
    const rankAfter = computeRankPosition(entry.score, after).rank;
    if (rankAfter <= rankBefore) continue;

    if (rankBefore === 1) {
      displaced.push({ buildId: entry.buildId, lost: "first" });
    } else if (rankBefore <= LEADERBOARD_TOP_SIZE && rankAfter > LEADERBOARD_TOP_SIZE) {
      displaced.push({ buildId: entry.buildId, lost: "top10" });
    }
  }
  return displaced;
}
