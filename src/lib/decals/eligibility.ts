import { rankForScore, type RankTier } from "@/lib/rating/rank";

/** What a rank decal costs, US shipping included. Printful charges
 * about $10.98 for the weatherproof die-cut sticker shipped in the US
 * ($4.84 + $5.59 shipping + tax, Nov 2026). */
export const DECAL_PRICE_CENTS = 1499;

/**
 * The rank decal a viewer may order for a car: the rank the car actually
 * earned, and only for its owner, only once it's approved for the
 * leaderboard (so a decal always stands for a verified car), and only if
 * it has a score. Null means no decal to offer. Checked again on the
 * server when the order is placed.
 */
export function earnedDecalTier(input: {
  ownerId: string;
  viewerId: string | null;
  verificationStatus: string;
  score: number | null;
}): RankTier | null {
  if (!input.viewerId || input.viewerId !== input.ownerId) return null;
  if (input.verificationStatus !== "approved") return null;
  if (input.score == null) return null;
  return rankForScore(input.score);
}
