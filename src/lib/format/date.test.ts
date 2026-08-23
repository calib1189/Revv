import { describe, expect, it } from "vitest";
import { formatDateOnly } from "./date";

describe("formatDateOnly", () => {
  it("formats without a timezone day-shift", () => {
    expect(formatDateOnly("2026-06-15")).toBe("Jun 15, 2026");
  });

  it("formats the first of a month", () => {
    expect(formatDateOnly("2026-01-01")).toBe("Jan 1, 2026");
  });

  it("formats the last day of a year", () => {
    expect(formatDateOnly("2025-12-31")).toBe("Dec 31, 2025");
  });

  it("handles a full timestamptz string defensively", () => {
    expect(formatDateOnly("2026-06-15T00:00:00+00:00")).toBe("Jun 15, 2026");
  });
});
