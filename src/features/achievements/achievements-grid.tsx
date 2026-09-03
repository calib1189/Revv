import { AchievementBadge } from "@/features/achievements/achievement-badge";
import { ACHIEVEMENTS } from "@/lib/achievements/catalog";

export function AchievementsGrid({
  unlockedAtById,
}: {
  /** achievement id -> unlocked_at ISO timestamp, for whatever this
   * user has unlocked. Missing id = locked. */
  unlockedAtById: Map<string, string>;
}) {
  const unlockedCount = ACHIEVEMENTS.filter((a) => unlockedAtById.has(a.id)).length;

  return (
    <div>
      <p className="mb-4 text-sm text-muted">
        {unlockedCount} of {ACHIEVEMENTS.length} unlocked
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {ACHIEVEMENTS.map((achievement) => (
          <AchievementBadge
            key={achievement.id}
            achievement={achievement}
            unlockedAt={unlockedAtById.get(achievement.id)}
          />
        ))}
      </div>
    </div>
  );
}
