export interface VoteTally {
  submissionId: string;
  userId: string;
  votes: number;
}

export interface Placement extends VoteTally {
  /** 1, 2 or 3. Tied entries share a place and the next place is
   * skipped, the standard way competitions rank ties (5, 5, 3 votes ->
   * 1st, 1st, 3rd). */
  place: number;
}

/** Turns a finished challenge's vote counts into its podium. Only real
 * votes count: an entry needs at least one to place, so a day with no
 * votes has no winner rather than an arbitrary one. Ties are never
 * broken by timing or anything else outside the votes themselves. */
export function computePlacements(tallies: VoteTally[]): Placement[] {
  const valid = tallies
    .filter((t) => Number.isInteger(t.votes) && t.votes > 0)
    // Votes first; the id only fixes the display order of a tie so it's
    // the same every time — both still get the same place.
    .sort((a, b) => b.votes - a.votes || a.submissionId.localeCompare(b.submissionId));

  const placements: Placement[] = [];
  valid.forEach((tally, index) => {
    const place = index > 0 && tally.votes === valid[index - 1].votes ? placements[index - 1].place : index + 1;
    placements.push({ ...tally, place });
  });
  return placements.filter((p) => p.place <= 3);
}
