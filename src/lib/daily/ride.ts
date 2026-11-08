/** Rate the Ride: three real garage cars a day, rated 1-5 stars into the
 * same community peer ratings the garage page shows (0074). Those are the
 * community's opinion; the SORZA AI score is a separate thing and is
 * never mixed into them. */
export const RIDE_ROUND_SIZE = 3;

export interface RideCandidate {
  vehicleId: string;
  ownerId: string;
}

/** FNV-1a: a small stable string hash, so a person's round for a given
 * day is the same every time it's built. */
function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function rank(seed: string, id: string): number {
  return hash(`${seed}:${id}`);
}

/** Picks a person's cars for the day: never their own, never one they've
 * already rated, and cars they were shown recently only when there
 * aren't enough others. Order is a stable shuffle keyed to the seed
 * (person + day), so it doesn't depend on how the candidates came back. */
export function pickRideRound({
  candidates,
  viewerId,
  rated,
  recentlyShown,
  seed,
  size = RIDE_ROUND_SIZE,
}: {
  candidates: RideCandidate[];
  viewerId: string;
  rated: Set<string>;
  recentlyShown: Set<string>;
  seed: string;
  size?: number;
}): string[] {
  const seen = new Set<string>();
  const eligible = candidates.filter((c) => {
    if (c.ownerId === viewerId || rated.has(c.vehicleId) || seen.has(c.vehicleId)) return false;
    seen.add(c.vehicleId);
    return true;
  });
  const byRank = (a: RideCandidate, b: RideCandidate) => rank(seed, a.vehicleId) - rank(seed, b.vehicleId);
  const fresh = eligible.filter((c) => !recentlyShown.has(c.vehicleId)).sort(byRank);
  const repeat = eligible.filter((c) => recentlyShown.has(c.vehicleId)).sort(byRank);
  return [...fresh, ...repeat].slice(0, size).map((c) => c.vehicleId);
}

export type CommunityComparison = "higher" | "lower" | "same" | "first";

/** How one person's stars compare with everyone else's average. Within
 * half a star counts as agreeing. */
export function compareToCommunity(stars: number, othersAverage: number | null): CommunityComparison {
  if (othersAverage === null) return "first";
  if (stars - othersAverage >= 0.5) return "higher";
  if (othersAverage - stars >= 0.5) return "lower";
  return "same";
}
