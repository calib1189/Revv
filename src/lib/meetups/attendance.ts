/** How long after its start time a meet still counts as happening. The
 * Meets list keeps a meet visible for the same window, and
 * 0098_meetup_attendees.sql only accepts new RSVPs inside it. */
export const MEETUP_GRACE_MS = 3 * 60 * 60 * 1000;

export function isMeetupOver(startsAt: string, now: number = Date.now()): boolean {
  return now > Date.parse(startsAt) + MEETUP_GRACE_MS;
}

/** The meet's overall rating: the average score of the cars going,
 * counting only cars that have a rating. People without a car, or with
 * an unrated one, are left out rather than counted as zero. Computed on
 * read, never stored. */
export function meetRating(scores: (number | null)[]): {
  average: number | null;
  ratedCount: number;
} {
  const rated = scores.filter((s): s is number => s != null);
  if (rated.length === 0) return { average: null, ratedCount: 0 };
  const sum = rated.reduce((total, s) => total + s, 0);
  return { average: Math.round((sum / rated.length) * 100) / 100, ratedCount: rated.length };
}

/** Highest-rated cars first, like a mini leaderboard; unrated cars and
 * people without one follow, in the order they said they're going. */
export function sortAttendees<T extends { score: number | null; joinedAt: string }>(
  attendees: T[],
): T[] {
  return [...attendees].sort((a, b) => {
    if (a.score != null && b.score != null) return b.score - a.score;
    if (a.score != null) return -1;
    if (b.score != null) return 1;
    return a.joinedAt.localeCompare(b.joinedAt);
  });
}
