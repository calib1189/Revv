import { describe, expect, it } from "vitest";
import { relativeTime } from "./relative-time";

const NOW = new Date("2026-08-22T12:00:00Z");

describe("relativeTime", () => {
  it("returns 'now' for timestamps under a minute old", () => {
    expect(relativeTime("2026-08-22T11:59:30Z", NOW)).toBe("now");
  });

  it("formats minutes", () => {
    expect(relativeTime("2026-08-22T11:55:00Z", NOW)).toBe("5m ago");
  });

  it("formats hours", () => {
    expect(relativeTime("2026-08-22T09:00:00Z", NOW)).toBe("3h ago");
  });

  it("formats days", () => {
    expect(relativeTime("2026-08-19T12:00:00Z", NOW)).toBe("3d ago");
  });

  it("formats weeks", () => {
    expect(relativeTime("2026-08-01T12:00:00Z", NOW)).toBe("3w ago");
  });
});
