import { describe, expect, it } from "vitest";
import { isPostBonusLive, isPostBonusPushDue, isPromoPushHour, POST_BONUS, postBonusPushPayload } from "./post-bonus";

describe("post bonus window", () => {
  it("counts posts from Saturday through 11:59pm ET Sunday", () => {
    expect(isPostBonusLive(new Date("2026-11-21T04:59:59Z"))).toBe(false);
    expect(isPostBonusLive(new Date("2026-11-21T05:00:00Z"))).toBe(true);
    expect(isPostBonusLive(new Date("2026-11-23T04:59:59Z"))).toBe(true);
    expect(isPostBonusLive(new Date("2026-11-23T05:00:00Z"))).toBe(false);
  });

  it("stops pushing three hours before the end", () => {
    expect(isPostBonusPushDue(new Date("2026-11-21T22:00:00Z"))).toBe(true);
    expect(isPostBonusPushDue(new Date("2026-11-23T01:59:00Z"))).toBe(true);
    expect(isPostBonusPushDue(new Date("2026-11-23T02:00:00Z"))).toBe(false);
  });

  it("only pushes in waking hours", () => {
    expect(isPromoPushHour(9)).toBe(false);
    expect(isPromoPushHour(10)).toBe(true);
    expect(isPromoPushHour(21)).toBe(true);
    expect(isPromoPushHour(22)).toBe(false);
  });

  it("promises the points it pays and opens the composer", () => {
    const payload = postBonusPushPayload();
    expect(payload.body).toContain(`${POST_BONUS.points} points`);
    expect(payload.url).toBe("/feed/new");
  });
});
