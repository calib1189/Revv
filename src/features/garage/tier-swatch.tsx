import type { RankTier } from "@/lib/rating/rank";

/** A standalone preview of one tier's animated border — same CSS classes
 * RankFrame applies to a real photo, just wrapped around an empty circle
 * so the leaderboard's tier ladder can show off every tier at once without
 * needing a rated build for each one. */
export function TierSwatch({
  tier,
  className = "h-14 w-14",
}: {
  tier: RankTier;
  className?: string;
}) {
  return (
    <div className={`rank-frame rank-${tier} rounded-full ${className}`}>
      <div className="h-full w-full rounded-full bg-surface" />
    </div>
  );
}
