import { describe, it, expect } from "vitest";
import { findLeaderboardDisplacements } from "./leaderboard-displacement";

// Ten builds scoring 100, 99, ... 91, so "b1" is #1 and "b10" is #10.
const TOP_TEN = Array.from({ length: 10 }, (_, i) => ({ buildId: `b${i + 1}`, score: 100 - i }));
const ELEVEN = [...TOP_TEN, { buildId: "b11", score: 85 }];

describe("findLeaderboardDisplacements", () => {
  it("reports the old #1 when a new score passes it", () => {
    const result = findLeaderboardDisplacements(ELEVEN, null, 100.5);
    expect(result).toContainEqual({ buildId: "b1", lost: "first" });
  });

  it("reports the build pushed from #10 to #11", () => {
    const result = findLeaderboardDisplacements(ELEVEN, null, 95.5);
    expect(result).toEqual([{ buildId: "b10", lost: "top10" }]);
  });

  it("says nothing to builds that drop a place but stay in the top 10", () => {
    const result = findLeaderboardDisplacements(ELEVEN, null, 95.5);
    expect(result.map((d) => d.buildId)).not.toContain("b6");
  });

  it("says nothing to builds already outside the top 10", () => {
    const result = findLeaderboardDisplacements(ELEVEN, null, 100.5);
    expect(result.map((d) => d.buildId)).not.toContain("b11");
  });

  it("does not count a tie as being passed", () => {
    // Matching #1 shares the spot, so b1 keeps it. Everyone below still
    // drops a place, which does push b10 out of the top 10.
    expect(findLeaderboardDisplacements(ELEVEN, null, 100)).toEqual([{ buildId: "b10", lost: "top10" }]);
  });

  it("gives the old #1 only the 'first' notice, never both", () => {
    const solo = [{ buildId: "b1", score: 90 }];
    expect(findLeaderboardDisplacements(solo, null, 95)).toEqual([{ buildId: "b1", lost: "first" }]);
  });

  it("does not count a re-rate that was already above as a new pass", () => {
    // The mover was already at 99.5 (#1); re-rating to 99.8 passes nobody.
    expect(findLeaderboardDisplacements(TOP_TEN, 99.5, 99.8)).toEqual([]);
  });

  it("reports nothing when a re-rate goes down", () => {
    expect(findLeaderboardDisplacements(ELEVEN, 100.5, 50)).toEqual([]);
  });

  it("only counts builds the mover actually passed on a re-rate", () => {
    // From 94.5 (#7) to 99.5 (#2): b2..b6 drop one place, none leave the
    // top 10, and b1 keeps #1, so nobody hears about it.
    expect(findLeaderboardDisplacements(ELEVEN, 94.5, 99.5)).toEqual([]);
  });

  it("returns nothing for an empty board", () => {
    expect(findLeaderboardDisplacements([], null, 80)).toEqual([]);
  });
});
