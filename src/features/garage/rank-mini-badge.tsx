import { StarIcon } from "@/components/ui/icons";
import { rankForScore } from "@/lib/rating/rank";

/** Small standalone rank "logo" — a filled animated chip for most tiers,
 * an animated star for cosmic. For spots too small for the full
 * RankFrame treatment, like next to a vehicle tag on a feed slide. */
export function RankMiniBadge({
  score,
  className = "h-4 w-4",
}: {
  score: number | null;
  className?: string;
}) {
  if (score == null) return null;

  const tier = rankForScore(score);

  if (tier === "cosmic") {
    return <StarIcon className={`rank-star ${className}`} aria-label="Cosmic rank" />;
  }

  return (
    <span
      className={`rank-mini rank-${tier} ${className}`}
      role="img"
      aria-label={`${tier} rank`}
    />
  );
}
