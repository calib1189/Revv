"use client";

import { useEffect, useState } from "react";
import { StarIcon } from "@/components/ui/icons";
import { RANK_MATERIAL_ICONS } from "@/features/garage/rank-material-icons";
import { achievementColor, type AchievementDef } from "@/lib/achievements/catalog";
import { hapticLanding } from "@/lib/haptics";

const TOAST_DURATION_MS = 3500;

/** Celebrates whatever the server-side check (lib/achievements/unlock.ts)
 * just newly unlocked — `achievements` only ever contains something on
 * the exact page load where the unlock happened; a refresh of the same
 * page gets an empty array back, since the achievement is already
 * recorded by then. Queues multiple unlocks one at a time rather than
 * stacking them, so a rare "unlocked three tiers at once" moment (a big
 * rating jump) still reads as three distinct celebrations. */
export function AchievementUnlockToast({ achievements }: { achievements: AchievementDef[] }) {
  const [queue, setQueue] = useState(achievements);
  const current = queue[0] ?? null;

  useEffect(() => {
    if (!current) return;
    hapticLanding();
    const timer = setTimeout(() => setQueue((q) => q.slice(1)), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [current]);

  if (!current) return null;

  const color = achievementColor(current);
  const Icon = current.tier ? RANK_MATERIAL_ICONS[current.tier] : null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <div
        key={current.id}
        className="animate-achievement-toast glass-raised pointer-events-none flex items-center gap-3 rounded-2xl px-4 py-3 shadow-lg"
      >
        <span
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: `${color}26` }}
        >
          {Icon ? <Icon className="h-8 w-8" /> : <StarIcon className="h-5 w-5" style={{ color }} />}
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            Achievement unlocked
          </p>
          <p className="truncate text-sm font-bold">{current.name}</p>
        </div>
      </div>
    </div>
  );
}
