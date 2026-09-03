import { describe, it, expect } from "vitest";
import { evaluateAchievements, type AchievementStats } from "./evaluate";
import { ACHIEVEMENTS } from "./catalog";

function stats(overrides: Partial<AchievementStats> = {}): AchievementStats {
  return {
    vehicleCount: 0,
    verifiedVehicleCount: 0,
    categoryCount: 0,
    hasVerifiedVehicle: false,
    hasBeenRated: false,
    maxScoreEver: null,
    ratingCount: 0,
    maxScoreImprovement: 0,
    maxSubscoreEver: { appearance: 0, performance: 0, wheelsFitment: 0, interior: 0, modifications: 0 },
    hasAllRounderBuild: false,
    modCount: 0,
    installedModCount: 0,
    hasBudgetSet: false,
    totalInvestedCents: 0,
    copiedABuild: false,
    buildCopiedByOthers: false,
    photoCount: 0,
    postCount: 0,
    hasVideoPost: false,
    maxPostLikes: 0,
    totalLikes: 0,
    totalCommentsReceived: 0,
    maxPostViews: 0,
    maxPostShares: 0,
    maxPostSaves: 0,
    commentsMadeTotal: 0,
    followerCount: 0,
    followingCount: 0,
    crewCount: 0,
    crewsFounded: 0,
    maxFoundedCrewSize: 0,
    leaderboardRank: null,
    bestCategoryRank: null,
    meetupsHostedCount: 0,
    maintenanceCount: 0,
    profileComplete: false,
    isVerifiedBadge: false,
    accountAgeDays: 0,
    challengesCompletedTotal: 0,
    hadPerfectWeek: false,
    ...overrides,
  };
}

const ACHIEVEMENT_IDS = new Set(ACHIEVEMENTS.map((a) => a.id));

describe("evaluateAchievements", () => {
  it("unlocks nothing for a brand-new, empty account", () => {
    expect(evaluateAchievements(stats())).toEqual([]);
  });

  it("never returns an id that isn't in the real catalog", () => {
    // A big, varied stats snapshot exercises most branches at once —
    // every id it produces still has to be a real achievement.
    const everything = evaluateAchievements(
      stats({
        vehicleCount: 10,
        verifiedVehicleCount: 10,
        categoryCount: 5,
        hasVerifiedVehicle: true,
        hasBeenRated: true,
        maxScoreEver: 100,
        ratingCount: 25,
        maxScoreImprovement: 20,
        maxSubscoreEver: { appearance: 90, performance: 90, wheelsFitment: 90, interior: 90, modifications: 90 },
        hasAllRounderBuild: true,
        modCount: 50,
        installedModCount: 10,
        hasBudgetSet: true,
        totalInvestedCents: 1_000_000,
        copiedABuild: true,
        buildCopiedByOthers: true,
        photoCount: 50,
        postCount: 200,
        hasVideoPost: true,
        maxPostLikes: 1000,
        totalLikes: 1000,
        totalCommentsReceived: 50,
        maxPostViews: 10000,
        maxPostShares: 10,
        maxPostSaves: 10,
        commentsMadeTotal: 100,
        followerCount: 5000,
        followingCount: 50,
        crewCount: 3,
        crewsFounded: 1,
        maxFoundedCrewSize: 50,
        leaderboardRank: 1,
        bestCategoryRank: 1,
        meetupsHostedCount: 5,
        maintenanceCount: 5,
        profileComplete: true,
        isVerifiedBadge: true,
        accountAgeDays: 400,
        challengesCompletedTotal: 10,
        hadPerfectWeek: true,
      }),
    );
    for (const id of everything) {
      expect(ACHIEVEMENT_IDS.has(id)).toBe(true);
    }
    // And with everything maxed out, every achievement should unlock.
    expect(new Set(everything).size).toBe(ACHIEVEMENTS.length);
  });

  it("unlocks vehicle-count tiers cumulatively", () => {
    expect(evaluateAchievements(stats({ vehicleCount: 1 }))).toContain("first_car");
    expect(evaluateAchievements(stats({ vehicleCount: 2 }))).not.toContain("car_collector_3");
    const five = evaluateAchievements(stats({ vehicleCount: 5 }));
    expect(five).toContain("first_car");
    expect(five).toContain("car_collector_3");
    expect(five).toContain("car_collector_5");
    expect(five).not.toContain("car_collector_10");
  });

  it("fully_verified requires every vehicle verified, not just one", () => {
    const partial = evaluateAchievements(stats({ vehicleCount: 3, verifiedVehicleCount: 2 }));
    expect(partial).not.toContain("fully_verified");
    const all = evaluateAchievements(stats({ vehicleCount: 3, verifiedVehicleCount: 3 }));
    expect(all).toContain("fully_verified");
  });

  it("unlocks only rank tiers at or below the highest score ever reached", () => {
    const result = evaluateAchievements(stats({ maxScoreEver: 85 }));
    expect(result).toContain("tier_bronze");
    expect(result).toContain("tier_diamond");
    expect(result).not.toContain("tier_ruby");
  });

  it("each subscore-90 achievement is independent of the others", () => {
    const result = evaluateAchievements(
      stats({ maxSubscoreEver: { appearance: 92, performance: 50, wheelsFitment: 50, interior: 50, modifications: 50 } }),
    );
    expect(result).toContain("appearance_90");
    expect(result).not.toContain("performance_90");
  });

  it("all_rounder is its own flag, not derived from independent subscore maxes", () => {
    // High independent maxes (from different rating events) don't imply
    // one single build ever hit 80+ across the board.
    const notAllRounder = evaluateAchievements(
      stats({ maxSubscoreEver: { appearance: 95, performance: 95, wheelsFitment: 95, interior: 95, modifications: 95 }, hasAllRounderBuild: false }),
    );
    expect(notAllRounder).not.toContain("all_rounder");
    expect(evaluateAchievements(stats({ hasAllRounderBuild: true }))).toContain("all_rounder");
  });

  it("investment tiers use cents, not dollars", () => {
    expect(evaluateAchievements(stats({ totalInvestedCents: 99_999 }))).not.toContain("invested_1000");
    expect(evaluateAchievements(stats({ totalInvestedCents: 100_000 }))).toContain("invested_1000");
  });

  it("leaderboard milestones stack as rank improves", () => {
    const rank50 = evaluateAchievements(stats({ leaderboardRank: 50 }));
    expect(rank50).toContain("top_100");
    expect(rank50).not.toContain("top_10");
    const rank1 = evaluateAchievements(stats({ leaderboardRank: 1 }));
    expect(rank1).toContain("top_100");
    expect(rank1).toContain("top_3");
    expect(rank1).toContain("number_one");
  });

  it("category_top_10 is independent of the global leaderboardRank", () => {
    const result = evaluateAchievements(stats({ leaderboardRank: 5000, bestCategoryRank: 5 }));
    expect(result).not.toContain("top_100");
    expect(result).toContain("category_top_10");
  });

  it("crew_grew tiers only apply to crews the user actually founded", () => {
    expect(evaluateAchievements(stats({ crewsFounded: 0, maxFoundedCrewSize: 50 }))).not.toContain(
      "crew_founder",
    );
    expect(
      evaluateAchievements(stats({ crewsFounded: 1, maxFoundedCrewSize: 10 })),
    ).toContain("crew_grew_10");
  });

  it("membership length tiers are cumulative", () => {
    const oneYear = evaluateAchievements(stats({ accountAgeDays: 400 }));
    expect(oneYear).toContain("member_30_days");
    expect(oneYear).toContain("member_100_days");
    expect(oneYear).toContain("member_1_year");
  });

  it("perfect_week and first_challenge are independent signals", () => {
    const oneOff = evaluateAchievements(stats({ challengesCompletedTotal: 1, hadPerfectWeek: false }));
    expect(oneOff).toContain("first_challenge");
    expect(oneOff).not.toContain("perfect_week");
  });
});
