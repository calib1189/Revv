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

/** Tier color for use as foreground text/icon color directly on the
 * app's own dark background (rate-build-panel headings, the garage-list
 * best-build badge, the rank-badge chip) — every badge chip now sits on
 * a neutral dark background rather than a solid tier-color fill (a solid
 * fill made the full-color badge artwork blend into a same-hue backdrop),
 * so there's no separate "chip background" palette to keep in sync
 * anymore. Cosmic gets a legible light lavender instead of its ring's
 * near-black so it doesn't disappear against the same dark background
 * everything else sits on. */
export const RANK_TEXT_COLORS: Record<RankTier, string> = {
  bronze: "#c98a52",
  copper: "#d99569",
  iron: "#aeb2bb",
  silver: "#dde1e7",
  gold: "#f0cd6e",
  platinum: "#eef4f8",
  emerald: "#5be3a9",
  diamond: "#c9f4ff",
  ruby: "#f27a93",
  cosmic: "#c9b6ff",
};

/** Background-wash color per tier, for the rating-reveal's full-screen
 * ambient background specifically. Identical to RANK_TEXT_COLORS except
 * for diamond: #c9f4ff reads fine as icon/text color but is too close
 * to white to register as "blue" once diluted into a soft background
 * glow — this swaps in a properly saturated blue for that one case,
 * same identity, without touching diamond's icon/text/badge color
 * anywhere else. */
export const RANK_AMBIENT_COLORS: Record<RankTier, string> = {
  ...RANK_TEXT_COLORS,
  diamond: "#2f8fef",
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
