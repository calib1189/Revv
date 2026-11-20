import { computeRankPosition } from "./rank-position";
import { LEADERBOARD_TOP_SIZE } from "./leaderboard-displacement";

/** "Your car got passed" — the once-a-day leaderboard push for everyone
 * below the top 10, who otherwise never hear that the board moved
 * (findLeaderboardDisplacements only covers losing #1 and dropping out of
 * the top 10, and fires the moment it happens).
 *
 * Nothing about rank is stored. Yesterday's board is rebuilt from
 * build_rating_history, so both boards are computed at read time from
 * the same scores the leaderboard itself shows. */

export interface RankBoardEntry {
  buildId: string;
  ownerId: string;
  /** Score at the start of the window, or null if it wasn't on the board
   * yet (first rated since then). */
  scoreThen: number | null;
  scoreNow: number;
}

export interface RankDrop {
  buildId: string;
  ownerId: string;
  from: number;
  to: number;
  /** Other owners' builds that are ahead now but weren't then, best
   * score first. */
  passedBy: string[];
}

/** What a build scored at `at`. Its current score if that was given by
 * then (or has no time on record, i.e. it predates timestamps);
 * otherwise the last history row from before `at`; otherwise null. */
export function scoreAsOf(
  current: { score: number; ratedAt: string | null },
  history: { score: number; ratedAt: string }[],
  at: Date,
): number | null {
  const cutoff = at.getTime();
  if (current.ratedAt === null || new Date(current.ratedAt).getTime() <= cutoff) return current.score;
  let best: { score: number; time: number } | null = null;
  for (const row of history) {
    const time = new Date(row.ratedAt).getTime();
    if (time <= cutoff && (!best || time > best.time)) best = { score: row.score, time };
  }
  return best?.score ?? null;
}

export function findRankDrops(board: RankBoardEntry[]): RankDrop[] {
  const thenScores = board.flatMap((e) => (e.scoreThen === null ? [] : [e.scoreThen]));
  const nowScores = board.map((e) => e.scoreNow);
  const drops: RankDrop[] = [];

  for (const entry of board) {
    if (entry.scoreThen === null) continue;
    // Their own re-rate came in lower: they already know why they moved.
    if (entry.scoreNow < entry.scoreThen) continue;

    const from = computeRankPosition(entry.scoreThen, thenScores).rank;
    const to = computeRankPosition(entry.scoreNow, nowScores).rank;
    if (to <= from) continue;
    // These two moments already got their own push when they happened.
    if (from === 1) continue;
    if (from <= LEADERBOARD_TOP_SIZE && to > LEADERBOARD_TOP_SIZE) continue;

    const passedBy = board
      .filter(
        (other) =>
          other.ownerId !== entry.ownerId &&
          other.scoreNow > entry.scoreNow &&
          !(other.scoreThen !== null && other.scoreThen > entry.scoreThen!),
      )
      .sort((a, b) => b.scoreNow - a.scoreNow)
      .map((other) => other.buildId);
    if (passedBy.length === 0) continue;

    drops.push({ buildId: entry.buildId, ownerId: entry.ownerId, from, to, passedBy });
  }
  return drops;
}

/** One push per person: the car of theirs that sits highest. */
export function bestDropPerOwner(drops: RankDrop[]): RankDrop[] {
  const byOwner = new Map<string, RankDrop>();
  for (const drop of drops) {
    const kept = byOwner.get(drop.ownerId);
    if (!kept || drop.to < kept.to) byOwner.set(drop.ownerId, drop);
  }
  return [...byOwner.values()];
}

export function rankDropBody({
  carName,
  to,
  passers,
}: {
  carName: string;
  to: number;
  passers: { username: string; carName: string }[];
}): string {
  if (passers.length === 1) {
    const [p] = passers;
    return `@${p.username}'s ${p.carName} passed your ${carName}. You're #${to} now.`;
  }
  return `${passers.length} cars passed your ${carName} since yesterday. You're #${to} now.`;
}
