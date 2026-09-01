import { describe, expect, it } from "vitest";
import { unknownClimbValue, climbCeilingForScore, landingValue, landingStartValue, needsCorrection } from "./climb-math";

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

  // Locks in the actual per-tier pacing contract this function exists
  // to produce — bronze through gold fast, platinum/emerald slower,
  // diamond and ruby each landing inside their own target dwell window.
  // See CLIMB_SEGMENTS' own comment for why this isn't just one smooth
  // curve.
  function timeToReach(target: number): number {
    // Binary search rather than solving each segment's ease inverse by
    // hand — this function only needs to be monotonically increasing
    // for that to work, which the "is monotonically increasing" test
    // above already establishes.
    let lo = 0;
    let hi = 20_000;
    for (let i = 0; i < 50; i++) {
      const mid = (lo + hi) / 2;
      if (unknownClimbValue(mid) < target) lo = mid;
      else hi = mid;
    }
    return hi;
  }

  it("reaches gold's ceiling (60) well before the platinum/diamond/ruby budget even starts", () => {
    expect(timeToReach(60)).toBeCloseTo(3800, 0);
  });

  it("spends noticeably longer crossing diamond (80 to 90) than crossing platinum or emerald", () => {
    const platinumDwell = timeToReach(70) - timeToReach(60);
    const emeraldDwell = timeToReach(80) - timeToReach(70);
    const diamondDwell = timeToReach(90) - timeToReach(80);
    expect(diamondDwell).toBeGreaterThan(platinumDwell);
    expect(diamondDwell).toBeGreaterThan(emeraldDwell);
  });

  it("diamond's own dwell (80 to 90) lands inside its ~500-700ms target", () => {
    const diamondDwell = timeToReach(90) - timeToReach(80);
    expect(diamondDwell).toBeGreaterThanOrEqual(500);
    expect(diamondDwell).toBeLessThanOrEqual(700);
  });

  it("ruby's own dwell (90 until the 6200ms climb floor) lands inside its ~700-1000ms target", () => {
    const MIN_CLIMB_MS = 6200;
    const rubyDwell = MIN_CLIMB_MS - timeToReach(90);
    expect(rubyDwell).toBeGreaterThanOrEqual(700);
    expect(rubyDwell).toBeLessThanOrEqual(1000);
  });
});

describe("climbCeilingForScore", () => {
  it("caps a low real score's climb at the top of exactly one tier above it", () => {
    // 55 is gold (50-59.99) — one tier up is platinum, whose top is
    // 69.99 (just under emerald's 70 floor).
    expect(climbCeilingForScore(55)).toBeCloseTo(69.99, 5);
  });

  it("never lets the capped ceiling reach into the tier two above the real score", () => {
    // 12.4 is bronze (0-19.99) — one tier up is copper, whose top is
    // 29.99 (just under iron's 30 floor, two tiers up from bronze).
    expect(climbCeilingForScore(12.4)).toBeCloseTo(29.99, 5);
  });

  it("returns no cap (Infinity) once the real score is already ruby or cosmic", () => {
    expect(climbCeilingForScore(92)).toBe(Infinity); // ruby
    expect(climbCeilingForScore(98)).toBe(Infinity); // cosmic
  });

  it("allows the climb to rise into diamond when the real score is ruby's neighbor below, emerald", () => {
    // Emerald is 70-79.99 — one tier up is diamond, whose top is 89.99.
    expect(climbCeilingForScore(74)).toBeCloseTo(89.99, 5);
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
