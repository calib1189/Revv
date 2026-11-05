import type { ReactNode } from "react";
import { LockIcon } from "@/components/ui/icons";
import { AchievementMedal } from "@/features/achievements/achievement-medal";
import type { AchievementDef } from "@/lib/achievements/catalog";
import { formatDateOnly } from "@/lib/format/date";

export function AchievementBadge({
  achievement,
  unlockedAt,
  footer,
}: {
  achievement: AchievementDef;
  /** Undefined means locked — still shown (grayed, with a lock glyph),
   * not hidden, so the trophy case reads as a real checklist rather than
   * only ever showing off what's already done. */
  unlockedAt?: string;
  /** The claim button (a client component) when this achievement is
   * unlocked but unclaimed — passed in rather than owned here so this
   * component can stay a plain server component; see
   * achievements-grid.tsx for where it decides when to pass one. */
  footer?: ReactNode;
}) {
  const unlocked = unlockedAt != null;

  return (
    <div className="glass flex flex-col items-center gap-2 rounded-2xl p-4 text-center">
      {/* Locked medals still show their art, in grey, so the case reads as
          things to go and get rather than a wall of padlocks. */}
      <span className="relative flex-shrink-0">
        <AchievementMedal
          achievement={achievement}
          className={`h-16 w-16 ${unlocked ? "" : "opacity-35 grayscale"}`}
        />
        {!unlocked && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-surface-raised ring-2 ring-background">
            <LockIcon className="h-3 w-3 text-muted" />
          </span>
        )}
      </span>
      <div className={`min-w-0 ${unlocked ? "" : "opacity-60"}`}>
        <p className="truncate text-sm font-semibold">{achievement.name}</p>
        <p className="mt-0.5 text-xs text-muted">{achievement.description}</p>
        {unlocked && <p className="mt-1 text-[10px] text-muted">{formatDateOnly(unlockedAt)}</p>}
      </div>
      {footer}
    </div>
  );
}
