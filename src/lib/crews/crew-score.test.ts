import { describe, expect, it } from "vitest";
import { CREW_SCORE_SLOTS, crewScore, rankCrews } from "./crew-score";

describe("crewScore", () => {
  it("is null with no rated members", () => {
    expect(crewScore([]).score).toBeNull();
    expect(crewScore([null, null]).score).toBeNull();
  });

  it("adds up the best member builds, at most five", () => {
    const r = crewScore([90, 80, 70, 60, 50, 99, 10]);
    expect(r.score).toBe(99 + 90 + 80 + 70 + 60);
    expect(r.counted).toBe(CREW_SCORE_SLOTS);
    expect(r.openSlots).toBe(0);
  });

  it("counts an empty slot as zero, so recruiting raises the score", () => {
    const solo = crewScore([80]);
    expect(solo.score).toBe(80);
    expect(solo.tierScore).toBe(16);
    expect(solo.openSlots).toBe(4);
    expect(crewScore([80, 70]).score!).toBeGreaterThan(solo.score!);
  });

  it("rounds to two decimals", () => {
    expect(crewScore([33.333, 33.333]).score).toBe(66.67);
  });

  it("ignores unrated members", () => {
    const r = crewScore([null, 75, null]);
    expect(r.score).toBe(75);
    expect(r.counted).toBe(1);
  });
});

describe("rankCrews", () => {
  it("orders by score, best first, leaving unrated crews out", () => {
    const ranked = rankCrews([
      { id: "a", score: 120 },
      { id: "b", score: null },
      { id: "c", score: 300 },
      { id: "d", score: 120 },
    ]);
    expect(ranked.map((c) => c.id)).toEqual(["c", "a", "d"]);
  });

  it("gives tied crews the same place", () => {
    const ranked = rankCrews([
      { id: "a", score: 200 },
      { id: "b", score: 150 },
      { id: "c", score: 150 },
      { id: "d", score: 90 },
    ]);
    expect(ranked.map((c) => c.place)).toEqual([1, 2, 2, 4]);
  });
});
