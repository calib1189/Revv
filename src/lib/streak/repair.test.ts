import { describe, expect, it } from "vitest";
import { computeStreak } from "@/lib/daily/streak";
import { STREAK_REPAIR_POINTS } from "@/lib/points/values";
import { streakRepairOffer } from "./repair";

const TODAY = "2026-11-20";
const run = ["2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14", "2026-11-15", "2026-11-16"];

describe("streakRepairOffer", () => {
  it("offers to restore a streak lost a few days ago, filling exactly the days missed", () => {
    // 7-day run to the 16th, then the 17th–19th missed.
    const offer = streakRepairOffer({ active: run, repaired: [] }, TODAY, null);
    expect(offer).toEqual({
      lostRun: 7,
      restoredTo: 7,
      missingDays: ["2026-11-17", "2026-11-18", "2026-11-19"],
      cost: STREAK_REPAIR_POINTS,
    });
  });

  it("still offers it after you've started over today, and counts today in", () => {
    const offer = streakRepairOffer({ active: [...run, TODAY], repaired: [] }, TODAY, null);
    expect(offer).toMatchObject({ lostRun: 7, restoredTo: 8 });
  });

  it("restoring really does join the run back up", () => {
    const offer = streakRepairOffer({ active: [...run, TODAY], repaired: [] }, TODAY, null)!;
    expect(computeStreak([...run, TODAY], TODAY, offer.missingDays).current).toBe(offer.restoredTo);
  });

  it("isn't offered while the streak is still alive", () => {
    // Missed only yesterday: today can still save it, for free.
    expect(streakRepairOffer({ active: run.slice(0, 6).concat("2026-11-18"), repaired: [] }, TODAY, null)).toBeNull();
    expect(streakRepairOffer({ active: [...run, "2026-11-19"], repaired: [] }, TODAY, null)).toBeNull();
  });

  it("isn't offered once it's been too long", () => {
    expect(streakRepairOffer({ active: run.slice(0, 5), repaired: [] }, TODAY, null)).toBeNull();
  });

  it("isn't offered for a streak too short to be worth it", () => {
    expect(streakRepairOffer({ active: ["2026-11-16"], repaired: [] }, TODAY, null)).toBeNull();
  });

  it("only once a week", () => {
    expect(streakRepairOffer({ active: run, repaired: [] }, TODAY, "2026-11-15")).toBeNull();
    expect(streakRepairOffer({ active: run, repaired: [] }, TODAY, "2026-11-12")).not.toBeNull();
  });

  it("has nothing to offer once the gap is repaired", () => {
    expect(
      streakRepairOffer({ active: run, repaired: ["2026-11-17", "2026-11-18", "2026-11-19"] }, TODAY, null),
    ).toBeNull();
  });
});
