import { describe, expect, it } from "vitest";
import { blendRatingScore } from "@/lib/rating/blend-score";
import type { BuildRatingSubscores } from "@/lib/providers/rating-provider";

const all = (n: number): BuildRatingSubscores => ({
  appearance: n,
  performance: n,
  wheelsFitment: n,
  interior: n,
  modifications: n,
});

describe("blendRatingScore", () => {
  it("leaves a score alone when every category agrees with it", () => {
    expect(blendRatingScore(92.25, all(92.25))).toBe(92.25);
    expect(blendRatingScore(100, all(100))).toBe(100);
    expect(blendRatingScore(0, all(0))).toBe(0);
  });

  it("weights the holistic score 65% and the categories 35%", () => {
    // categories: 90*.25 + 85*.2 + 93*.2 + 80*.1 + 95*.25 = 89.85
    // 92.25*.65 + 89.85*.35 = 91.41
    expect(
      blendRatingScore(92.25, {
        appearance: 90,
        performance: 85,
        wheelsFitment: 93,
        interior: 80,
        modifications: 95,
      }),
    ).toBe(91.41);
  });

  it("separates builds the model gave the same headline score", () => {
    const a = blendRatingScore(92.25, { ...all(92), interior: 60 });
    const b = blendRatingScore(92.25, { ...all(92), wheelsFitment: 97 });
    expect(a).not.toBe(b);
    expect(a).not.toBe(92.25);
    expect(b).not.toBe(92.25);
  });

  it("doesn't land on quarter points just because the inputs do", () => {
    const scores = [
      blendRatingScore(92.25, { appearance: 94, performance: 88, wheelsFitment: 91, interior: 70, modifications: 96 }),
      blendRatingScore(87.5, { appearance: 89, performance: 82, wheelsFitment: 86, interior: 75, modifications: 90 }),
      blendRatingScore(95.75, { appearance: 97, performance: 93, wheelsFitment: 96, interior: 85, modifications: 98 }),
    ];
    for (const s of scores) expect(Math.round(s * 100) % 25).not.toBe(0);
  });

  it("keeps out-of-range inputs inside 0-100 with two decimals", () => {
    expect(blendRatingScore(140, all(120))).toBe(100);
    expect(blendRatingScore(-5, all(-10))).toBe(0);
    const s = blendRatingScore(81.123, all(77.777));
    expect(Math.round(s * 100) / 100).toBe(s);
  });

  it("is deterministic", () => {
    const subs = { appearance: 91, performance: 84, wheelsFitment: 88, interior: 62, modifications: 93 };
    expect(blendRatingScore(90, subs)).toBe(blendRatingScore(90, subs));
  });
});
