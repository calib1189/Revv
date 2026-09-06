"use client";

import { useState, useTransition } from "react";
import { CheckIcon, GemIcon } from "@/components/ui/icons";
import { CHALLENGES } from "@/lib/challenges/catalog";
import { CHALLENGE_COMPLETION_POINTS } from "@/lib/points/values";
import { claimChallengePointsAction } from "@/features/challenges/actions";
import type { ChallengeProgress } from "@/lib/challenges/evaluate";

type ProgressWithClaim = ChallengeProgress & { claimed: boolean };

/** The Garage/loop-facing "here's what to do this week" card — one row
 * per challenge with a progress bar, and a Claim button once complete
 * (points aren't auto-awarded — see claimChallengePointsAction). Reads
 * its initial state off `progress` computed server-side (see
 * lib/challenges/progress.ts); claimed status after that point is
 * tracked locally so a claim feels instant. */
export function WeeklyChallengesCard({ progress }: { progress: ProgressWithClaim[] }) {
  const [claimedIds, setClaimedIds] = useState(
    () => new Set(progress.filter((p) => p.claimed).map((p) => p.id)),
  );
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const completedCount = progress.filter((p) => p.completed).length;

  function claim(challengeId: string) {
    setError(null);
    setPendingId(challengeId);
    setClaimedIds((prev) => new Set(prev).add(challengeId));
    startTransition(async () => {
      const result = await claimChallengePointsAction(challengeId);
      if (result.error) {
        setClaimedIds((prev) => {
          const next = new Set(prev);
          next.delete(challengeId);
          return next;
        });
        setError(result.error);
      }
      setPendingId(null);
    });
  }

  return (
    <div className="glass-raised rounded-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight">This Week&apos;s Challenges</h2>
        <span className="text-sm text-muted">
          {completedCount}/{CHALLENGES.length}
        </span>
      </div>

      {error && <p className="mb-3 text-xs text-danger">{error}</p>}

      <div className="flex flex-col gap-4">
        {CHALLENGES.map((challenge) => {
          const p = progress.find((item) => item.id === challenge.id);
          const current = p?.current ?? 0;
          const target = p?.target ?? challenge.target;
          const completed = p?.completed ?? false;
          const claimed = claimedIds.has(challenge.id);

          return (
            <div key={challenge.id}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <span className={`flex items-center gap-1.5 font-medium ${completed ? "text-accent" : ""}`}>
                  {completed && <CheckIcon className="h-4 w-4 flex-shrink-0" />}
                  {challenge.name}
                </span>
                {completed && !claimed ? (
                  <button
                    type="button"
                    onClick={() => claim(challenge.id)}
                    disabled={pendingId === challenge.id}
                    className="flex flex-shrink-0 items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground transition-transform active:scale-95 disabled:opacity-60"
                  >
                    <GemIcon className="h-3 w-3" />
                    Claim {CHALLENGE_COMPLETION_POINTS}
                  </button>
                ) : (
                  <span className="flex-shrink-0 tabular-nums text-muted">
                    {claimed ? "Claimed" : `${current}/${target}`}
                  </span>
                )}
              </div>
              <p className="mb-1.5 text-xs text-muted">{challenge.description}</p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full transition-all ${completed ? "bg-accent" : "bg-white/40"}`}
                  style={{ width: `${(current / target) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
