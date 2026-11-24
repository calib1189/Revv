/** Who faces who in a day's Build Battle. Pure, and the same answer for
 * the same day and cars, so two overlapping hourly runs agree. */

export interface BattleCandidate {
  vehicleId: string;
  ownerId: string;
  /** The car's SORZA score now; matched close so it's a real call. */
  score: number;
  category: string;
  /** The last day (date key) this car battled, or null if never. */
  lastBattledOn: string | null;
}

/** A car sits out this many days after a battle, while there are others. */
export const BATTLE_REST_DAYS = 14;

function daysBetween(fromKey: string, toKey: string): number {
  return Math.round((Date.parse(`${toKey}T00:00:00Z`) - Date.parse(`${fromKey}T00:00:00Z`)) / 86_400_000);
}

/** A stable shuffle order for a day: FNV-1a over the day and the id. */
function tiebreak(dayKey: string, id: string): number {
  let h = 0x811c9dc5;
  for (const ch of `${dayKey}:${id}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/** Leads with the car that has waited longest for a battle (never
 * battled first), then gives it the closest score among the rest,
 * preferring its own category (truck vs truck) and never its own owner.
 * Cars rested after a recent battle are skipped unless that leaves no
 * pair at all. Null when there's no pair to make. */
export function pickMatchup(
  candidates: BattleCandidate[],
  dayKey: string,
  /** A car whose owner paid to skip the line: it leads, rested or not. */
  paidLeadId: string | null = null,
): { a: BattleCandidate; b: BattleCandidate } | null {
  const rested = candidates.filter(
    (c) => c.lastBattledOn === null || daysBetween(c.lastBattledOn, dayKey) >= BATTLE_REST_DAYS,
  );
  const paid = paidLeadId ? candidates.find((c) => c.vehicleId === paidLeadId) : undefined;
  if (paid) {
    const b = rivalFor(paid, rested, dayKey) ?? rivalFor(paid, candidates, dayKey);
    if (b) return { a: paid, b };
  }
  return pairFrom(rested, dayKey) ?? pairFrom(candidates, dayKey);
}

/** The closest score to `a` among the pool, its own category first,
 * never its own owner. */
function rivalFor(a: BattleCandidate, pool: BattleCandidate[], dayKey: string): BattleCandidate | null {
  const rivals = pool.filter((c) => c.ownerId !== a.ownerId && c.vehicleId !== a.vehicleId);
  if (rivals.length === 0) return null;
  const sameKind = rivals.filter((c) => c.category === a.category);
  return (sameKind.length > 0 ? sameKind : rivals).reduce((best, c) => {
    const gap = Math.abs(c.score - a.score);
    const bestGap = Math.abs(best.score - a.score);
    if (gap !== bestGap) return gap < bestGap ? c : best;
    return tiebreak(dayKey, c.vehicleId) < tiebreak(dayKey, best.vehicleId) ? c : best;
  });
}

function pairFrom(pool: BattleCandidate[], dayKey: string) {
  const order = [...pool].sort((x, y) => {
    if (x.lastBattledOn !== y.lastBattledOn) {
      if (x.lastBattledOn === null) return -1;
      if (y.lastBattledOn === null) return 1;
      return x.lastBattledOn < y.lastBattledOn ? -1 : 1;
    }
    return tiebreak(dayKey, x.vehicleId) - tiebreak(dayKey, y.vehicleId);
  });

  for (const a of order) {
    const b = rivalFor(a, order, dayKey);
    if (b) return { a, b };
  }
  return null;
}
