import { describe, expect, it } from "vitest";
import { canBattle, SKIP_LINE, skipLineState } from "./skip-line";

const now = new Date("2026-11-24T12:00:00Z");
const base = { eligible: true, openRequestAt: null, lastRequestAt: null, balance: 800, now };

describe("skipLineState", () => {
  it("is 500 points", () => {
    expect(SKIP_LINE.price).toBe(500);
  });

  it("offers it to an eligible car, and says whether they can afford it", () => {
    expect(skipLineState(base)).toEqual({ kind: "available", balance: 800, canAfford: true });
    expect(skipLineState({ ...base, balance: 499 })).toEqual({ kind: "available", balance: 499, canAfford: false });
  });

  it("hides it from a car that can't battle", () => {
    expect(skipLineState({ ...base, eligible: false })).toEqual({ kind: "ineligible" });
  });

  it("shows a waiting spot, refunded three days after it was bought", () => {
    expect(skipLineState({ ...base, openRequestAt: "2026-11-24T10:00:00Z" })).toEqual({
      kind: "queued",
      refundsAt: "2026-11-27T10:00:00.000Z",
    });
  });

  it("allows one a week", () => {
    expect(skipLineState({ ...base, lastRequestAt: "2026-11-20T12:00:00Z" })).toEqual({
      kind: "cooldown",
      availableAt: "2026-11-27T12:00:00.000Z",
    });
    expect(skipLineState({ ...base, lastRequestAt: "2026-11-17T12:00:00Z" }).kind).toBe("available");
  });
});

describe("canBattle", () => {
  const car = { ownership_verification_status: "approved", hero_media_id: "m1" };
  it("needs approval, a cover photo and a score", () => {
    expect(canBattle(car, 88)).toBe(true);
    expect(canBattle({ ...car, ownership_verification_status: "pending" }, 88)).toBe(false);
    expect(canBattle({ ...car, hero_media_id: null }, 88)).toBe(false);
    expect(canBattle(car, null)).toBe(false);
  });
});
