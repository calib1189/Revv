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
   * matches that tier's own look everywhere else in the app. */
  tier?: RankTier;
  /** Every non-tier achievement gets one of these instead — no
   * achievement renders as a bare generic star. */
  icon?: (props: SVGProps<SVGSVGElement>) => React.JSX.Element;
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
  { id: "first_car", name: "First Car", description: "Added your first vehicle to the garage", category: "garage", icon: WheelIcon },
  { id: "car_collector_3", name: "Small Fleet", description: "Own 3 vehicles", category: "garage", icon: WheelIcon },
  { id: "car_collector_5", name: "Growing Fleet", description: "Own 5 vehicles", category: "garage", icon: WheelIcon },
  { id: "car_collector_10", name: "Car Collector", description: "Own 10 vehicles", category: "garage", icon: WheelIcon },
  { id: "verified_owner", name: "Verified", description: "Got ownership verified on a vehicle", category: "garage", icon: BadgeIcon },
  { id: "fully_verified", name: "All Verified", description: "Every vehicle in your garage is ownership-verified", category: "garage", icon: VerifiedBadgeIcon },
  { id: "multi_category", name: "Well Rounded Garage", description: "Own vehicles in 3 different categories", category: "garage", icon: CompassIcon },

  // ---- Rating: tiers ----
  ...tierMilestones(),

  // ---- Rating: activity & excellence ----
  { id: "first_rating", name: "Rated", description: "Got your first SORZA Rating", category: "rating", icon: GemIcon },
  { id: "rated_5_times", name: "Dialing It In", description: "Rated a build 5 times total", category: "rating", icon: GemIcon },
  { id: "rated_10_times", name: "Perfectionist", description: "Rated a build 10 times total", category: "rating", icon: GemIcon },
  { id: "rated_25_times", name: "Obsessed", description: "Rated a build 25 times total", category: "rating", icon: GemIcon },
  { id: "improved_10", name: "On the Rise", description: "Improved a build's rating by 10+ points from its first score", category: "rating", icon: ArrowUpIcon },
  { id: "improved_20", name: "Glow Up", description: "Improved a build's rating by 20+ points from its first score", category: "rating", icon: ArrowUpIcon },
  { id: "appearance_90", name: "Showroom Ready", description: "Scored 90+ on Appearance", category: "rating", icon: PaintIcon },
  { id: "performance_90", name: "Track Ready", description: "Scored 90+ on Performance", category: "rating", icon: EngineIcon },
  { id: "wheels_fitment_90", name: "Perfect Stance", description: "Scored 90+ on Wheels/Fitment", category: "rating", icon: WheelIcon },
  { id: "interior_90", name: "Cockpit Ready", description: "Scored 90+ on Interior", category: "rating", icon: SeatIcon },
  { id: "modifications_90", name: "Fully Built", description: "Scored 90+ on Modifications", category: "rating", icon: WrenchIcon },
  { id: "all_rounder", name: "All-Rounder", description: "Scored 80+ across every category on one build", category: "rating", icon: GemIcon },

  // ---- Mods ----
  { id: "first_mod", name: "First Mod", description: "Logged your first modification", category: "mods", icon: WrenchIcon },
  { id: "mods_5", name: "Getting Started", description: "Logged 5 modifications", category: "mods", icon: WrenchIcon },
  { id: "mods_10", name: "Building Momentum", description: "Logged 10 modifications", category: "mods", icon: WrenchIcon },
  { id: "mods_25", name: "Heavily Modded", description: "Logged 25 modifications", category: "mods", icon: WrenchIcon },
  { id: "mods_50", name: "Mod Master", description: "Logged 50 modifications", category: "mods", icon: WrenchIcon },
  { id: "mod_installed", name: "Wrenched In", description: "Marked a modification as installed", category: "mods", icon: CheckIcon },
  { id: "mods_installed_10", name: "Hands-On", description: "Installed 10 modifications", category: "mods", icon: CheckIcon },
  { id: "budget_set", name: "Budgeting", description: "Set a budget on a build", category: "mods", icon: ShoppingBagIcon },
  { id: "invested_1000", name: "Invested", description: "Spent $1,000+ across your builds", category: "mods", icon: ShoppingBagIcon },
  { id: "invested_5000", name: "Committed", description: "Spent $5,000+ across your builds", category: "mods", icon: ShoppingBagIcon },
  { id: "invested_10000", name: "All In", description: "Spent $10,000+ across your builds", category: "mods", icon: ShoppingBagIcon },

  // ---- Photos ----
  { id: "first_photo", name: "First Photo", description: "Added your first garage photo", category: "photos", icon: GalleryIcon },
  { id: "photos_10", name: "Photo Log", description: "Added 10 garage photos", category: "photos", icon: GalleryIcon },
  { id: "photos_25", name: "Documented", description: "Added 25 garage photos", category: "photos", icon: GalleryIcon },
  { id: "photos_50", name: "Photo Archive", description: "Added 50 garage photos", category: "photos", icon: GalleryIcon },

  // ---- Posts ----
  { id: "first_post", name: "First Post", description: "Shared your first build", category: "posts", icon: GridIcon },
  { id: "posts_5", name: "Getting Noticed", description: "Shared 5 posts", category: "posts", icon: GridIcon },
  { id: "posts_10", name: "Regular Poster", description: "Shared 10 posts", category: "posts", icon: GridIcon },
  { id: "posts_25", name: "Content Machine", description: "Shared 25 posts", category: "posts", icon: GridIcon },
  { id: "posts_50", name: "Feed Fixture", description: "Shared 50 posts", category: "posts", icon: GridIcon },
  { id: "posts_100", name: "Century Club", description: "Shared 100 posts", category: "posts", icon: GridIcon },
  { id: "posts_200", name: "Prolific", description: "Shared 200 posts", category: "posts", icon: GridIcon },
  { id: "video_creator", name: "Lights, Camera", description: "Shared your first video post", category: "posts", icon: PlayIcon },

  // ---- Engagement received ----
  { id: "hundred_likes", name: "Crowd Favorite", description: "A post reached 100 likes", category: "engagement", icon: HeartIcon },
  { id: "likes_500", name: "Viral Moment", description: "A post reached 500 likes", category: "engagement", icon: HeartIcon },
  { id: "likes_1000", name: "Blew Up", description: "A post reached 1,000 likes", category: "engagement", icon: HeartIcon },
  { id: "total_likes_100", name: "Well Liked", description: "Earned 100 total likes across all posts", category: "engagement", icon: HeartIcon },
  { id: "total_likes_500", name: "Fan Favorite", description: "Earned 500 total likes across all posts", category: "engagement", icon: HeartIcon },
  { id: "total_likes_1000", name: "Beloved", description: "Earned 1,000 total likes across all posts", category: "engagement", icon: HeartIcon },
  { id: "comments_received_10", name: "Conversation Starter", description: "Your posts received 10 comments total", category: "engagement", icon: CommentIcon },
  { id: "comments_received_50", name: "Talk of the Town", description: "Your posts received 50 comments total", category: "engagement", icon: CommentIcon },
  { id: "views_1000", name: "On the Radar", description: "A post reached 1,000 views", category: "engagement", icon: EyeIcon },
  { id: "views_10000", name: "Everywhere", description: "A post reached 10,000 views", category: "engagement", icon: EyeIcon },
  { id: "shared_10", name: "Shareable", description: "A post was shared 10 times", category: "engagement", icon: ShareIcon },
  { id: "saved_10", name: "Save-Worthy", description: "A post was saved 10 times", category: "engagement", icon: BookmarkIcon },

  // ---- Engagement given ----
  { id: "first_comment", name: "Joined In", description: "Left your first comment", category: "engagement", icon: CommentIcon },
  { id: "comments_made_25", name: "Active Voice", description: "Left 25 comments", category: "engagement", icon: CommentIcon },
  { id: "comments_made_100", name: "Community Regular", description: "Left 100 comments", category: "engagement", icon: CommentIcon },

  // ---- Social ----
  { id: "first_follower", name: "First Fan", description: "Gained your first follower", category: "social", icon: UsersIcon },
  { id: "followers_10", name: "Building a Following", description: "Reached 10 followers", category: "social", icon: UsersIcon },
  { id: "followers_50", name: "Known Name", description: "Reached 50 followers", category: "social", icon: UsersIcon },
  { id: "followers_100", name: "Small Following", description: "Reached 100 followers", category: "social", icon: UsersIcon },
  { id: "followers_500", name: "Rising Star", description: "Reached 500 followers", category: "social", icon: UsersIcon },
  { id: "followers_1000", name: "Influencer", description: "Reached 1,000 followers", category: "social", icon: UsersIcon },
  { id: "followers_5000", name: "SORZA Celebrity", description: "Reached 5,000 followers", category: "social", icon: UsersIcon },
  { id: "following_10", name: "Curating Your Feed", description: "Followed 10 accounts", category: "social", icon: UsersIcon },
  { id: "following_50", name: "Plugged In", description: "Followed 50 accounts", category: "social", icon: UsersIcon },

  // ---- Crew ----
  { id: "joined_crew", name: "Crew Member", description: "Joined a crew", category: "crew", icon: FlagIcon },
  { id: "joined_3_crews", name: "Well Connected", description: "Joined 3 crews", category: "crew", icon: FlagIcon },
  { id: "crew_founder", name: "Crew Founder", description: "Created a crew", category: "crew", icon: FlagIcon },
  { id: "crew_grew_10", name: "Building a Crew", description: "A crew you founded reached 10 members", category: "crew", icon: FlagIcon },
  { id: "crew_grew_50", name: "Crew Leader", description: "A crew you founded reached 50 members", category: "crew", icon: FlagIcon },

  // ---- Leaderboard ----
  { id: "top_100", name: "Top 100", description: "Cracked the top 100 on the leaderboard", category: "leaderboard", icon: StarIcon },
  { id: "top_50", name: "Top 50", description: "Cracked the top 50 on the leaderboard", category: "leaderboard", icon: StarIcon },
  { id: "top_10", name: "Top 10", description: "Cracked the top 10 on the leaderboard", category: "leaderboard", icon: StarIcon },
  { id: "top_3", name: "Podium Finish", description: "Cracked the top 3 on the leaderboard", category: "leaderboard", icon: GemIcon },
  { id: "number_one", name: "#1", description: "Reached #1 on the leaderboard", category: "leaderboard", icon: GemIcon },
  { id: "category_top_10", name: "Category Leader", description: "Cracked the top 10 in a category leaderboard", category: "leaderboard", icon: FlagIcon },

  // ---- Copy build ----
  { id: "copied_a_build", name: "Inspired By", description: "Copied someone else's build to your own garage", category: "mods", icon: RotateIcon },
  { id: "build_copied_by_others", name: "Trendsetter", description: "Someone copied one of your builds", category: "mods", icon: RotateIcon },

  // ---- Meetups ----
  { id: "hosted_meetup", name: "Meetup Host", description: "Hosted your first meetup", category: "meetups", icon: TimerIcon },
  { id: "hosted_5_meetups", name: "Regular Host", description: "Hosted 5 meetups", category: "meetups", icon: TimerIcon },

  // ---- Maintenance ----
  { id: "first_maintenance", name: "Maintenance Log", description: "Logged your first maintenance record", category: "maintenance", icon: WrenchIcon },
  { id: "maintenance_5", name: "Well Maintained", description: "Logged 5 maintenance records", category: "maintenance", icon: WrenchIcon },

  // ---- Profile ----
  { id: "profile_complete", name: "Profile Complete", description: "Added a bio and profile photo", category: "profile", icon: PersonIcon },
  { id: "verified_badge", name: "SORZA Verified", description: "Earned the SORZA verified badge", category: "profile", icon: VerifiedBadgeIcon },

  // ---- Weekly challenges ----
  { id: "first_challenge", name: "Challenger", description: "Completed your first weekly challenge", category: "challenges", icon: BoltIcon },
  { id: "perfect_week", name: "Perfect Week", description: "Completed every challenge in a single week", category: "challenges", icon: BoltIcon },

  // ---- Membership ----
  { id: "member_30_days", name: "One Month In", description: "Been on SORZA for 30 days", category: "profile", icon: StarIcon },
  { id: "member_100_days", name: "Regular", description: "Been on SORZA for 100 days", category: "profile", icon: StarIcon },
  { id: "member_1_year", name: "SORZA Veteran", description: "Been on SORZA for a full year", category: "profile", icon: StarIcon },
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
