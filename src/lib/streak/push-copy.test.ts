import { describe, expect, it } from "vitest";
import { streakEndingBody } from "./push-copy";

describe("streakEndingBody", () => {
  it("says how long the streak is and that one vote keeps it", () => {
    expect(streakEndingBody(12)).toBe("Your 12-day streak ends at midnight. One vote keeps it going.");
  });

  it("mentions the chest when tonight would earn one", () => {
    expect(streakEndingBody(6)).toBe("Your 6-day streak ends at midnight, and one vote tonight opens your day-7 chest.");
    expect(streakEndingBody(13)).toContain("day-14 chest");
  });
});
