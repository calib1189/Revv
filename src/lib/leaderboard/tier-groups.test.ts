import { describe, expect, it } from "vitest";
import { groupByTier, pointsBehind } from "./tier-groups";

describe("pointsBehind", () => {
  it("gives the gap to the place above, to the hundredth", () => {
    expect(pointsBehind(84.85, 84.1)).toBe(0.75);
    expect(pointsBehind(78.5, 78.5)).toBe(0);
  });
});

describe("groupByTier", () => {
  it("names each tier once, with the board position it starts at", () => {
    const groups = groupByTier([{ score: 87.07 }, { score: 80 }, { score: 79.99 }, { score: 71 }, { score: 64 }], 6);
    expect(groups.map((g) => [g.tier, g.firstRank, g.entries.length])).toEqual([
      ["diamond", 6, 2],
      ["emerald", 8, 2],
      ["platinum", 10, 1],
    ]);
  });

  it("returns nothing for an empty list", () => {
    expect(groupByTier([], 6)).toEqual([]);
  });
});
