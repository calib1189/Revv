import type { RankTier } from "@/lib/rating/rank";
import { getAchievement } from "@/lib/achievements/catalog";

/*
 * What playing earns. Set (Nov 2026) so a Legendary cosmetic (2,200
 * points) takes about three months of showing up every day, or a points
 * pack: earned points should feel like progress, not a free store.
 * economy.test.ts holds the numbers to that.
 *
 * Roughly, a player who never misses a day earns ~12 a day from the
 * Daily, ~32 a week from challenges, and a few hundred more over time
 * from achievements. Roughly a fifth of the launch values throughout.
 */

/** Rarer tier, more points: Cosmic is 20x Bronze, following the real
 * score gaps in RANK_TIERS rather than an even curve. */
const TIER_POINTS: Record<RankTier, number> = {
  bronze: 2,
  copper: 3,
  iron: 4,
  silver: 6,
  gold: 8,
  platinum: 12,
  emerald: 16,
  diamond: 22,
  ruby: 30,
  cosmic: 40,
};

/** Fallback only: every real catalog entry sets its own `points`
 * (catalog.test.ts enforces this). */
const FALLBACK_POINTS = 2;

/** Every non-tier achievement's value is hand-set in the catalog against
 * a 2 (trivial, one-time) / 4 (early progress) / 7 (real engagement) /
 * 12 (dedicated effort) / 20 (elite, rare) ladder: a read on what each
 * one actually asks for. Tier milestones use TIER_POINTS instead. */
export function pointsForAchievement(achievementId: string): number {
  const achievement = getAchievement(achievementId);
  if (achievement?.tier) return TIER_POINTS[achievement.tier];
  return achievement?.points ?? FALLBACK_POINTS;
}

/** Flat per weekly challenge, so whichever ones are live are all worth
 * finishing. */
export const CHALLENGE_COMPLETION_POINTS = 8;

/** Sorza Daily. Each is paid at most once per person per day (the
 * ledger's unique key), so only coming back tomorrow earns more.
 * Placing is the big one; taking part is modest on purpose. */
export const DAILY_POINTS = {
  entered: 6,
  voted: 3,
  ratedRides: 3,
  place: { 1: 25, 2: 15, 3: 10 } as Record<number, number>,
  streak: { 7: 15, 30: 50 } as Record<number, number>,
};
