import { RANK_MATERIAL_ICONS } from "@/features/garage/rank-material-icons";
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
  hideBadge,
  className = "",
  children,
}: {
  score: number | null;
  compact?: boolean;
  hideBadge?: boolean;
  className?: string;
  children: ReactNode;
}) {
  if (score == null) return <>{children}</>;

  const tier = rankForScore(score);
  const Icon = RANK_MATERIAL_ICONS[tier];

  return (
    <div
      className={`rank-frame rank-${tier} ${compact ? "rank-frame-compact" : ""} ${className}`}
    >
      {children}
      <span aria-hidden className="rank-glint" />
      {!hideBadge && (
        <div
          className={`rank-badge ${compact ? "text-[0.65rem]" : ""}`}
          style={{
            background: RANK_BADGE_COLORS[tier],
            color: RANK_BADGE_TEXT_COLORS[tier],
          }}
        >
          <Icon className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
          {RANK_LABELS[tier]} · {score.toFixed(2)}
        </div>
      )}
    </div>
  );
}
