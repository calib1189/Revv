export type RankTier =
  | "bronze"
  | "copper"
  | "iron"
  | "silver"
  | "gold"
  | "platinum"
  | "emerald"
  | "diamond"
  | "ruby"
  | "cosmic";

export const RANK_LABELS: Record<RankTier, string> = {
  bronze: "Bronze",
  copper: "Copper",
  iron: "Iron",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
  emerald: "Emerald",
  diamond: "Diamond",
  ruby: "Ruby",
  cosmic: "Cosmic",
};

/** Badge chip background per tier — matches the frame border colors in
 * globals.css. Cosmic gets a dark chip since it needs to sit on top of a
 * bright starfield, everything else is light enough for dark text. */
export const RANK_BADGE_COLORS: Record<RankTier, string> = {
  bronze: "#c98a52",
  copper: "#d99569",
  iron: "#aeb2bb",
  silver: "#dde1e7",
  gold: "#f0cd6e",
  platinum: "#eef4f8",
  emerald: "#5be3a9",
  diamond: "#c9f4ff",
  ruby: "#f27a93",
  cosmic: "#1a0b2e",
};

export const RANK_BADGE_TEXT_COLORS: Record<RankTier, string> = {
  bronze: "#0a0a0b",
  copper: "#0a0a0b",
  iron: "#0a0a0b",
  silver: "#0a0a0b",
  gold: "#0a0a0b",
  platinum: "#0a0a0b",
  emerald: "#0a0a0b",
  diamond: "#0a0a0b",
  ruby: "#0a0a0b",
  cosmic: "#f4f4f5",
};

/** Tier color for use as foreground text/icon color directly on the
 * app's own dark background (rate-build-panel headings, the garage-list
 * best-build badge) — a DIFFERENT use from RANK_BADGE_COLORS, which is a
 * chip *background* meant to be paired with RANK_BADGE_TEXT_COLORS.
 * Identical to RANK_BADGE_COLORS for every tier except cosmic: cosmic's
 * badge color is near-black on purpose (it's a dark chip background),
 * which reads as invisible text on the app's own near-black background.
 * This swaps in a legible light lavender for that one case while keeping
 * the "cosmic purple" identity, instead of just falling back to plain
 * white. */
export const RANK_TEXT_COLORS: Record<RankTier, string> = {
  ...RANK_BADGE_COLORS,
  cosmic: "#c9b6ff",
};

/** Single source of truth for tier boundaries, highest first. Score is
 * 0-100 with two decimal places (e.g. 95.25). Boundaries themselves stay
 * clean round numbers — each tier spans a full ten-point band except ruby
 * and cosmic at the top, which split the last band in half (90-94.99
 * ruby, 95-100 cosmic) so cosmic is reachable without requiring a literal
 * perfect 100. `rankForScore` and the leaderboard's tier ladder both
 * derive from this list so the two never drift apart. */
export const RANK_TIERS: { tier: RankTier; min: number }[] = [
  { tier: "cosmic", min: 95 },
  { tier: "ruby", min: 90 },
  { tier: "diamond", min: 80 },
  { tier: "emerald", min: 70 },
  { tier: "platinum", min: 60 },
  { tier: "gold", min: 50 },
  { tier: "silver", min: 40 },
  { tier: "iron", min: 30 },
  { tier: "copper", min: 20 },
  { tier: "bronze", min: 0 },
];

export function rankForScore(score: number): RankTier {
  return RANK_TIERS.find((t) => score >= t.min)!.tier;
}

/** "95 – 100", "90 – 94.99", etc. — the inclusive score range for a tier. */
export function rankRangeLabel(tier: RankTier): string {
  const index = RANK_TIERS.findIndex((t) => t.tier === tier);
  const { min } = RANK_TIERS[index];
  const prevTier = RANK_TIERS[index - 1];
  if (!prevTier) return `${min} – 100`;
  const max = Math.round((prevTier.min - 0.01) * 100) / 100;
  return `${min} – ${max}`;
}
