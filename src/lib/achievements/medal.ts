import type { AchievementCategory, AchievementDef } from "@/lib/achievements/catalog";

/**
 * How each achievement's medal looks, worked out from what the
 * achievement is, so nothing has to be drawn by hand per badge and no two
 * end up alike:
 *
 * - shape: how hard it is (its points), told in garage hardware: a lug
 *   cap, a shield, a hex nut, a gear, then a crest for the hardest
 * - colour: its section (garage, mods, social...)
 * - number plate: the milestone in a counted family (50, 1K, $10K)
 * - pattern: the machined finish behind the icon, varied per achievement
 *
 * Tier milestones don't use this: they keep the tier's own crest artwork.
 */

export type MedalShape = "cap" | "shield" | "nut" | "gear" | "crest";
export type MedalPattern = "rays" | "checker" | "carbon" | "rings" | "knurl";

const SHAPE_BY_POINTS: [number, MedalShape][] = [
  [100, "crest"],
  [60, "gear"],
  [35, "nut"],
  [20, "shield"],
  [0, "cap"],
];

export function medalShape(points: number | undefined): MedalShape {
  const p = points ?? 0;
  return SHAPE_BY_POINTS.find(([min]) => p >= min)![1];
}

/** One hue per section, picked to stay apart from each other on a dark
 * ground. Garage gets the brand red. */
export const MEDAL_COLORS: Record<AchievementCategory, string> = {
  garage: "#ff4433",
  rating: "#b47bff",
  mods: "#ff9f0a",
  photos: "#2dd4bf",
  posts: "#3b82f6",
  engagement: "#f472b6",
  social: "#34d399",
  crew: "#7c83ff",
  leaderboard: "#e8bf4f",
  meetups: "#22d3ee",
  maintenance: "#94a3b8",
  profile: "#e5e7eb",
  challenges: "#84cc16",
  daily: "#ff4433",
};

const PATTERNS: MedalPattern[] = ["rays", "checker", "carbon", "rings", "knurl"];

/** Stable per id, so a medal looks the same everywhere it appears. */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function medalPattern(id: string): MedalPattern {
  return PATTERNS[hash(id) % PATTERNS.length];
}

function compact(n: number): string {
  if (n >= 1000) return `${n / 1000}K`;
  return String(n);
}

/** The short figure on a counted milestone's plate, or null for a
 * one-off achievement. Read from the id's own threshold so it can never
 * disagree with what unlocks it. */
export function medalMark(id: string): string | null {
  if (id === "number_one") return "#1";
  if (id === "hundred_likes") return "100";
  const member = id.match(/^member_(\d+)_(days|year)$/);
  if (member) return member[2] === "year" ? `${member[1]} YR` : `${member[1]} D`;
  // The threshold is the id's last number: posts_50, rated_5_times,
  // joined_3_crews.
  const counted = id.match(/_(\d+)(?:_[a-z]+)?$/);
  if (!counted) return null;
  const n = Number(counted[1]);
  // "improved_10" and "*_90" are a score, not a count.
  if (id.startsWith("improved_")) return `+${n}`;
  if (/_90$/.test(id)) return "90+";
  if (id.startsWith("invested_")) return `$${compact(n)}`;
  if (/(^|_)top_\d+$/.test(id)) return `TOP ${n}`;
  return compact(n);
}

export interface MedalDesign {
  shape: MedalShape;
  color: string;
  pattern: MedalPattern;
  mark: string | null;
}

export function medalDesign(achievement: AchievementDef): MedalDesign {
  return {
    shape: medalShape(achievement.points),
    color: MEDAL_COLORS[achievement.category],
    pattern: medalPattern(achievement.id),
    mark: medalMark(achievement.id),
  };
}
