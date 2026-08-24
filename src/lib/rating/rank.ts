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

/** Single source of truth for tier boundaries, highest first. Score is
 * 0-10. Each tier spans a full point except ruby and cosmic at the top,
 * which split the last point in half (9-9.4 ruby, 9.5-10 cosmic) so cosmic
 * is reachable without requiring a literal perfect 10. `rankForScore` and
 * the leaderboard's tier ladder both derive from this list so the two
 * never drift apart. */
export const RANK_TIERS: { tier: RankTier; min: number }[] = [
  { tier: "cosmic", min: 9.5 },
  { tier: "ruby", min: 9 },
  { tier: "diamond", min: 8 },
  { tier: "emerald", min: 7 },
  { tier: "platinum", min: 6 },
  { tier: "gold", min: 5 },
  { tier: "silver", min: 4 },
  { tier: "iron", min: 3 },
  { tier: "copper", min: 2 },
  { tier: "bronze", min: 0 },
];

export function rankForScore(score: number): RankTier {
  return RANK_TIERS.find((t) => score >= t.min)!.tier;
}

/** "9.5 – 10", "9 – 9.4", etc. — the inclusive score range for a tier. */
export function rankRangeLabel(tier: RankTier): string {
  const index = RANK_TIERS.findIndex((t) => t.tier === tier);
  const { min } = RANK_TIERS[index];
  const prevTier = RANK_TIERS[index - 1];
  if (!prevTier) return `${min} – 10`;
  const max = Math.round((prevTier.min - 0.1) * 10) / 10;
  return `${min} – ${max}`;
}
