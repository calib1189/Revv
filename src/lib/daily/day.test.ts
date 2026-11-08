import { describe, expect, it } from "vitest";
import { addDays, dailyDateKey, dayBounds, isChallengeOpen, weekdayOf } from "./day";

describe("dailyDateKey (Sorza day = midnight to midnight US Central)", () => {
  it("rolls over at Central midnight in winter (UTC-6)", () => {
    expect(dailyDateKey(new Date("2026-11-08T05:59:59Z"))).toBe("2026-11-07");
    expect(dailyDateKey(new Date("2026-11-08T06:00:00Z"))).toBe("2026-11-08");
  });

  it("rolls over at Central midnight in summer (UTC-5)", () => {
    expect(dailyDateKey(new Date("2026-07-04T04:59:59Z"))).toBe("2026-07-03");
    expect(dailyDateKey(new Date("2026-07-04T05:00:00Z"))).toBe("2026-07-04");
  });
});

describe("dayBounds", () => {
  it("spans Central midnight to the next Central midnight", () => {
    const { startsAt, endsAt } = dayBounds("2026-11-08");
    expect(startsAt.toISOString()).toBe("2026-11-08T06:00:00.000Z");
    expect(endsAt.toISOString()).toBe("2026-11-09T06:00:00.000Z");
  });

  it("is 25 hours on the day clocks fall back", () => {
    const { startsAt, endsAt } = dayBounds("2026-11-01");
    expect(startsAt.toISOString()).toBe("2026-11-01T05:00:00.000Z");
    expect(endsAt.toISOString()).toBe("2026-11-02T06:00:00.000Z");
  });

  it("is 23 hours on the day clocks spring forward", () => {
    const { startsAt, endsAt } = dayBounds("2026-03-08");
    expect(startsAt.toISOString()).toBe("2026-03-08T06:00:00.000Z");
    expect(endsAt.toISOString()).toBe("2026-03-09T05:00:00.000Z");
  });

  it("agrees with dailyDateKey at both edges", () => {
    for (const key of ["2026-01-15", "2026-03-08", "2026-07-04", "2026-11-01", "2026-12-31"]) {
      const { startsAt, endsAt } = dayBounds(key);
      expect(dailyDateKey(startsAt)).toBe(key);
      expect(dailyDateKey(new Date(endsAt.getTime() - 1))).toBe(key);
      expect(dailyDateKey(endsAt)).toBe(addDays(key, 1));
    }
  });

  it("rejects malformed keys", () => {
    expect(() => dayBounds("2026-13-01")).toThrow();
    expect(() => dayBounds("yesterday")).toThrow();
  });
});

describe("addDays and weekdayOf", () => {
  it("crosses month and year ends", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("names the weekday of a date", () => {
    expect(weekdayOf("2026-11-09")).toBe("mon");
    expect(weekdayOf("2026-11-08")).toBe("sun");
    expect(weekdayOf("2026-11-14")).toBe("sat");
  });
});

describe("isChallengeOpen", () => {
  const c = { starts_at: "2026-11-08T06:00:00Z", ends_at: "2026-11-09T06:00:00Z" };
  it("is open from the start up to, not including, the deadline", () => {
    expect(isChallengeOpen(c, new Date("2026-11-08T05:59:59Z"))).toBe(false);
    expect(isChallengeOpen(c, new Date("2026-11-08T06:00:00Z"))).toBe(true);
    expect(isChallengeOpen(c, new Date("2026-11-09T05:59:59Z"))).toBe(true);
    expect(isChallengeOpen(c, new Date("2026-11-09T06:00:00Z"))).toBe(false);
  });
});
