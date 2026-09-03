import { RANK_TIERS, RANK_LABELS, RANK_TEXT_COLORS, type RankTier } from "@/lib/rating/rank";

export type AchievementCategory = "garage" | "social" | "leaderboard" | "crew";

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  /** Only set for a tier milestone — drives the badge's color so it
   * matches that tier's own rank color everywhere else in the app. */
  tier?: RankTier;
}

/** The fixed, code-defined achievement catalog — real, computable
 * milestones tied to the core loop (add a car, get rated, climb tiers,
 * post, get engagement, compete on the leaderboard, join a crew), never
 * a fabricated or arbitrary list. See lib/achievements/evaluate.ts for
 * how a user's real stats get checked against these. Reaching a tier
 * unlocks every tier at or below it too (climbing to Diamond implies
 * you've also "reached" Bronze) — see evaluateAchievements. */
export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "first_car",
    name: "First Car",
    description: "Added your first vehicle to the garage",
    category: "garage",
  },
  {
    id: "verified_owner",
    name: "Verified",
    description: "Got ownership verified on a vehicle",
    category: "garage",
  },
  {
    id: "first_rating",
    name: "Rated",
    description: "Got your first REVV Rating",
    category: "garage",
  },
  ...RANK_TIERS.slice()
    .reverse()
    .map((t) => ({
      id: `tier_${t.tier}`,
      name: `${RANK_LABELS[t.tier]} Tier`,
      description: `Reached ${RANK_LABELS[t.tier]} tier on a build`,
      category: "garage" as const,
      tier: t.tier,
    })),
  {
    id: "first_post",
    name: "First Post",
    description: "Shared your first build",
    category: "social",
  },
  {
    id: "hundred_likes",
    name: "Crowd Favorite",
    description: "A post reached 100 likes",
    category: "social",
  },
  {
    id: "first_follower",
    name: "First Fan",
    description: "Gained your first follower",
    category: "social",
  },
  {
    id: "ten_followers",
    name: "Building a Following",
    description: "Reached 10 followers",
    category: "social",
  },
  {
    id: "joined_crew",
    name: "Crew Member",
    description: "Joined a crew",
    category: "crew",
  },
  {
    id: "top_100",
    name: "Top 100",
    description: "Cracked the top 100 on the leaderboard",
    category: "leaderboard",
  },
  {
    id: "top_10",
    name: "Top 10",
    description: "Cracked the top 10 on the leaderboard",
    category: "leaderboard",
  },
  {
    id: "number_one",
    name: "#1",
    description: "Reached #1 on the leaderboard",
    category: "leaderboard",
  },
];

const ACHIEVEMENT_BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));

export function getAchievement(id: string): AchievementDef | undefined {
  return ACHIEVEMENT_BY_ID.get(id);
}

/** Badge color — a tier milestone uses that tier's own color (so
 * "Diamond Tier" reads visually consistent with every Diamond ring
 * elsewhere in the app); everything else uses a single neutral gold,
 * distinct from any real rank tier's color so a non-tier achievement is
 * never mistaken for a rank claim. */
export function achievementColor(achievement: AchievementDef): string {
  return achievement.tier ? RANK_TEXT_COLORS[achievement.tier] : "#e8bf4f";
}
