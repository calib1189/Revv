import { GemIcon, StarIcon } from "@/components/ui/icons";
import {
  rankForScore,
  RANK_LABELS,
  RANK_BADGE_COLORS,
  RANK_BADGE_TEXT_COLORS,
} from "@/lib/rating/rank";

/** Inline rank pill for sitting next to text (a username, a heading) —
 * unlike RankFrame's badge this isn't absolutely positioned over a photo. */
export function RankPill({
  score,
  className = "",
}: {
  score: number | null;
  className?: string;
}) {
  if (score == null) return null;

  const tier = rankForScore(score);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}
      style={{ background: RANK_BADGE_COLORS[tier], color: RANK_BADGE_TEXT_COLORS[tier] }}
    >
      {tier === "cosmic" ? (
        <StarIcon className="h-3 w-3" />
      ) : (
        <GemIcon className="h-3 w-3" />
      )}
      {RANK_LABELS[tier]}
    </span>
  );
}
