import { describe, expect, it } from "vitest";
import { pickRideRound, compareToCommunity, RIDE_ROUND_SIZE } from "./ride";

const car = (id: string, ownerId = `o-${id}`) => ({ vehicleId: id, ownerId });
const pool = Array.from({ length: 12 }, (_, i) => car(`v${i}`));

describe("pickRideRound", () => {
  it("picks three cars by default", () => {
    expect(RIDE_ROUND_SIZE).toBe(3);
    expect(pickRideRound({ candidates: pool, viewerId: "me", rated: new Set(), recentlyShown: new Set(), seed: "me:2026-11-08" })).toHaveLength(3);
  });

  it("never shows your own car or one you've already rated", () => {
    const mine = [car("mine1", "me"), car("mine2", "me")];
    const rated = new Set(["v0", "v1", "v2", "v3", "v4", "v5", "v6", "v7", "v8"]);
    const round = pickRideRound({ candidates: [...mine, ...pool], viewerId: "me", rated, recentlyShown: new Set(), seed: "s" });
    expect(round.sort()).toEqual(["v10", "v11", "v9"]);
  });

  it("avoids recently shown cars when enough others exist", () => {
    const recent = new Set(["v0", "v1", "v2", "v3", "v4", "v5", "v6", "v7", "v8"]);
    const round = pickRideRound({ candidates: pool, viewerId: "me", rated: new Set(), recentlyShown: recent, seed: "s" });
    expect(round.sort()).toEqual(["v10", "v11", "v9"]);
  });

  it("falls back to recently shown (but still unrated) cars when the pool is small", () => {
    const recent = new Set(pool.map((c) => c.vehicleId).slice(0, 11));
    const round = pickRideRound({ candidates: pool, viewerId: "me", rated: new Set(), recentlyShown: recent, seed: "s" });
    expect(round).toHaveLength(3);
    expect(round[0]).toBe("v11");
  });

  it("returns fewer than three when that's all there is", () => {
    expect(pickRideRound({ candidates: [car("a")], viewerId: "me", rated: new Set(), recentlyShown: new Set(), seed: "s" })).toEqual(["a"]);
    expect(pickRideRound({ candidates: [], viewerId: "me", rated: new Set(), recentlyShown: new Set(), seed: "s" })).toEqual([]);
  });

  it("is the same for the same person and day, and differs across days", () => {
    const a = pickRideRound({ candidates: pool, viewerId: "me", rated: new Set(), recentlyShown: new Set(), seed: "me:2026-11-08" });
    const b = pickRideRound({ candidates: [...pool].reverse(), viewerId: "me", rated: new Set(), recentlyShown: new Set(), seed: "me:2026-11-08" });
    expect(a).toEqual(b);
    const days = new Set(
      ["2026-11-08", "2026-11-09", "2026-11-10", "2026-11-11"].map((d) =>
        pickRideRound({ candidates: pool, viewerId: "me", rated: new Set(), recentlyShown: new Set(), seed: `me:${d}` }).join(),
      ),
    );
    expect(days.size).toBeGreaterThan(1);
  });

  it("never repeats a car within a round", () => {
    const round = pickRideRound({ candidates: [...pool, ...pool], viewerId: "me", rated: new Set(), recentlyShown: new Set(), seed: "s" });
    expect(new Set(round).size).toBe(round.length);
  });
});

describe("compareToCommunity", () => {
  it("says how your rating sits against the community", () => {
    expect(compareToCommunity(5, 3.2)).toBe("higher");
    expect(compareToCommunity(2, 3.9)).toBe("lower");
    expect(compareToCommunity(4, 4.3)).toBe("same");
    expect(compareToCommunity(4, null)).toBe("first");
  });
});
