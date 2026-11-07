import { describe, expect, it } from "vitest";
import { COMP_LENGTH_DAYS, compEndsAt, isCompLengthDays } from "./comp";

describe("isCompLengthDays", () => {
  it("accepts only the offered lengths", () => {
    for (const days of COMP_LENGTH_DAYS) expect(isCompLengthDays(days)).toBe(true);
    expect(isCompLengthDays(0)).toBe(false);
    expect(isCompLengthDays(-30)).toBe(false);
    expect(isCompLengthDays(31)).toBe(false);
    expect(isCompLengthDays(Number.NaN)).toBe(false);
  });
});

describe("compEndsAt", () => {
  it("adds whole days to the start", () => {
    const start = new Date("2026-11-07T15:00:00.000Z");
    expect(compEndsAt(start, 30).toISOString()).toBe("2026-12-07T15:00:00.000Z");
    expect(compEndsAt(start, 90).toISOString()).toBe("2027-02-05T15:00:00.000Z");
  });

  it("does not mutate the start date", () => {
    const start = new Date("2026-11-07T15:00:00.000Z");
    compEndsAt(start, 60);
    expect(start.toISOString()).toBe("2026-11-07T15:00:00.000Z");
  });
});
