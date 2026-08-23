import { describe, expect, it } from "vitest";
import { rankForScore } from "./rank";

describe("rankForScore", () => {
  it.each([
    [0, "bronze"],
    [1.9, "bronze"],
    [2, "copper"],
    [2.9, "copper"],
    [3, "iron"],
    [3.9, "iron"],
    [4, "silver"],
    [4.9, "silver"],
    [5, "gold"],
    [5.9, "gold"],
    [6, "platinum"],
    [6.9, "platinum"],
    [7, "emerald"],
    [7.9, "emerald"],
    [8, "diamond"],
    [8.9, "diamond"],
    [9, "ruby"],
    [9.4, "ruby"],
    [9.5, "cosmic"],
    [9.9, "cosmic"],
    [10, "cosmic"],
  ] as const)("maps score %s to %s", (score, tier) => {
    expect(rankForScore(score)).toBe(tier);
  });
});
