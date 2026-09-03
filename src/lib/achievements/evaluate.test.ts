import { describe, it, expect } from "vitest";
import { evaluateAchievements, type AchievementStats } from "./evaluate";

function stats(overrides: Partial<AchievementStats> = {}): AchievementStats {
  return {
    vehicleCount: 0,
    hasVerifiedVehicle: false,
    hasBeenRated: false,
    maxScoreEver: null,
    postCount: 0,
    maxPostLikes: 0,
    followerCount: 0,
    inCrew: false,
    leaderboardRank: null,
    ...overrides,
  };
}

describe("evaluateAchievements", () => {
  it("unlocks nothing for a brand-new, empty account", () => {
    expect(evaluateAchievements(stats())).toEqual([]);
  });

  it("unlocks first_car once a vehicle exists", () => {
    expect(evaluateAchievements(stats({ vehicleCount: 1 }))).toContain("first_car");
  });

  it("unlocks verified_owner and first_car independently", () => {
    const result = evaluateAchievements(stats({ hasVerifiedVehicle: true }));
    expect(result).toContain("verified_owner");
    expect(result).not.toContain("first_car");
  });

  it("unlocks only tiers at or below the highest score ever reached", () => {
    const result = evaluateAchievements(stats({ maxScoreEver: 85 }));
    expect(result).toContain("tier_bronze");
    expect(result).toContain("tier_platinum");
    expect(result).toContain("tier_diamond");
    expect(result).not.toContain("tier_ruby");
    expect(result).not.toContain("tier_cosmic");
  });

  it("a perfect score unlocks every tier including cosmic", () => {
    const result = evaluateAchievements(stats({ maxScoreEver: 100 }));
    expect(result).toContain("tier_bronze");
    expect(result).toContain("tier_cosmic");
  });

  it("unlocks no tier achievements when never rated", () => {
    const result = evaluateAchievements(stats({ maxScoreEver: null }));
    expect(result.some((id) => id.startsWith("tier_"))).toBe(false);
  });

  it("unlocks hundred_likes only at 100 or more", () => {
    expect(evaluateAchievements(stats({ maxPostLikes: 99 }))).not.toContain("hundred_likes");
    expect(evaluateAchievements(stats({ maxPostLikes: 100 }))).toContain("hundred_likes");
  });

  it("unlocks follower milestones independently at their own thresholds", () => {
    const fiveFollowers = evaluateAchievements(stats({ followerCount: 5 }));
    expect(fiveFollowers).toContain("first_follower");
    expect(fiveFollowers).not.toContain("ten_followers");

    const tenFollowers = evaluateAchievements(stats({ followerCount: 10 }));
    expect(tenFollowers).toContain("first_follower");
    expect(tenFollowers).toContain("ten_followers");
  });

  it("unlocks leaderboard milestones cumulatively as rank improves", () => {
    expect(evaluateAchievements(stats({ leaderboardRank: 500 }))).toEqual([]);

    const rank50 = evaluateAchievements(stats({ leaderboardRank: 50 }));
    expect(rank50).toContain("top_100");
    expect(rank50).not.toContain("top_10");

    const rank1 = evaluateAchievements(stats({ leaderboardRank: 1 }));
    expect(rank1).toContain("top_100");
    expect(rank1).toContain("top_10");
    expect(rank1).toContain("number_one");
  });
});
