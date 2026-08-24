import { describe, expect, it } from "vitest";
import { rankForScore, rankRangeLabel } from "./rank";

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
