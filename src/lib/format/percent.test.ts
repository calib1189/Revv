import { describe, expect, it } from "vitest";
import { relativePercentDiff } from "./percent";

describe("relativePercentDiff", () => {
  it("returns a positive percent when value beats baseline", () => {
    expect(relativePercentDiff(174, 100)).toBe(74);
  });

  it("returns a negative percent when value trails baseline", () => {
    expect(relativePercentDiff(50, 100)).toBe(-50);
  });

  it("returns 0 when value equals baseline", () => {
    expect(relativePercentDiff(100, 100)).toBe(0);
  });

  it("rounds to the nearest whole percent", () => {
    expect(relativePercentDiff(133, 100)).toBe(33);
    expect(relativePercentDiff(136, 100)).toBe(36);
  });

  it("returns null for a zero baseline rather than dividing by zero", () => {
    expect(relativePercentDiff(50, 0)).toBeNull();
  });

  it("returns null for a negative baseline", () => {
    expect(relativePercentDiff(50, -10)).toBeNull();
  });
});
