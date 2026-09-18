"use client";

import { useState, useTransition } from "react";
import { CheckIcon, GemIcon } from "@/components/ui/icons";
import { ProgressRing } from "@/components/ui/progress-ring";
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
      // alreadyClaimed means the challenge genuinely is claimed server-
      // side — reverting the optimistic state here would flip the button
      // back to "Claim", which a second tap (or a stale reload that
      // rendered claimed: false when the DB already had it) could
      // otherwise turn into an endless claim-fails-reverts-claim loop.
      if (result.error && !result.alreadyClaimed) {
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
    <section>
      <div className="mb-2.5 flex items-baseline justify-between px-1">
        <h2 className="text-[1.375rem] font-bold tracking-[-0.02em]">This Week</h2>
        <span className="text-[0.8125rem] font-medium text-muted">
          <span className="numeral">{completedCount}</span> of{" "}
          <span className="numeral">{CHALLENGES.length}</span> done
        </span>
      </div>

      {error && <p className="mb-2 px-1 text-xs text-danger">{error}</p>}

      <ul className="glass-raised elev-1 overflow-hidden rounded-[22px]">
        {CHALLENGES.map((challenge, index) => {
          const p = progress.find((item) => item.id === challenge.id);
          const current = p?.current ?? 0;
          const target = p?.target ?? challenge.target;
          const completed = p?.completed ?? false;
          const claimed = claimedIds.has(challenge.id);

          return (
            <li key={challenge.id} className="relative flex items-center gap-3.5 px-4 py-3.5">
              {/* Inset hairline, iOS grouped-list style — starts where
                  the text does, not at the card edge. */}
              {index > 0 && (
                <span className="absolute left-[4.5rem] right-0 top-0 h-px bg-border" />
              )}
              <ProgressRing
                value={Math.min(1, current / target)}
                size={44}
                stroke={4.5}
                color={completed ? "var(--success)" : "var(--accent)"}
                label={`${Math.min(current, target)} of ${target}`}
              >
                {completed ? (
                  <CheckIcon className="h-4 w-4 text-success" />
                ) : (
                  <span className="numeral text-[0.625rem] leading-none">
                    {Math.min(current, target)}/{target}
                  </span>
                )}
              </ProgressRing>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.9375rem] font-semibold">{challenge.name}</p>
                <p className="mt-0.5 line-clamp-2 text-[0.8125rem] leading-snug text-muted">
                  {challenge.description}
                </p>
              </div>

              {completed && !claimed ? (
                <button
                  type="button"
                  onClick={() => claim(challenge.id)}
                  disabled={pendingId === challenge.id}
                  className="pressable flex flex-shrink-0 items-center gap-1 rounded-full bg-accent px-3.5 py-1.5 text-[0.8125rem] font-semibold text-accent-foreground disabled:opacity-60"
                >
                  <GemIcon className="h-3.5 w-3.5" />
                  {CHALLENGE_COMPLETION_POINTS}
                </button>
              ) : claimed ? (
                <span className="flex-shrink-0 text-[0.8125rem] font-medium text-muted">Claimed</span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
