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

/** Score is 0-10. Each tier spans a full point except the top, which is
 * reserved for a perfect 10. */
export function rankForScore(score: number): RankTier {
  if (score >= 10) return "cosmic";
  if (score >= 9) return "ruby";
  if (score >= 8) return "diamond";
  if (score >= 7) return "emerald";
  if (score >= 6) return "platinum";
  if (score >= 5) return "gold";
  if (score >= 4) return "silver";
  if (score >= 3) return "iron";
  if (score >= 2) return "copper";
  return "bronze";
}
