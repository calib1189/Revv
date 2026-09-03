import { describe, it, expect } from "vitest";
import { getWeekStart, getWeekEnd, weekStartKey } from "./week";

describe("getWeekStart", () => {
  it("returns the same Monday for any day within that week", () => {
    // Mon 2026-08-31 through Sun 2026-09-06 should all resolve to the
    // same Monday.
    const monday = new Date("2026-08-31T00:00:00Z");
    const wednesday = new Date("2026-09-02T14:30:00Z");
    const sunday = new Date("2026-09-06T23:59:59Z");

    expect(getWeekStart(monday).toISOString()).toBe(monday.toISOString());
    expect(getWeekStart(wednesday).toISOString()).toBe(monday.toISOString());
    expect(getWeekStart(sunday).toISOString()).toBe(monday.toISOString());
  });

  it("rolls a Sunday back to the Monday that started its own week, not the next one", () => {
    const sunday = new Date("2026-09-06T12:00:00Z");
    const expectedMonday = new Date("2026-08-31T00:00:00Z");
    expect(getWeekStart(sunday).toISOString()).toBe(expectedMonday.toISOString());
  });

  it("crosses a month boundary correctly", () => {
    // Tue 2026-09-01 is in the week starting Mon 2026-08-31.
    const date = new Date("2026-09-01T08:00:00Z");
    expect(getWeekStart(date).toISOString()).toBe(new Date("2026-08-31T00:00:00Z").toISOString());
  });
});

describe("getWeekEnd", () => {
  it("is exactly 7 days after the week start", () => {
    const start = getWeekStart(new Date("2026-09-02T00:00:00Z"));
    const end = getWeekEnd(start);
    expect(end.getTime() - start.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });
});

describe("weekStartKey", () => {
  it("formats as a plain YYYY-MM-DD date", () => {
    expect(weekStartKey(new Date("2026-08-31T00:00:00Z"))).toBe("2026-08-31");
  });
});
