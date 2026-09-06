import type { SVGProps } from "react";
import { RANK_TIERS, RANK_LABELS, RANK_TEXT_COLORS, type RankTier } from "@/lib/rating/rank";
import {
  WheelIcon,
  BadgeIcon,
  VerifiedBadgeIcon,
  CompassIcon,
  GemIcon,
  ArrowUpIcon,
  PaintIcon,
  EngineIcon,
  SeatIcon,
  WrenchIcon,
  ShoppingBagIcon,
  CheckIcon,
  GalleryIcon,
  GridIcon,
  PlayIcon,
  HeartIcon,
  CommentIcon,
  EyeIcon,
  ShareIcon,
  BookmarkIcon,
  UsersIcon,
  FlagIcon,
  StarIcon,
  RotateIcon,
  TimerIcon,
  PersonIcon,
  BoltIcon,
} from "@/components/ui/icons";

export type AchievementCategory =
  | "garage"
  | "rating"
  | "mods"
  | "photos"
  | "posts"
  | "engagement"
  | "social"
  | "crew"
  | "leaderboard"
  | "meetups"
  | "maintenance"
  | "profile"
  | "challenges";

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  /** Only set for a tier milestone — drives both the badge's color and
   * icon (the real crest artwork, see rank-material-icons.tsx) so it
   * matches that tier's own look everywhere else in the app. Points for
   * these come from TIER_POINTS in lib/points/values.ts instead of this
   * field, on the same rarity curve as the tier itself. */
  tier?: RankTier;
  /** Every non-tier achievement gets one of these instead — no
   * achievement renders as a bare generic star. */
  icon?: (props: SVGProps<SVGSVGElement>) => React.JSX.Element;
  /** Points awarded on claim, hand-set per achievement against a fixed
   * 10/20/35/60/100 difficulty ladder (see lib/points/values.ts's
   * doc comment for the full reasoning) — not a flat value, and not a
   * formula derived from the id, since "how hard is this really" needs
   * a human read of what the achievement actually asks for, not just
   * its threshold number. Required on every non-tier achievement;
   * evaluate.test.ts enforces every catalog id has one or a tier. */
  points?: number;
}

function tierMilestones(): AchievementDef[] {
  return RANK_TIERS.slice()
    .reverse()
    .map((t) => ({
      id: `tier_${t.tier}`,
      name: `${RANK_LABELS[t.tier]} Tier`,
      description: `Reached ${RANK_LABELS[t.tier]} tier on a build`,
      category: "rating" as const,
      tier: t.tier,
    }));
}

/** The fixed, code-defined achievement catalog — 100 real, computable
 * milestones tied to the core loop, never a fabricated or arbitrary
 * list. See lib/achievements/evaluate.ts for how a user's real stats
 * get checked against these. A count-based achievement always unlocks
 * every lower tier of the same family too (evaluate.ts handles this via
 * a shared threshold check, not by listing each one's own condition
 * separately). */
export const ACHIEVEMENTS: AchievementDef[] = [
  // ---- Garage ----
  { id: "first_car", name: "First Car", description: "Added your first vehicle to the garage", category: "garage", icon: WheelIcon, points: 10 },
  { id: "car_collector_3", name: "Small Fleet", description: "Own 3 vehicles", category: "garage", icon: WheelIcon, points: 20 },
  { id: "car_collector_5", name: "Growing Fleet", description: "Own 5 vehicles", category: "garage", icon: WheelIcon, points: 35 },
  { id: "car_collector_10", name: "Car Collector", description: "Own 10 vehicles", category: "garage", icon: WheelIcon, points: 60 },
  { id: "verified_owner", name: "Verified", description: "Got ownership verified on a vehicle", category: "garage", icon: BadgeIcon, points: 20 },
  { id: "fully_verified", name: "All Verified", description: "Every vehicle in your garage is ownership-verified", category: "garage", icon: VerifiedBadgeIcon, points: 35 },
  { id: "multi_category", name: "Well Rounded Garage", description: "Own vehicles in 3 different categories", category: "garage", icon: CompassIcon, points: 35 },

  // ---- Rating: tiers ----
  ...tierMilestones(),

  // ---- Rating: activity & excellence ----
  { id: "first_rating", name: "Rated", description: "Got your first SORZA Rating", category: "rating", icon: GemIcon, points: 10 },
  { id: "rated_5_times", name: "Dialing It In", description: "Rated a build 5 times total", category: "rating", icon: GemIcon, points: 20 },
  { id: "rated_10_times", name: "Perfectionist", description: "Rated a build 10 times total", category: "rating", icon: GemIcon, points: 35 },
  { id: "rated_25_times", name: "Obsessed", description: "Rated a build 25 times total", category: "rating", icon: GemIcon, points: 60 },
  { id: "improved_10", name: "On the Rise", description: "Improved a build's rating by 10+ points from its first score", category: "rating", icon: ArrowUpIcon, points: 35 },
  { id: "improved_20", name: "Glow Up", description: "Improved a build's rating by 20+ points from its first score", category: "rating", icon: ArrowUpIcon, points: 60 },
  { id: "appearance_90", name: "Showroom Ready", description: "Scored 90+ on Appearance", category: "rating", icon: PaintIcon, points: 20 },
  { id: "performance_90", name: "Track Ready", description: "Scored 90+ on Performance", category: "rating", icon: EngineIcon, points: 20 },
  { id: "wheels_fitment_90", name: "Perfect Stance", description: "Scored 90+ on Wheels/Fitment", category: "rating", icon: WheelIcon, points: 20 },
  { id: "interior_90", name: "Cockpit Ready", description: "Scored 90+ on Interior", category: "rating", icon: SeatIcon, points: 20 },
  { id: "modifications_90", name: "Fully Built", description: "Scored 90+ on Modifications", category: "rating", icon: WrenchIcon, points: 20 },
  { id: "all_rounder", name: "All-Rounder", description: "Scored 80+ across every category on one build", category: "rating", icon: GemIcon, points: 60 },

  // ---- Mods ----
  { id: "first_mod", name: "First Mod", description: "Logged your first modification", category: "mods", icon: WrenchIcon, points: 10 },
  { id: "mods_5", name: "Getting Started", description: "Logged 5 modifications", category: "mods", icon: WrenchIcon, points: 20 },
  { id: "mods_10", name: "Building Momentum", description: "Logged 10 modifications", category: "mods", icon: WrenchIcon, points: 20 },
  { id: "mods_25", name: "Heavily Modded", description: "Logged 25 modifications", category: "mods", icon: WrenchIcon, points: 35 },
  { id: "mods_50", name: "Mod Master", description: "Logged 50 modifications", category: "mods", icon: WrenchIcon, points: 60 },
  { id: "mod_installed", name: "Wrenched In", description: "Marked a modification as installed", category: "mods", icon: CheckIcon, points: 10 },
  { id: "mods_installed_10", name: "Hands-On", description: "Installed 10 modifications", category: "mods", icon: CheckIcon, points: 20 },
  { id: "budget_set", name: "Budgeting", description: "Set a budget on a build", category: "mods", icon: ShoppingBagIcon, points: 10 },
  { id: "invested_1000", name: "Invested", description: "Spent $1,000+ across your builds", category: "mods", icon: ShoppingBagIcon, points: 20 },
  { id: "invested_5000", name: "Committed", description: "Spent $5,000+ across your builds", category: "mods", icon: ShoppingBagIcon, points: 35 },
  { id: "invested_10000", name: "All In", description: "Spent $10,000+ across your builds", category: "mods", icon: ShoppingBagIcon, points: 60 },

  // ---- Photos ----
  { id: "first_photo", name: "First Photo", description: "Added your first garage photo", category: "photos", icon: GalleryIcon, points: 10 },
  { id: "photos_10", name: "Photo Log", description: "Added 10 garage photos", category: "photos", icon: GalleryIcon, points: 20 },
  { id: "photos_25", name: "Documented", description: "Added 25 garage photos", category: "photos", icon: GalleryIcon, points: 35 },
  { id: "photos_50", name: "Photo Archive", description: "Added 50 garage photos", category: "photos", icon: GalleryIcon, points: 60 },

  // ---- Posts ----
  { id: "first_post", name: "First Post", description: "Shared your first build", category: "posts", icon: GridIcon, points: 10 },
  { id: "posts_5", name: "Getting Noticed", description: "Shared 5 posts", category: "posts", icon: GridIcon, points: 20 },
  { id: "posts_10", name: "Regular Poster", description: "Shared 10 posts", category: "posts", icon: GridIcon, points: 20 },
  { id: "posts_25", name: "Content Machine", description: "Shared 25 posts", category: "posts", icon: GridIcon, points: 35 },
  { id: "posts_50", name: "Feed Fixture", description: "Shared 50 posts", category: "posts", icon: GridIcon, points: 60 },
  { id: "posts_100", name: "Century Club", description: "Shared 100 posts", category: "posts", icon: GridIcon, points: 100 },
  { id: "posts_200", name: "Prolific", description: "Shared 200 posts", category: "posts", icon: GridIcon, points: 100 },
  { id: "video_creator", name: "Lights, Camera", description: "Shared your first video post", category: "posts", icon: PlayIcon, points: 10 },

  // ---- Engagement received ----
  { id: "hundred_likes", name: "Crowd Favorite", description: "A post reached 100 likes", category: "engagement", icon: HeartIcon, points: 35 },
  { id: "likes_500", name: "Viral Moment", description: "A post reached 500 likes", category: "engagement", icon: HeartIcon, points: 60 },
  { id: "likes_1000", name: "Blew Up", description: "A post reached 1,000 likes", category: "engagement", icon: HeartIcon, points: 100 },
  { id: "total_likes_100", name: "Well Liked", description: "Earned 100 total likes across all posts", category: "engagement", icon: HeartIcon, points: 20 },
  { id: "total_likes_500", name: "Fan Favorite", description: "Earned 500 total likes across all posts", category: "engagement", icon: HeartIcon, points: 35 },
  { id: "total_likes_1000", name: "Beloved", description: "Earned 1,000 total likes across all posts", category: "engagement", icon: HeartIcon, points: 60 },
  { id: "comments_received_10", name: "Conversation Starter", description: "Your posts received 10 comments total", category: "engagement", icon: CommentIcon, points: 20 },
  { id: "comments_received_50", name: "Talk of the Town", description: "Your posts received 50 comments total", category: "engagement", icon: CommentIcon, points: 35 },
  { id: "views_1000", name: "On the Radar", description: "A post reached 1,000 views", category: "engagement", icon: EyeIcon, points: 20 },
  { id: "views_10000", name: "Everywhere", description: "A post reached 10,000 views", category: "engagement", icon: EyeIcon, points: 60 },
  { id: "shared_10", name: "Shareable", description: "A post was shared 10 times", category: "engagement", icon: ShareIcon, points: 35 },
  { id: "saved_10", name: "Save-Worthy", description: "A post was saved 10 times", category: "engagement", icon: BookmarkIcon, points: 20 },

  // ---- Engagement given ----
  { id: "first_comment", name: "Joined In", description: "Left your first comment", category: "engagement", icon: CommentIcon, points: 10 },
  { id: "comments_made_25", name: "Active Voice", description: "Left 25 comments", category: "engagement", icon: CommentIcon, points: 20 },
  { id: "comments_made_100", name: "Community Regular", description: "Left 100 comments", category: "engagement", icon: CommentIcon, points: 35 },

  // ---- Social ----
  { id: "first_follower", name: "First Fan", description: "Gained your first follower", category: "social", icon: UsersIcon, points: 10 },
  { id: "followers_10", name: "Building a Following", description: "Reached 10 followers", category: "social", icon: UsersIcon, points: 20 },
  { id: "followers_50", name: "Known Name", description: "Reached 50 followers", category: "social", icon: UsersIcon, points: 35 },
  { id: "followers_100", name: "Small Following", description: "Reached 100 followers", category: "social", icon: UsersIcon, points: 60 },
  { id: "followers_500", name: "Rising Star", description: "Reached 500 followers", category: "social", icon: UsersIcon, points: 100 },
  { id: "followers_1000", name: "Influencer", description: "Reached 1,000 followers", category: "social", icon: UsersIcon, points: 100 },
  { id: "followers_5000", name: "SORZA Celebrity", description: "Reached 5,000 followers", category: "social", icon: UsersIcon, points: 100 },
  { id: "following_10", name: "Curating Your Feed", description: "Followed 10 accounts", category: "social", icon: UsersIcon, points: 10 },
  { id: "following_50", name: "Plugged In", description: "Followed 50 accounts", category: "social", icon: UsersIcon, points: 20 },

  // ---- Crew ----
  { id: "joined_crew", name: "Crew Member", description: "Joined a crew", category: "crew", icon: FlagIcon, points: 10 },
  { id: "joined_3_crews", name: "Well Connected", description: "Joined 3 crews", category: "crew", icon: FlagIcon, points: 20 },
  { id: "crew_founder", name: "Crew Founder", description: "Created a crew", category: "crew", icon: FlagIcon, points: 10 },
  { id: "crew_grew_10", name: "Building a Crew", description: "A crew you founded reached 10 members", category: "crew", icon: FlagIcon, points: 35 },
  { id: "crew_grew_50", name: "Crew Leader", description: "A crew you founded reached 50 members", category: "crew", icon: FlagIcon, points: 60 },

  // ---- Leaderboard ----
  { id: "top_100", name: "Top 100", description: "Cracked the top 100 on the leaderboard", category: "leaderboard", icon: StarIcon, points: 20 },
  { id: "top_50", name: "Top 50", description: "Cracked the top 50 on the leaderboard", category: "leaderboard", icon: StarIcon, points: 35 },
  { id: "top_10", name: "Top 10", description: "Cracked the top 10 on the leaderboard", category: "leaderboard", icon: StarIcon, points: 60 },
  { id: "top_3", name: "Podium Finish", description: "Cracked the top 3 on the leaderboard", category: "leaderboard", icon: GemIcon, points: 100 },
  { id: "number_one", name: "#1", description: "Reached #1 on the leaderboard", category: "leaderboard", icon: GemIcon, points: 100 },
  { id: "category_top_10", name: "Category Leader", description: "Cracked the top 10 in a category leaderboard", category: "leaderboard", icon: FlagIcon, points: 35 },

  // ---- Copy build ----
  { id: "copied_a_build", name: "Inspired By", description: "Copied someone else's build to your own garage", category: "mods", icon: RotateIcon, points: 20 },
  { id: "build_copied_by_others", name: "Trendsetter", description: "Someone copied one of your builds", category: "mods", icon: RotateIcon, points: 60 },

  // ---- Meetups ----
  { id: "hosted_meetup", name: "Meetup Host", description: "Hosted your first meetup", category: "meetups", icon: TimerIcon, points: 10 },
  { id: "hosted_5_meetups", name: "Regular Host", description: "Hosted 5 meetups", category: "meetups", icon: TimerIcon, points: 35 },

  // ---- Maintenance ----
  { id: "first_maintenance", name: "Maintenance Log", description: "Logged your first maintenance record", category: "maintenance", icon: WrenchIcon, points: 10 },
  { id: "maintenance_5", name: "Well Maintained", description: "Logged 5 maintenance records", category: "maintenance", icon: WrenchIcon, points: 20 },

  // ---- Profile ----
  { id: "profile_complete", name: "Profile Complete", description: "Added a bio and profile photo", category: "profile", icon: PersonIcon, points: 10 },
  { id: "verified_badge", name: "SORZA Verified", description: "Earned the SORZA verified badge", category: "profile", icon: VerifiedBadgeIcon, points: 60 },

  // ---- Weekly challenges ----
  { id: "first_challenge", name: "Challenger", description: "Completed your first weekly challenge", category: "challenges", icon: BoltIcon, points: 10 },
  { id: "perfect_week", name: "Perfect Week", description: "Completed every challenge in a single week", category: "challenges", icon: BoltIcon, points: 35 },

  // ---- Membership ----
  { id: "member_30_days", name: "One Month In", description: "Been on SORZA for 30 days", category: "profile", icon: StarIcon, points: 10 },
  { id: "member_100_days", name: "Regular", description: "Been on SORZA for 100 days", category: "profile", icon: StarIcon, points: 20 },
  { id: "member_1_year", name: "SORZA Veteran", description: "Been on SORZA for a full year", category: "profile", icon: StarIcon, points: 60 },
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
