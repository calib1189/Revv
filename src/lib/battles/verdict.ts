import { battlePayouts, type BattleOutcome } from "@/lib/battles/result";

export type BattleVerdictKind =
  /** Voted for the winner. */
  | "called"
  /** Voted for the other car. */
  | "missed"
  /** The viewer's own car won. */
  | "owner-won"
  /** The viewer's own car lost. */
  | "owner-lost"
  /** A tie, or nobody voted: no winner, nothing paid. */
  | "no-winner"
  /** Signed in, but sat this one out. */
  | "no-vote"
  | "signed-out";

export interface BattleVerdict {
  kind: BattleVerdictKind;
  /** What the result paid this viewer (on top of the points for voting,
   * which they got when they voted). 0 when it paid nothing. */
  points: number;
}

export interface BattleVerdictInput {
  vehicleAId: string;
  vehicleBId: string;
  result: { a: number; b: number; winnerId: string | null; upset: boolean };
  isAuthenticated: boolean;
  /** The car the viewer voted for. */
  myVote: string | null;
  /** The viewer's own car, when it's one of the two. */
  myCarId: string | null;
}

/** How yesterday's battle went for this viewer, and what it paid them.
 * The points come from battlePayouts, the same rule that settled the
 * battle, so the screen can't promise anything the ledger didn't get. */
export function battleVerdict(input: BattleVerdictInput): BattleVerdict {
  const { result } = input;
  const outcome: BattleOutcome = {
    winnerId: result.winnerId,
    loserId: result.winnerId === null ? null : result.winnerId === input.vehicleAId ? input.vehicleBId : input.vehicleAId,
    upset: result.upset,
    a: result.a,
    b: result.b,
  };
  const me = "viewer";
  const ownerByVehicle: Record<string, string> = {};
  if (input.myCarId) ownerByVehicle[input.myCarId] = me;
  const points = battlePayouts(
    outcome,
    input.myVote ? [{ voterId: me, vehicleId: input.myVote }] : [],
    ownerByVehicle,
  )
    .filter((p) => p.userId === me)
    .reduce((sum, p) => sum + p.amount, 0);

  if (input.myCarId) {
    if (!result.winnerId) return { kind: "no-winner", points };
    return { kind: result.winnerId === input.myCarId ? "owner-won" : "owner-lost", points };
  }
  if (!input.isAuthenticated) return { kind: "signed-out", points: 0 };
  if (!input.myVote) return { kind: result.winnerId ? "no-vote" : "no-winner", points: 0 };
  if (!result.winnerId) return { kind: "no-winner", points };
  return { kind: input.myVote === result.winnerId ? "called" : "missed", points };
}
