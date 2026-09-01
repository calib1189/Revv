import { describe, expect, it } from "vitest";
import { unknownClimbValue, landingValue, landingStartValue, needsCorrection } from "./climb-math";

describe("unknownClimbValue", () => {
  it("starts at exactly 0", () => {
    expect(unknownClimbValue(0)).toBe(0);
  });

  it("is monotonically increasing", () => {
    const a = unknownClimbValue(500);
    const b = unknownClimbValue(1500);
    const c = unknownClimbValue(4000);
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
  });

  it("never reaches or exceeds its own asymptote, even after a very long time", () => {
    // Not an arbitrarily large value — at a long enough elapsed time the
    // exponential term underflows to exactly 0 in floating point, which
    // would make this assert something the function doesn't actually
    // promise. 30s is already far longer than this ever really runs.
    const value = unknownClimbValue(30_000);
    expect(value).toBeLessThan(92);
    expect(value).toBeGreaterThan(91.9);
  });

  it("treats a negative elapsed time as zero rather than going backward", () => {
    expect(unknownClimbValue(-500)).toBe(0);
  });
});

describe("landingValue", () => {
  it("starts exactly at `from` and ends exactly at `to`", () => {
    expect(landingValue(0, 1000, 82, 91.25)).toBeCloseTo(82, 5);
    expect(landingValue(1000, 1000, 82, 91.25)).toBeCloseTo(91.25, 5);
  });

  it("never overshoots past `to` once elapsed exceeds the duration", () => {
    expect(landingValue(5000, 1000, 82, 91.25)).toBeCloseTo(91.25, 5);
  });

  it("is monotonically increasing toward `to` when to > from", () => {
    const a = landingValue(200, 1000, 0, 100);
    const b = landingValue(600, 1000, 0, 100);
    const c = landingValue(999, 1000, 0, 100);
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
  });

  it("works symmetrically for a downward landing (to < from)", () => {
    expect(landingValue(0, 1000, 50, 10)).toBeCloseTo(50, 5);
    expect(landingValue(1000, 1000, 50, 10)).toBeCloseTo(10, 5);
  });
});

describe("landingStartValue", () => {
  it("the exact scenario this exists for: a low real score after a high unknown-phase climb never counts downward", () => {
    // Unknown-phase climb reached 70, but the real score is bronze (12).
    const start = landingStartValue(70, 12, 7);
    expect(start).toBeLessThan(12);
    expect(start).toBeGreaterThanOrEqual(0);
  });

  it("never goes negative even for a very low target", () => {
    expect(landingStartValue(70, 2, 7)).toBe(0);
  });

  it("uses the current value directly when it's already comfortably below target minus runway", () => {
    expect(landingStartValue(10, 91.25, 7)).toBe(10);
  });

  it("is always strictly less than the target (given a positive runway), guaranteeing the landing always climbs upward", () => {
    for (const [current, target] of [
      [0, 91.25],
      [50, 91.25],
      [90, 91.25],
      [95, 12],
      [0, 0.5],
    ] as const) {
      expect(landingStartValue(current, target, 7)).toBeLessThan(target || 0.001);
    }
  });
});

describe("needsCorrection", () => {
  it("is true for the exact scenario that used to produce a silent score drop: current sits above target minus runway", () => {
    // Climb reached 70.71 (displaying Emerald), real score is 68.25
    // (Platinum) — landingStartValue would clamp down to 61.25, a drop
    // from what's currently on screen unless this is flagged first.
    expect(needsCorrection(70.71, 68.25, 7)).toBe(true);
  });

  it("is false when the current value is already at or below the landing runway's start", () => {
    expect(needsCorrection(10, 91.25, 7)).toBe(false);
    expect(needsCorrection(84.25, 91.25, 7)).toBe(false);
  });

  it("agrees with landingStartValue: true exactly when landingStartValue would return something less than currentValue", () => {
    for (const [current, target] of [
      [70.71, 68.25],
      [10, 91.25],
      [90, 91.25],
      [95, 12],
      [0, 0.5],
    ] as const) {
      const wouldDrop = landingStartValue(current, target, 7) < current;
      expect(needsCorrection(current, target, 7)).toBe(wouldDrop);
    }
  });
});
