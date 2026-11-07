import { describe, expect, it } from "vitest";
import { DAY_KEYS, formatTime, parseBusinessHours, dayKeyFor, formatDayHours } from "./hours";

const weekdays = { open: "08:00", close: "17:30" };
const full = { mon: weekdays, tue: weekdays, wed: weekdays, thu: weekdays, fri: weekdays, sat: { open: "09:00", close: "14:00" }, sun: null };

describe("parseBusinessHours", () => {
  it("accepts a full week with closed days", () => {
    expect(parseBusinessHours(full)).toEqual(full);
  });

  it("rejects missing days, bad times, and close before open", () => {
    const { sun: _sun, ...missing } = full;
    void _sun;
    expect(parseBusinessHours(missing)).toBeNull();
    expect(parseBusinessHours({ ...full, mon: { open: "8am", close: "17:00" } })).toBeNull();
    expect(parseBusinessHours({ ...full, mon: { open: "25:00", close: "26:00" } })).toBeNull();
    expect(parseBusinessHours({ ...full, mon: { open: "17:00", close: "08:00" } })).toBeNull();
    expect(parseBusinessHours({ ...full, mon: { open: "09:00", close: "09:00" } })).toBeNull();
  });

  it("rejects non-objects", () => {
    expect(parseBusinessHours(null)).toBeNull();
    expect(parseBusinessHours("mon 8-5")).toBeNull();
    expect(parseBusinessHours([])).toBeNull();
  });

  it("ignores extra keys", () => {
    expect(parseBusinessHours({ ...full, holiday: null })).toEqual(full);
  });
});

describe("formatTime", () => {
  it("formats 24h strings as 12h", () => {
    expect(formatTime("00:00")).toBe("12 AM");
    expect(formatTime("08:00")).toBe("8 AM");
    expect(formatTime("12:00")).toBe("12 PM");
    expect(formatTime("17:30")).toBe("5:30 PM");
  });
});

describe("formatDayHours", () => {
  it("formats open and closed days", () => {
    expect(formatDayHours(weekdays)).toBe("8 AM – 5:30 PM");
    expect(formatDayHours(null)).toBe("Closed");
  });
});

describe("dayKeyFor", () => {
  it("maps JS weekdays to keys", () => {
    expect(dayKeyFor(new Date("2026-11-09T12:00:00"))).toBe("mon");
    expect(dayKeyFor(new Date("2026-11-08T12:00:00"))).toBe("sun");
    expect(DAY_KEYS).toHaveLength(7);
  });
});
