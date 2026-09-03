import { describe, it, expect } from "vitest";
import { ACHIEVEMENTS } from "./catalog";

describe("ACHIEVEMENTS catalog", () => {
  it("has exactly 100 achievements", () => {
    expect(ACHIEVEMENTS.length).toBe(100);
  });

  it("has no duplicate ids", () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every achievement has an icon — a tier crest (via `tier`) or an explicit `icon`", () => {
    for (const achievement of ACHIEVEMENTS) {
      expect(achievement.tier != null || achievement.icon != null).toBe(true);
    }
  });

  it("every achievement has a non-empty name and description", () => {
    for (const achievement of ACHIEVEMENTS) {
      expect(achievement.name.length).toBeGreaterThan(0);
      expect(achievement.description.length).toBeGreaterThan(0);
    }
  });
});
