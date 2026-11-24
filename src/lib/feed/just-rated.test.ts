import { describe, expect, it } from "vitest";
import { isNewViewer } from "./just-rated";

describe("isNewViewer", () => {
  const now = new Date("2026-11-24T12:00:00Z");

  it("treats a signed-out viewer as new", () => {
    expect(isNewViewer(null, now)).toBe(true);
  });

  it("is new for three days after signing up, then not", () => {
    expect(isNewViewer("2026-11-21T12:00:01Z", now)).toBe(true);
    expect(isNewViewer("2026-11-21T12:00:00Z", now)).toBe(false);
    expect(isNewViewer("2026-10-01T00:00:00Z", now)).toBe(false);
  });
});
