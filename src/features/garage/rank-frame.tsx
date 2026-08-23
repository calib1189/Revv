import { GemIcon } from "@/components/ui/icons";
import {
  rankForScore,
  RANK_LABELS,
  RANK_BADGE_COLORS,
  RANK_BADGE_TEXT_COLORS,
} from "@/lib/rating/rank";
import type { ReactNode } from "react";

export function RankFrame({
  score,
  compact,
  children,
}: {
  score: number | null;
  compact?: boolean;
  children: ReactNode;
}) {
  if (score == null) return <>{children}</>;

  const tier = rankForScore(score);

  return (
    <div className={`rank-frame rank-${tier} ${compact ? "rank-frame-compact" : ""}`}>
      {children}
      <div
        className={`rank-badge ${compact ? "text-[0.65rem]" : ""}`}
        style={{
          background: RANK_BADGE_COLORS[tier],
          color: RANK_BADGE_TEXT_COLORS[tier],
        }}
      >
        <GemIcon className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
        {RANK_LABELS[tier]} · {score.toFixed(1)}
      </div>
    </div>
  );
}
