import { describe, expect, it } from "vitest";
import { computeStreak } from "./streak";

const TODAY = "2026-11-20";

describe("computeStreak", () => {
  it("counts consecutive active days ending today", () => {
    expect(computeStreak(["2026-11-18", "2026-11-19", "2026-11-20"], TODAY)).toMatchObject({ current: 3, longest: 3, activeToday: true });
  });

  it("stays alive through yesterday while today is still open", () => {
    expect(computeStreak(["2026-11-18", "2026-11-19"], TODAY)).toMatchObject({ current: 2, activeToday: false, atRisk: false });
  });

  it("bridges one missed day (a missed day doesn't count, but doesn't break it)", () => {
    expect(computeStreak(["2026-11-17", "2026-11-18", "2026-11-20"], TODAY)).toMatchObject({ current: 3 });
  });

  it("keeps a streak alive but at risk after missing only yesterday", () => {
    expect(computeStreak(["2026-11-17", "2026-11-18"], TODAY)).toMatchObject({ current: 2, atRisk: true });
  });

  it("breaks after two missed days in a row", () => {
    expect(computeStreak(["2026-11-16", "2026-11-17"], TODAY)).toMatchObject({ current: 0, longest: 2 });
    expect(computeStreak(["2026-11-10", "2026-11-11", "2026-11-14"], "2026-11-14")).toMatchObject({ current: 1 });
  });

  it("allows only one bridged day per 7 days", () => {
    // Misses on the 13th and 16th: the second is too soon, so the run restarts on the 17th.
    const dates = ["2026-11-12", "2026-11-14", "2026-11-15", "2026-11-17", "2026-11-18"];
    expect(computeStreak(dates, "2026-11-18")).toMatchObject({ current: 2, longest: 3 });
  });

  it("allows another bridge a week after the last one", () => {
    const dates = ["2026-11-01", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08", "2026-11-09", "2026-11-11"];
    expect(computeStreak(dates, "2026-11-11")).toMatchObject({ current: 9 });
  });

  it("ignores duplicates and order", () => {
    expect(computeStreak(["2026-11-20", "2026-11-19", "2026-11-20"], TODAY)).toMatchObject({ current: 2 });
  });

  it("is zero with no activity", () => {
    expect(computeStreak([], TODAY)).toEqual({ current: 0, longest: 0, activeToday: false, atRisk: false });
  });
});
