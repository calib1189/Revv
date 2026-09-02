import { describe, it, expect } from "vitest";
import { computeTopPercent } from "./percentile";

describe("computeTopPercent", () => {
  it("returns null for an empty population", () => {
    expect(computeTopPercent(80, [])).toBeNull();
  });

  it("returns null for a single-build population", () => {
    expect(computeTopPercent(80, [80])).toBeNull();
  });

  it("returns null percentile for the only build sharing top score", () => {
    expect(computeTopPercent(80, [80, 80])).toBe(0.1);
  });

  it("computes the share strictly better than this score", () => {
    // 1 of 4 scores (95) beats 80 -> 25%
    expect(computeTopPercent(80, [80, 60, 40, 95])).toBe(25);
  });

  it("returns the floor of 0.1 rather than a literal 0%", () => {
    // top score beats nobody
    expect(computeTopPercent(100, [100, 50, 20])).toBe(0.1);
  });

  it("rounds to one decimal place", () => {
    // 1 of 3 beats it -> 33.333...% -> 33.3
    expect(computeTopPercent(50, [50, 60, 40])).toBe(33.3);
  });
});
