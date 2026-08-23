import { describe, expect, it } from "vitest";
import {
  calculateBackspacingInches,
  calculateTireDiameterInches,
  tireDiameterDeltaPercent,
  parseBoltPattern,
  boltPatternsMatch,
} from "./calculator";

describe("calculateBackspacingInches", () => {
  it("computes backspacing for a 9.5in wheel at +35mm offset", () => {
    expect(calculateBackspacingInches(9.5, 35)).toBeCloseTo(6.128, 3);
  });

  it("computes backspacing for a zero offset wheel", () => {
    expect(calculateBackspacingInches(8, 0)).toBeCloseTo(4, 5);
  });

  it("computes backspacing for negative offset", () => {
    expect(calculateBackspacingInches(9, -12)).toBeCloseTo(4.0276, 3);
  });
});

describe("calculateTireDiameterInches", () => {
  it("computes diameter for 245/40R18", () => {
    expect(
      calculateTireDiameterInches({
        widthMm: 245,
        aspectRatio: 40,
        rimDiameterInches: 18,
      }),
    ).toBeCloseTo(25.7165, 3);
  });

  it("computes diameter for 235/45R17", () => {
    expect(
      calculateTireDiameterInches({
        widthMm: 235,
        aspectRatio: 45,
        rimDiameterInches: 17,
      }),
    ).toBeCloseTo(25.3268, 3);
  });
});

describe("tireDiameterDeltaPercent", () => {
  it("computes the percent size difference between two tire sizes", () => {
    const current = { widthMm: 245, aspectRatio: 40, rimDiameterInches: 18 };
    const proposed = { widthMm: 235, aspectRatio: 45, rimDiameterInches: 17 };
    expect(tireDiameterDeltaPercent(current, proposed)).toBeCloseTo(
      -1.5156,
      3,
    );
  });

  it("returns 0 for identical sizes", () => {
    const size = { widthMm: 245, aspectRatio: 40, rimDiameterInches: 18 };
    expect(tireDiameterDeltaPercent(size, size)).toBe(0);
  });
});

describe("parseBoltPattern", () => {
  it("parses a standard pattern", () => {
    expect(parseBoltPattern("5x114.3")).toEqual({ holes: 5, diameterMm: 114.3 });
  });

  it("parses with spaces and uppercase X", () => {
    expect(parseBoltPattern(" 5 X 100 ")).toEqual({ holes: 5, diameterMm: 100 });
  });

  it("returns null for garbage input", () => {
    expect(parseBoltPattern("whatever")).toBeNull();
  });

  it("returns null for an unreasonable hole count", () => {
    expect(parseBoltPattern("1x100")).toBeNull();
    expect(parseBoltPattern("20x100")).toBeNull();
  });
});

describe("boltPatternsMatch", () => {
  it("matches identical patterns", () => {
    expect(boltPatternsMatch("5x114.3", "5x114.3")).toBe(true);
  });

  it("does not match different hole counts", () => {
    expect(boltPatternsMatch("5x114.3", "4x114.3")).toBe(false);
  });

  it("does not match different diameters", () => {
    expect(boltPatternsMatch("5x114.3", "5x100")).toBe(false);
  });

  it("returns null (insufficient data) when either side is unparseable", () => {
    expect(boltPatternsMatch("5x114.3", "not a pattern")).toBeNull();
    expect(boltPatternsMatch("", "5x114.3")).toBeNull();
  });
});
