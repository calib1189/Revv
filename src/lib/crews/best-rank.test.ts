import { describe, expect, it } from "vitest";
import { maxScore } from "./best-rank";

describe("maxScore", () => {
  it("returns null for an empty list", () => {
    expect(maxScore([])).toBeNull();
  });

  it("returns null when every score is null or undefined", () => {
    expect(maxScore([null, undefined, null])).toBeNull();
  });

  it("returns the single value when there's only one", () => {
    expect(maxScore([42.5])).toBe(42.5);
  });

  it("returns the highest value, ignoring nulls mixed in", () => {
    expect(maxScore([12.3, null, 87.65, undefined, 50])).toBe(87.65);
  });

  it("handles all-zero scores without treating them as missing", () => {
    expect(maxScore([0, 0])).toBe(0);
  });
});
