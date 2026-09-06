import { AchievementBadge } from "@/features/achievements/achievement-badge";
import { AchievementClaimButton } from "@/features/achievements/achievement-claim-button";
import { ACHIEVEMENTS } from "@/lib/achievements/catalog";
import { pointsForAchievement } from "@/lib/points/values";

export function AchievementsGrid({
  unlockedAtById,
  claimedAtById,
}: {
  /** achievement id -> unlocked_at ISO timestamp, for whatever this
   * user has unlocked. Missing id = locked. */
  unlockedAtById: Map<string, string>;
  /** achievement id -> claimed_at ISO timestamp. Only meaningful for an
   * id that's also in unlockedAtById — an unlocked id missing from here
   * still has points sitting unclaimed. Omitted entirely on someone
   * else's profile (a visitor doesn't get a claim button on a stranger's
   * unclaimed points). */
  claimedAtById?: Map<string, string>;
}) {
  const unlockedCount = ACHIEVEMENTS.filter((a) => unlockedAtById.has(a.id)).length;

  return (
    <div>
      <p className="mb-4 text-sm text-muted">
        {unlockedCount} of {ACHIEVEMENTS.length} unlocked
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {ACHIEVEMENTS.map((achievement) => {
          const unlockedAt = unlockedAtById.get(achievement.id);
          const canClaim =
            claimedAtById != null && unlockedAt != null && !claimedAtById.has(achievement.id);

          return (
            <AchievementBadge
              key={achievement.id}
              achievement={achievement}
              unlockedAt={unlockedAt}
              footer={
                canClaim ? (
                  <AchievementClaimButton
                    achievementId={achievement.id}
                    points={pointsForAchievement(achievement.id)}
                  />
                ) : undefined
              }
            />
          );
        })}
      </div>
    </div>
  );
}
