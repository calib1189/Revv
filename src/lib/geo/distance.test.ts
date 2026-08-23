import { describe, expect, it } from "vitest";
import { haversineMiles, formatDistance } from "./distance";

describe("haversineMiles", () => {
  it("returns 0 for identical points", () => {
    expect(haversineMiles({ lat: 30, lng: -95 }, { lat: 30, lng: -95 })).toBe(0);
  });

  it("computes a known distance (NYC to LA is ~2450 miles)", () => {
    const nyc = { lat: 40.7128, lng: -74.006 };
    const la = { lat: 34.0522, lng: -118.2437 };
    expect(haversineMiles(nyc, la)).toBeGreaterThan(2400);
    expect(haversineMiles(nyc, la)).toBeLessThan(2500);
  });

  it("is symmetric", () => {
    const a = { lat: 29.76, lng: -95.37 };
    const b = { lat: 30.27, lng: -97.74 };
    expect(haversineMiles(a, b)).toBeCloseTo(haversineMiles(b, a), 10);
  });
});

describe("formatDistance", () => {
  it("shows 'nearby' for very small distances", () => {
    expect(formatDistance(0.05)).toBe("nearby");
  });

  it("shows one decimal under 10 miles", () => {
    expect(formatDistance(3.456)).toBe("3.5 mi");
  });

  it("rounds to whole miles at 10 or more", () => {
    expect(formatDistance(42.6)).toBe("43 mi");
  });
});
