import { describe, expect, it } from "vitest";
import { STREAK_POINTS } from "@/lib/points/values";
import { streakDayReward, trackDay, trackSlots } from "./track";

describe("trackDay", () => {
  it("runs 1 to 7, then starts over", () => {
    expect([0, 1, 6, 7, 8, 14, 15].map(trackDay)).toEqual([0, 1, 6, 7, 1, 7, 1]);
  });
});

describe("streakDayReward", () => {
  it("never pays less than the day before, then the chest on the seventh", () => {
    const week = [1, 2, 3, 4, 5, 6, 7].map((d) => streakDayReward(d)!);
    for (let i = 1; i < 6; i++) expect(week[i].points).toBeGreaterThanOrEqual(week[i - 1].points);
    expect(week.map((r) => r.chest)).toEqual([false, false, false, false, false, false, true]);
    expect(week.slice(0, 6).map((r) => r.points)).toEqual([...STREAK_POINTS.track]);
    // The chest's prize is drawn (lib/streak/chest.ts), not a fixed amount.
    expect(week[6].points).toBe(0);
  });

  it("opens a chest every seventh day of a run", () => {
    expect(streakDayReward(14)!.chest).toBe(true);
    expect(streakDayReward(8)!).toMatchObject({ day: 1, chest: false });
  });

  it("pays nothing without a run", () => {
    expect(streakDayReward(0)).toBeNull();
  });
});

describe("trackSlots", () => {
  const states = (current: number, activeToday: boolean) =>
    trackSlots({ current, activeToday }).map((s) => (s.claimedToday ? "claimed" : s.state));

  it("starts a new player on day one", () => {
    expect(states(0, false)).toEqual(["today", "upcoming", "upcoming", "upcoming", "upcoming", "upcoming", "upcoming"]);
  });

  it("fills today's slot once today is done", () => {
    expect(states(3, true)).toEqual(["done", "done", "claimed", "upcoming", "upcoming", "upcoming", "upcoming"]);
  });

  it("shows the next slot to earn while today is still to do", () => {
    expect(states(3, false)).toEqual(["done", "done", "done", "today", "upcoming", "upcoming", "upcoming"]);
  });

  it("numbers the slots with the real streak days, so the count keeps going", () => {
    const days = (current: number, activeToday: boolean) => trackSlots({ current, activeToday }).map((s) => s.streakDay);
    expect(days(3, true)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    // Day 10 done: the second week, chest on day 14.
    expect(days(10, true)).toEqual([8, 9, 10, 11, 12, 13, 14]);
    // Day 14 done yesterday, today still to play: the third week starts.
    expect(days(14, false)).toEqual([15, 16, 17, 18, 19, 20, 21]);
    expect(days(0, false)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("shows the chest claimed on day seven, then a fresh week the next day", () => {
    expect(states(7, true)).toEqual(["done", "done", "done", "done", "done", "done", "claimed"]);
    expect(states(7, false)).toEqual(["today", "upcoming", "upcoming", "upcoming", "upcoming", "upcoming", "upcoming"]);
  });
});
