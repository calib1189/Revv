import { LockIcon, StarIcon } from "@/components/ui/icons";
import { RANK_MATERIAL_ICONS } from "@/features/garage/rank-material-icons";
import { achievementColor, type AchievementDef } from "@/lib/achievements/catalog";
import { formatDateOnly } from "@/lib/format/date";

export function AchievementBadge({
  achievement,
  unlockedAt,
}: {
  achievement: AchievementDef;
  /** Undefined means locked — still shown (grayed, with a lock glyph),
   * not hidden, so the trophy case reads as a real checklist rather than
   * only ever showing off what's already done. */
  unlockedAt?: string;
}) {
  const unlocked = unlockedAt != null;
  const color = achievementColor(achievement);
  const Icon = achievement.tier ? RANK_MATERIAL_ICONS[achievement.tier] : null;

  return (
    <div
      className={`glass flex flex-col items-center gap-2 rounded-2xl p-4 text-center transition-opacity ${
        unlocked ? "" : "opacity-45"
      }`}
    >
      <span
        className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl"
        style={{ backgroundColor: unlocked ? `${color}26` : "rgba(255,255,255,0.06)" }}
      >
        {!unlocked ? (
          <LockIcon className="h-6 w-6 text-muted" />
        ) : Icon ? (
          <Icon className="h-10 w-10" />
        ) : (
          <StarIcon className="h-7 w-7" style={{ color }} />
        )}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{achievement.name}</p>
        <p className="mt-0.5 text-xs text-muted">{achievement.description}</p>
        {unlocked && <p className="mt-1 text-[10px] text-muted">{formatDateOnly(unlockedAt)}</p>}
      </div>
    </div>
  );
}
