import type { BuildRatingSubscores } from "@/lib/providers/rating-provider";

/**
 * The headline build score, from all six of the model's numbers.
 *
 * A model asked for "a score with two decimals" picks a handful of
 * familiar values (92.25, 87.50, 95.75), so builds piled up on the same
 * few scores and tied on the leaderboard. The model's five category
 * scores are separate, honest judgments of the same build, so blending
 * them into its headline number gives every build a score that reflects
 * all of them. That lands anywhere on the hundredths, and the same
 * inputs always give the same result. No randomness is added.
 *
 * The holistic score still carries most of the weight: it's the model's
 * overall call, and the categories refine it rather than replace it.
 */

const HOLISTIC_WEIGHT = 0.65;

// What matters most to how a build is judged on SORZA. Interior is low
// because it's often barely visible in photos and scored as neutral.
const CATEGORY_WEIGHTS: Record<keyof BuildRatingSubscores, number> = {
  appearance: 0.25,
  modifications: 0.25,
  wheelsFitment: 0.2,
  performance: 0.2,
  interior: 0.1,
};

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function blendRatingScore(holistic: number, subscores: BuildRatingSubscores): number {
  const categories = (Object.keys(CATEGORY_WEIGHTS) as (keyof BuildRatingSubscores)[]).reduce(
    (sum, key) => sum + clamp(subscores[key]) * CATEGORY_WEIGHTS[key],
    0,
  );
  const blended = clamp(holistic) * HOLISTIC_WEIGHT + categories * (1 - HOLISTIC_WEIGHT);
  return Math.round(clamp(blended) * 100) / 100;
}
