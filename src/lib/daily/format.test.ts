import { describe, expect, it } from "vitest";
import { formatDayLong, formatDayShort, formatTimeLeft } from "./format";

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
