import { describe, it, expect } from "vitest";
import { computeRankPosition } from "./rank-position";

describe("computeRankPosition", () => {
  it("ranks #1 with no gap when nothing scores higher", () => {
    expect(computeRankPosition(95, [95, 80, 60])).toEqual({ rank: 1, gapToNext: null });
  });

  it("computes rank as one more than the count of strictly-better scores", () => {
    expect(computeRankPosition(68.5, [91.5, 88.25, 68.5, 40]).rank).toBe(3);
  });

  it("computes the gap to the closest score above, not the top score", () => {
    // 41 (68.5) should need to pass the nearest better score (75), not
    // the top of the board (95).
    const { gapToNext } = computeRankPosition(68.5, [95, 75, 68.5, 40]);
    expect(gapToNext).toBe(6.5);
  });

  it("rounds the gap to 2 decimal places", () => {
    const { gapToNext } = computeRankPosition(68.501, [70.109, 68.501]);
    expect(gapToNext).toBe(1.61);
  });

  it("a tie does not count as ahead of you", () => {
    expect(computeRankPosition(80, [80, 80, 60])).toEqual({ rank: 1, gapToNext: null });
  });

  it("scores strictly below yours never affect rank or gap", () => {
    const withLowScores = computeRankPosition(80, [90, 80, 10, 5, 1]);
    const withoutLowScores = computeRankPosition(80, [90, 80]);
    expect(withLowScores).toEqual(withoutLowScores);
  });
});
