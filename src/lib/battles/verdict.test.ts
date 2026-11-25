import { describe, expect, it } from "vitest";
import { battleVerdict, type BattleVerdictInput } from "@/lib/battles/verdict";
import { BATTLE_POINTS } from "@/lib/points/values";

const base: BattleVerdictInput = {
  vehicleAId: "car-a",
  vehicleBId: "car-b",
  result: { a: 6, b: 2, winnerId: "car-a", upset: false },
  isAuthenticated: true,
  myVote: null,
  myCarId: null,
};

describe("battleVerdict", () => {
  it("pays the called-it bonus to someone who picked the winner", () => {
    expect(battleVerdict({ ...base, myVote: "car-a" })).toEqual({ kind: "called", points: BATTLE_POINTS.calledIt });
  });

  it("pays nothing more to someone who picked the other car", () => {
    expect(battleVerdict({ ...base, myVote: "car-b" })).toEqual({ kind: "missed", points: 0 });
  });

  it("pays the winning owner, more for an upset", () => {
    expect(battleVerdict({ ...base, myCarId: "car-a" })).toEqual({ kind: "owner-won", points: BATTLE_POINTS.win });
    expect(battleVerdict({ ...base, myCarId: "car-a", result: { ...base.result, upset: true } })).toEqual({
      kind: "owner-won",
      points: BATTLE_POINTS.upsetWin,
    });
  });

  it("tells the losing owner they lost, with nothing paid", () => {
    expect(battleVerdict({ ...base, myCarId: "car-b" })).toEqual({ kind: "owner-lost", points: 0 });
  });

  it("pays nothing on a tie", () => {
    const tie = { ...base.result, a: 3, b: 3, winnerId: null };
    expect(battleVerdict({ ...base, result: tie, myVote: "car-a" })).toEqual({ kind: "no-winner", points: 0 });
    expect(battleVerdict({ ...base, result: tie })).toEqual({ kind: "no-winner", points: 0 });
  });

  it("separates sitting it out from being signed out", () => {
    expect(battleVerdict(base)).toEqual({ kind: "no-vote", points: 0 });
    expect(battleVerdict({ ...base, isAuthenticated: false })).toEqual({ kind: "signed-out", points: 0 });
  });
});
