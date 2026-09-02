import { describe, it, expect } from "vitest";
import { computeSparklinePoints } from "./sparkline";

describe("computeSparklinePoints", () => {
  it("returns an empty array for an empty series", () => {
    expect(computeSparklinePoints([], 100, 50)).toEqual([]);
  });

  it("centers a single point", () => {
    expect(computeSparklinePoints([80], 100, 50)).toEqual([{ x: 50, y: 25 }]);
  });

  it("spans the full width from the first padding to the last", () => {
    const points = computeSparklinePoints([10, 50, 90], 100, 50, 4);
    expect(points[0].x).toBe(4);
    expect(points[points.length - 1].x).toBe(96);
  });

  it("gives the highest score the smallest y (SVG y grows downward)", () => {
    const points = computeSparklinePoints([20, 90], 100, 50, 4);
    const [low, high] = points;
    expect(high.y).toBeLessThan(low.y);
  });

  it("scales to the series' own range, not a fixed 0-100 scale", () => {
    // 80 and 85 are close together but should still span the chart's
    // full vertical range, not sit pinned near the top of a 0-100 scale.
    const points = computeSparklinePoints([80, 85], 100, 50, 0);
    expect(points[0].y).toBe(50);
    expect(points[1].y).toBe(0);
  });

  it("renders a flat series as a straight horizontal line", () => {
    const points = computeSparklinePoints([70, 70, 70], 100, 50, 0);
    expect(points.every((p) => p.y === points[0].y)).toBe(true);
  });
});
