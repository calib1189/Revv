import { describe, expect, it } from "vitest";
import { battleOutcome, battlePayouts, votePercents } from "./result";
import { BATTLE_POINTS } from "@/lib/points/values";

const battle = { vehicleAId: "a", vehicleBId: "b", scoreA: 88.4, scoreB: 82.1 };

describe("battleOutcome", () => {
  it("names the car with more votes, and calls it an upset when its score was lower", () => {
    expect(battleOutcome(battle, { a: 3, b: 5 })).toEqual({ winnerId: "b", loserId: "a", upset: true, a: 3, b: 5 });
    expect(battleOutcome(battle, { a: 5, b: 3 })).toEqual({ winnerId: "a", loserId: "b", upset: false, a: 5, b: 3 });
  });

  it("has no winner on a tie, including nobody voting", () => {
    expect(battleOutcome(battle, { a: 2, b: 2 }).winnerId).toBeNull();
    expect(battleOutcome(battle, { a: 0, b: 0 }).winnerId).toBeNull();
  });
});

describe("votePercents", () => {
  it("always adds up to 100", () => {
    expect(votePercents(1, 2)).toEqual([33, 67]);
    expect(votePercents(2, 1)).toEqual([67, 33]);
    expect(votePercents(0, 0)).toEqual([0, 0]);
    expect(votePercents(5, 0)).toEqual([100, 0]);
  });
});

describe("battlePayouts", () => {
  const owners = { a: "ownerA", b: "ownerB" };
  const votes = [
    { voterId: "v1", vehicleId: "b" },
    { voterId: "v2", vehicleId: "a" },
    { voterId: "ownerB", vehicleId: "b" },
  ];

  it("pays the winning owner (more for an upset) and everyone who called it", () => {
    const upset = battleOutcome(battle, { a: 1, b: 2 });
    expect(battlePayouts(upset, votes, owners)).toEqual([
      { userId: "ownerB", key: "battle_upset", amount: BATTLE_POINTS.upsetWin },
      { userId: "v1", key: "battle_called", amount: BATTLE_POINTS.calledIt },
      { userId: "ownerB", key: "battle_called", amount: BATTLE_POINTS.calledIt },
    ]);

    const normal = battleOutcome(battle, { a: 2, b: 1 });
    expect(battlePayouts(normal, [{ voterId: "v2", vehicleId: "a" }], owners)).toEqual([
      { userId: "ownerA", key: "battle_win", amount: BATTLE_POINTS.win },
      { userId: "v2", key: "battle_called", amount: BATTLE_POINTS.calledIt },
    ]);
  });

  it("pays nothing on a tie", () => {
    expect(battlePayouts(battleOutcome(battle, { a: 1, b: 1 }), votes, owners)).toEqual([]);
  });
});
