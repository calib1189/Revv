import { describe, expect, it } from "vitest";
import { CHALLENGES } from "@/lib/challenges/catalog";
import { ACHIEVEMENTS } from "@/lib/achievements/catalog";
import { CHALLENGE_COMPLETION_POINTS, DAILY_POINTS, pointsForAchievement } from "@/lib/points/values";
import { STORE_ITEMS } from "@/lib/store/catalog";

/** The most a perfect player earns in `days`: every Daily action every
 * day, every weekly challenge every week, both streak bonuses, and a
 * Daily win once a month. Achievements are one-time and counted apart. */
function perfectPlay(days: number): number {
  const daily = (DAILY_POINTS.entered + DAILY_POINTS.voted + DAILY_POINTS.ratedRides) * days;
  const weekly = CHALLENGES.length * CHALLENGE_COMPLETION_POINTS * Math.floor(days / 7);
  const streaks = Object.entries(DAILY_POINTS.streak)
    .filter(([d]) => Number(d) <= days)
    .reduce((sum, [, pts]) => sum + pts, 0);
  const wins = DAILY_POINTS.place[1] * Math.floor(days / 30);
  return daily + weekly + streaks + wins;
}

const legendary = Math.max(...STORE_ITEMS.map((i) => i.price));
const cheapest = Math.min(...STORE_ITEMS.filter((i) => i.price > 0).map((i) => i.price));
const allAchievements = ACHIEVEMENTS.reduce((sum, a) => sum + pointsForAchievement(a.id), 0);

describe("the points economy", () => {
  it("takes about three months of daily play (plus achievements) to afford a Legendary", () => {
    // Never missing a day for two months isn't enough even with every achievement...
    expect(perfectPlay(60) + allAchievements * 0.6).toBeLessThan(legendary);
    // ...but three months of it, with the achievements an active player picks up, is.
    expect(perfectPlay(90) + allAchievements * 0.75).toBeGreaterThanOrEqual(legendary);
  });

  it("keeps every achievement together worth well under a Legendary", () => {
    expect(allAchievements).toBeLessThan(legendary / 2);
  });

  it("still lets a new player earn their first cosmetic within a couple of weeks", () => {
    expect(perfectPlay(14)).toBeGreaterThanOrEqual(cheapest);
  });
});
