import { describe, expect, it } from "vitest";
import { pickMatchup, type BattleCandidate } from "./match";

const car = (vehicleId: string, over: Partial<BattleCandidate> = {}): BattleCandidate => ({
  vehicleId,
  ownerId: `owner-${vehicleId}`,
  score: 80,
  category: "cars",
  lastBattledOn: null,
  ...over,
});

describe("pickMatchup", () => {
  it("needs two cars from two different owners", () => {
    expect(pickMatchup([], "2026-11-24")).toBeNull();
    expect(pickMatchup([car("a")], "2026-11-24")).toBeNull();
    expect(pickMatchup([car("a", { ownerId: "x" }), car("b", { ownerId: "x" })], "2026-11-24")).toBeNull();
  });

  it("leads with the car that has waited longest, and gives it the closest score", () => {
    const m = pickMatchup(
      [
        car("old", { lastBattledOn: "2026-10-01", score: 90 }),
        car("fresh", { lastBattledOn: null, score: 70 }),
        car("near", { lastBattledOn: "2026-09-01", score: 72 }),
        car("far", { lastBattledOn: "2026-09-01", score: 95 }),
      ],
      "2026-11-24",
    );
    expect([m!.a.vehicleId, m!.b.vehicleId]).toEqual(["fresh", "near"]);
  });

  it("prefers the same category over a closer score", () => {
    const m = pickMatchup(
      [
        car("truck", { category: "trucks", score: 80, lastBattledOn: "2026-01-01" }),
        car("car", { category: "cars", score: 80.5, lastBattledOn: "2026-11-20" }),
        car("truck2", { category: "trucks", score: 70, lastBattledOn: "2026-11-20" }),
      ],
      "2026-11-24",
    );
    expect([m!.a.vehicleId, m!.b.vehicleId]).toEqual(["truck", "truck2"]);
  });

  it("rests a car for two weeks after it battles, unless there's no one else", () => {
    const rested = pickMatchup(
      [car("a", { lastBattledOn: "2026-11-20" }), car("b"), car("c")],
      "2026-11-24",
    );
    expect([rested!.a.vehicleId, rested!.b.vehicleId].sort()).toEqual(["b", "c"]);

    const fallback = pickMatchup([car("a", { lastBattledOn: "2026-11-20" }), car("b")], "2026-11-24");
    expect([fallback!.a.vehicleId, fallback!.b.vehicleId].sort()).toEqual(["a", "b"]);
  });

  it("is the same matchup every time for the same day", () => {
    const cars = Array.from({ length: 12 }, (_, i) => car(`v${i}`, { score: 60 + i * 2 }));
    expect(pickMatchup(cars, "2026-11-24")).toEqual(pickMatchup(cars, "2026-11-24"));
  });

  it("puts a paid car in front, even one resting, against its closest rival", () => {
    const m = pickMatchup(
      [
        car("paid", { score: 80, lastBattledOn: "2026-11-22" }),
        car("waited", { score: 60 }),
        car("close", { score: 81, lastBattledOn: "2026-09-01" }),
      ],
      "2026-11-24",
      "paid",
    );
    expect([m!.a.vehicleId, m!.b.vehicleId]).toEqual(["paid", "close"]);
  });

  it("ignores a paid car that isn't in the pool", () => {
    const m = pickMatchup([car("a"), car("b")], "2026-11-24", "gone");
    expect(m).not.toBeNull();
  });
});
