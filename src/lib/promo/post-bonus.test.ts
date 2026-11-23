import { describe, expect, it } from "vitest";
import { isPostBonusLive, isPostBonusPushDue, isPromoPushHour, POST_BONUS, postBonusPushPayload } from "./post-bonus";

describe("post bonus window", () => {
  it("counts posts from Monday evening through 11:59pm ET Tuesday", () => {
    expect(isPostBonusLive(new Date("2026-11-23T23:59:59Z"))).toBe(false);
    expect(isPostBonusLive(new Date("2026-11-24T00:00:00Z"))).toBe(true);
    expect(isPostBonusLive(new Date("2026-11-25T04:59:59Z"))).toBe(true);
    expect(isPostBonusLive(new Date("2026-11-25T05:00:00Z"))).toBe(false);
  });

  it("stops pushing three hours before the end", () => {
    expect(isPostBonusPushDue(new Date("2026-11-24T15:00:00Z"))).toBe(true);
    expect(isPostBonusPushDue(new Date("2026-11-25T01:59:00Z"))).toBe(true);
    expect(isPostBonusPushDue(new Date("2026-11-25T02:00:00Z"))).toBe(false);
  });

  it("is a new offer worth 200 points, payable to last weekend's earners too", () => {
    expect(POST_BONUS.points).toBe(200);
    expect(POST_BONUS.id).not.toBe("post_bonus_2026_11_22");
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
