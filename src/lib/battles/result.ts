import { BATTLE_POINTS } from "@/lib/points/values";

export interface BattleSides {
  vehicleAId: string;
  vehicleBId: string;
  /** Each car's SORZA score when the battle was set: the bar an upset is
   * measured against, so a later re-score can't rewrite history. */
  scoreA: number;
  scoreB: number;
}

export interface BattleOutcome {
  winnerId: string | null;
  loserId: string | null;
  /** The crowd picked the car SORZA scored lower. */
  upset: boolean;
  a: number;
  b: number;
}

/** More votes wins; a tie (or no votes) has no winner. */
export function battleOutcome(battle: BattleSides, votes: { a: number; b: number }): BattleOutcome {
  if (votes.a === votes.b) return { winnerId: null, loserId: null, upset: false, ...votes };
  const aWon = votes.a > votes.b;
  return {
    winnerId: aWon ? battle.vehicleAId : battle.vehicleBId,
    loserId: aWon ? battle.vehicleBId : battle.vehicleAId,
    upset: aWon ? battle.scoreA < battle.scoreB : battle.scoreB < battle.scoreA,
    ...votes,
  };
}

/** Whole percentages that always add up to 100 (0/0 when nobody voted). */
export function votePercents(a: number, b: number): [number, number] {
  const total = a + b;
  if (total === 0) return [0, 0];
  const pa = Math.round((a / total) * 100);
  return [pa, 100 - pa];
}

export interface BattlePayout {
  userId: string;
  /** Prefix of the ledger source id; the battle's day completes it, so
   * each payout happens once however often settling runs. */
  key: "battle_win" | "battle_upset" | "battle_called";
  amount: number;
}

/** What a settled battle pays: the winning car's owner (more for an
 * upset), then everyone who voted for the winner. Nothing on a tie.
 * `ownerByVehicle` maps each of the two cars to its owner. */
export function battlePayouts(
  outcome: BattleOutcome,
  votes: { voterId: string; vehicleId: string }[],
  ownerByVehicle: Record<string, string>,
): BattlePayout[] {
  if (!outcome.winnerId) return [];
  const winnerOwner = ownerByVehicle[outcome.winnerId];
  return [
    ...(winnerOwner
      ? [
          {
            userId: winnerOwner,
            key: outcome.upset ? ("battle_upset" as const) : ("battle_win" as const),
            amount: outcome.upset ? BATTLE_POINTS.upsetWin : BATTLE_POINTS.win,
          },
        ]
      : []),
    ...votes
      .filter((v) => v.vehicleId === outcome.winnerId)
      .map((v) => ({ userId: v.voterId, key: "battle_called" as const, amount: BATTLE_POINTS.calledIt })),
  ];
}
