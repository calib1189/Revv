import { describe, expect, it } from "vitest";
import { dailyNumber, FIRST_DAILY_DATE, formatClock, formatDayLong, formatDayShort, formatTimeLeft } from "./format";

describe("daily formatting", () => {
  it("names the day from its key regardless of the viewer's zone", () => {
    expect(formatDayLong("2026-11-08")).toBe("Sunday, November 8");
    expect(formatDayShort("2026-11-09")).toBe("Mon, Nov 9");
  });
  it("formats time left", () => {
    expect(formatTimeLeft(5 * 3600_000 + 12 * 60_000 + 5000)).toBe("5h 12m");
    expect(formatTimeLeft(12 * 60_000 + 30_000)).toBe("12m 30s");
    expect(formatTimeLeft(0)).toBeNull();
    expect(formatTimeLeft(-1)).toBeNull();
  });
});

describe("formatClock", () => {
  it("pads hours, minutes and seconds", () => {
    expect(formatClock((23 * 3600 + 4 * 60 + 7) * 1000 + 400)).toBe("23:04:07");
    expect(formatClock(59_000)).toBe("00:00:59");
  });
  it("is null once time is up", () => {
    expect(formatClock(0)).toBeNull();
    expect(formatClock(-5)).toBeNull();
  });
});

describe("dailyNumber", () => {
  it("counts the first Daily as No. 1", () => {
    expect(dailyNumber(FIRST_DAILY_DATE)).toBe(1);
    expect(dailyNumber("2026-11-09")).toBe(2);
  });
  it("counts across a month and a DST change", () => {
    expect(dailyNumber("2026-12-08")).toBe(31);
    expect(dailyNumber("2027-03-15")).toBe(128);
  });
});
