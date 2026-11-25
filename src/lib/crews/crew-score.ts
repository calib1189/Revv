/**
 * A crew's score: the best build of each of its top five rated members,
 * added up (so 0-500). Computed at read time from build ratings, never
 * stored (CLAUDE.md invariant 3).
 *
 * Five slots, with an empty slot counting as zero: a crew of one great
 * build is outscored by a crew of five good ones, so bringing people in
 * is what raises a crew. The crew's tier reads the score per slot
 * (score / 5) on the same 0-100 scale as a car's rating.
 */

export const CREW_SCORE_SLOTS = 5;

export interface CrewScore {
  /** Null until at least one member has a rated build. */
  score: number | null;
  /** The score per slot, 0-100, for reading a tier. Null with no score. */
  tierScore: number | null;
  /** Rated members counted (at most five). */
  counted: number;
  /** Slots still empty: rated members the crew is short of a full score. */
  openSlots: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** `memberBest`: each member's best build score (null if unrated). */
export function crewScore(memberBest: (number | null | undefined)[]): CrewScore {
  const rated = memberBest.filter((s): s is number => s != null).sort((a, b) => b - a).slice(0, CREW_SCORE_SLOTS);
  if (rated.length === 0) return { score: null, tierScore: null, counted: 0, openSlots: CREW_SCORE_SLOTS };
  const score = round2(rated.reduce((sum, s) => sum + s, 0));
  return { score, tierScore: round2(score / CREW_SCORE_SLOTS), counted: rated.length, openSlots: CREW_SCORE_SLOTS - rated.length };
}

/** Rated crews best first, each with its place (ties share a place). */
export function rankCrews<T extends { score: number | null }>(crews: T[]): (T & { place: number })[] {
  const sorted = crews.filter((c) => c.score != null).sort((a, b) => b.score! - a.score!);
  let place = 0;
  return sorted.map((c, i) => {
    if (i === 0 || c.score !== sorted[i - 1].score) place = i + 1;
    return { ...c, place };
  });
}
