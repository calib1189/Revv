import type { RankTier } from "@/lib/rating/rank";
import { getAchievement } from "@/lib/achievements/catalog";

/** Rarer tier, more points — highest tier (Cosmic) is 20x the lowest
 * (Bronze), reflecting how much harder each step actually is (per the
 * real score gaps in RANK_TIERS, not an even curve). */
const TIER_POINTS: Record<RankTier, number> = {
  bronze: 10,
  copper: 15,
  iron: 20,
  silver: 30,
  gold: 40,
  platinum: 60,
  emerald: 80,
  diamond: 110,
  ruby: 150,
  cosmic: 200,
};

/** Fallback only — every real catalog entry sets its own `points`
 * (catalog.test.ts enforces this), so this should never actually be
 * reached for a valid id. */
const FALLBACK_POINTS = 10;

/** Every non-tier achievement's value is hand-set in the catalog itself
 * against a fixed 10 (trivial, one-time actions) / 20 (early progress)
 * / 35 (real engagement) / 60 (dedicated effort) / 100 (elite, rare)
 * ladder — a genuine difficulty read on what each one actually asks
 * for, not a flat number or a guess from the id's threshold alone (a
 * post reaching 1,000 views on its own is a different kind of hard than
 * personally logging 50 mods, even though both involve a "50" and a
 * "1000"). Tier milestones use TIER_POINTS above instead, on the same
 * kind of rarity curve but keyed to real score gaps. */
export function pointsForAchievement(achievementId: string): number {
  const achievement = getAchievement(achievementId);
  if (achievement?.tier) return TIER_POINTS[achievement.tier];
  return achievement?.points ?? FALLBACK_POINTS;
}

/** Flat per weekly challenge, regardless of which one — encourages
 * finishing whichever challenges are live each week rather than
 * min-maxing toward the highest-value one. */
export const CHALLENGE_COMPLETION_POINTS = 25;
