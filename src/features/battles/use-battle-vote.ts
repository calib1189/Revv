"use client";

import { useState, useTransition } from "react";
import { voteInBattleAction } from "@/features/battles/actions";
import { hapticLanding, hapticTierUp } from "@/lib/haptics";
import type { BattleView } from "@/lib/battles/load";
import { markBattleVoted } from "@/lib/battles/seen";

/** Voting in a battle, shared by the feed's battle card and the battle
 * page's arena: who you picked (optimistically, while it saves), the
 * points it paid, and what you may still do. */
export function useBattleVote(view: BattleView, isAuthenticated: boolean) {
  const [myVote, setMyVote] = useState<string | null>(view.myVote);
  const [pendingPick, setPendingPick] = useState<string | null>(null);
  const [points, setPoints] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canVote = isAuthenticated && !view.isOwner && !view.ended && myVote === null;
  /** Scores show once you've voted, the battle is over, or it's your car. */
  const reveal = myVote !== null || view.ended || view.isOwner;
  /** Voted just now, on this page (not on an earlier visit). */
  const justVoted = myVote !== null && view.myVote === null;

  function vote(vehicleId: string) {
    if (!canVote || isPending) return;
    setError(null);
    setPendingPick(vehicleId);
    hapticTierUp();
    startTransition(async () => {
      const result = await voteInBattleAction(view.id, vehicleId);
      setPendingPick(null);
      if (result.error) setError(result.error);
      else {
        setMyVote(vehicleId);
        setPoints(result.points);
        markBattleVoted(view.id);
        hapticLanding();
      }
    });
  }

  return { myVote, pendingPick, points, error, isPending, canVote, reveal, justVoted, vote };
}
