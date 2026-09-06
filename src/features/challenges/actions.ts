"use server";

import { requireConfirmedUser } from "@/lib/auth/require-confirmed-user";
import {
  getChallengeCompletion,
  markChallengeCompletionClaimed,
} from "@/lib/db/user-challenge-completions";
import { getChallenge } from "@/lib/challenges/catalog";
import { getWeekStart, weekStartKey } from "@/lib/challenges/week";
import { CHALLENGE_COMPLETION_POINTS } from "@/lib/points/values";

export interface ClaimState {
  error: string | null;
  amount: number | null;
}

/** Claims the points for one already-completed weekly challenge.
 * Always scoped to the *current* week, computed server-side — the
 * weekly card only ever shows this week's challenges, so there's no UI
 * path that needs claiming a past week's completion. */
export async function claimChallengePointsAction(challengeId: string): Promise<ClaimState> {
  const challenge = getChallenge(challengeId);
  if (!challenge) return { error: "Invalid challenge.", amount: null };

  const { supabase, user } = await requireConfirmedUser();
  const key = weekStartKey(getWeekStart());

  const row = await getChallengeCompletion(supabase, user.id, challengeId, key);
  if (!row) return { error: "You haven't completed this yet.", amount: null };
  if (row.claimedAt) return { error: "Already claimed.", amount: null };

  try {
    const { error: ledgerError } = await supabase.from("points_ledger").insert({
      user_id: user.id,
      amount: CHALLENGE_COMPLETION_POINTS,
      source_type: "challenge",
      source_id: `${challengeId}:${key}`,
    });
    // A unique-constraint conflict means a concurrent claim already won
    // this exact row — not a real failure.
    if (ledgerError && ledgerError.code !== "23505") throw ledgerError;

    await markChallengeCompletionClaimed(supabase, user.id, challengeId, key);
  } catch (err) {
    console.error("claimChallengePointsAction failed:", err);
    return { error: "Couldn't claim points. Try again.", amount: null };
  }

  return { error: null, amount: CHALLENGE_COMPLETION_POINTS };
}
