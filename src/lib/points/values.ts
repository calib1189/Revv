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

/** Every non-tier achievement is worth a flat amount — this is a
 * deliberate v1 simplification (CLAUDE.md: don't over-engineer) rather
 * than hand-tuning 90-odd individual values with no real difficulty
 * data behind them. Revisit if a real economy needs finer balance. */
const FLAT_ACHIEVEMENT_POINTS = 15;

export function pointsForAchievement(achievementId: string): number {
  const achievement = getAchievement(achievementId);
  if (achievement?.tier) return TIER_POINTS[achievement.tier];
  return FLAT_ACHIEVEMENT_POINTS;
}

/** Flat per weekly challenge, regardless of which one — encourages
 * finishing whichever challenges are live each week rather than
 * min-maxing toward the highest-value one. */
export const CHALLENGE_COMPLETION_POINTS = 25;
