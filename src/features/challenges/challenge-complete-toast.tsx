"use client";

import { useEffect, useState } from "react";
import { CheckIcon } from "@/components/ui/icons";
import { hapticLanding } from "@/lib/haptics";
import type { ChallengeDef } from "@/lib/challenges/catalog";

const TOAST_DURATION_MS = 3500;

/** Same queue-and-celebrate shape as AchievementUnlockToast — see that
 * component for why the queue pattern exists. `challenges` only ever
 * contains something on the exact page load where the completion was
 * newly recorded (lib/challenges/progress.ts); a refresh gets an empty
 * array back. */
export function ChallengeCompleteToast({ challenges }: { challenges: ChallengeDef[] }) {
  const [queue, setQueue] = useState(challenges);
  const current = queue[0] ?? null;

  useEffect(() => {
    if (!current) return;
    hapticLanding();
    const timer = setTimeout(() => setQueue((q) => q.slice(1)), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [current]);

  if (!current) return null;

  return (
    // Offset below AchievementUnlockToast's own top-4 position — both can
    // fire on the same page load (e.g. a post that both completes
    // Triple Threat and pushes a rating past a new tier), and stacking
    // at the same spot would overlap.
    <div className="pointer-events-none fixed inset-x-0 top-20 z-50 flex justify-center px-4">
      <div
        key={current.id}
        className="animate-achievement-toast glass-raised pointer-events-none flex items-center gap-3 rounded-2xl px-4 py-3 shadow-lg"
      >
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
          <CheckIcon className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            Challenge complete
          </p>
          <p className="truncate text-sm font-bold">{current.name}</p>
        </div>
      </div>
    </div>
  );
}
