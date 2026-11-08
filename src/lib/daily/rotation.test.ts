import { describe, expect, it } from "vitest";
import { WEEKDAY_ROTATION, isChallengeIcon } from "./rotation";

describe("WEEKDAY_ROTATION", () => {
  it("covers every weekday with a distinct, valid challenge", () => {
    const days = Object.keys(WEEKDAY_ROTATION);
    expect(days.sort()).toEqual(["fri", "mon", "sat", "sun", "thu", "tue", "wed"]);
    const titles = Object.values(WEEKDAY_ROTATION).map((t) => t.title);
    expect(new Set(titles).size).toBe(7);
    for (const t of Object.values(WEEKDAY_ROTATION)) {
      expect(t.title.length).toBeLessThanOrEqual(60);
      expect(t.description.length).toBeLessThanOrEqual(280);
      expect(isChallengeIcon(t.icon)).toBe(true);
    }
  });
});
