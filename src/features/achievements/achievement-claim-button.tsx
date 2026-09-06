"use client";

import { useState, useTransition } from "react";
import { GemIcon, CheckIcon } from "@/components/ui/icons";
import { claimAchievementPointsAction } from "@/features/achievements/actions";

/** The one interactive piece inside an otherwise-presentational
 * AchievementBadge (passed in as its `footer`) — keeps the badge itself
 * a plain server component while this one small piece owns the claim
 * state, same composition pattern as any client island. */
export function AchievementClaimButton({
  achievementId,
  points,
}: {
  achievementId: string;
  points: number;
}) {
  const [claimed, setClaimed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (claimed) {
    return (
      <span className="mt-1 flex items-center gap-1 text-[10px] font-medium text-accent">
        <CheckIcon className="h-3 w-3" />
        Claimed
      </span>
    );
  }

  return (
    <div className="mt-1 flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await claimAchievementPointsAction(achievementId);
            if (result.error) setError(result.error);
            else setClaimed(true);
          });
        }}
        disabled={isPending}
        className="flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-foreground transition-transform active:scale-95 disabled:opacity-60"
      >
        <GemIcon className="h-3 w-3" />
        Claim {points}
      </button>
      {error && <p className="text-[10px] text-danger">{error}</p>}
    </div>
  );
}
