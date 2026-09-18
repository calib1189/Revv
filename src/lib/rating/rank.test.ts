import { describe, expect, it } from "vitest";
import { rankForScore, rankRangeLabel, tierProgress } from "./rank";

describe("rankForScore", () => {
  it.each([
    [0, "bronze"],
    [19.99, "bronze"],
    [20, "copper"],
    [29.99, "copper"],
    [30, "iron"],
    [39.99, "iron"],
    [40, "silver"],
    [49.99, "silver"],
    [50, "gold"],
    [59.99, "gold"],
    [60, "platinum"],
    [69.99, "platinum"],
    [70, "emerald"],
    [79.99, "emerald"],
    [80, "diamond"],
    [89.99, "diamond"],
    [90, "ruby"],
    [94.99, "ruby"],
    [95, "cosmic"],
    [99.99, "cosmic"],
    [100, "cosmic"],
  ] as const)("maps score %s to %s", (score, tier) => {
    expect(rankForScore(score)).toBe(tier);
  });
});

describe("rankRangeLabel", () => {
  it.each([
    ["bronze", "0 – 19.99"],
    ["copper", "20 – 29.99"],
    ["iron", "30 – 39.99"],
    ["silver", "40 – 49.99"],
    ["gold", "50 – 59.99"],
    ["platinum", "60 – 69.99"],
    ["emerald", "70 – 79.99"],
    ["diamond", "80 – 89.99"],
    ["ruby", "90 – 94.99"],
    ["cosmic", "95 – 100"],
  ] as const)("labels %s as %s", (tier, label) => {
    expect(rankRangeLabel(tier)).toBe(label);
  });
});

describe("tierProgress", () => {
  it("reports the next tier and points remaining", () => {
    expect(tierProgress(91.25)).toEqual({ tier: "ruby", next: "cosmic", pointsToNext: 3.75, withinTier: 0.25 });
  });

  it("is at the start of a band exactly on a boundary", () => {
    expect(tierProgress(80)).toMatchObject({ tier: "diamond", next: "ruby", pointsToNext: 10, withinTier: 0 });
  });

  it("measures progress through a ten-point band", () => {
    expect(tierProgress(74.5).withinTier).toBeCloseTo(0.45);
  });

  it("has no next tier at the top", () => {
    expect(tierProgress(97)).toEqual({ tier: "cosmic", next: null, pointsToNext: null, withinTier: 1 });
  });

  it("starts from zero at the bottom", () => {
    expect(tierProgress(0)).toMatchObject({ tier: "bronze", next: "copper", pointsToNext: 20, withinTier: 0 });
  });
});