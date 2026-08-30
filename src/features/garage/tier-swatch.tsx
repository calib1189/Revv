import { RANK_MATERIAL_ICONS } from "@/features/garage/rank-material-icons";
import type { RankTier } from "@/lib/rating/rank";

/** A standalone preview of one tier's animated border and emblem — same
 * CSS classes RankFrame applies to a real photo, just wrapped around the
 * tier's badge art instead of a real photo, so the leaderboard's tier
 * ladder can show off every tier at once without needing a rated build
 * for each one. */
export function TierSwatch({
  tier,
  className = "h-14 w-14",
}: {
  tier: RankTier;
  className?: string;
}) {
  const Icon = RANK_MATERIAL_ICONS[tier];
  return (
    <div className={`rank-frame rank-${tier} rounded-full ${className}`}>
      <div className="flex h-full w-full items-center justify-center rounded-full bg-surface p-1.5">
        <Icon className="h-full w-full" />
      </div>
    </div>
  );
}
