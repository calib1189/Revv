import Link from "next/link";
import { RANK_MATERIAL_ICONS } from "@/features/garage/rank-material-icons";
import { rankForScore } from "@/lib/rating/rank";
import type { LeaderboardEntry } from "@/lib/leaderboard/compose-leaderboard";
import { pointsBehind } from "@/lib/leaderboard/tier-groups";

/** The viewer's own standing, pinned directly under the filters — on a
 * board of fifty the first question is always "where am I", and scrolling
 * to find your own highlighted row is a poor answer to it. */
export function ViewerStandingCard({
  rank,
  entry,
  total,
  aheadScore,
}: {
  rank: number;
  entry: LeaderboardEntry;
  total: number;
  /** Score of the build one place above, or null when the viewer leads. */
  aheadScore: number | null;
}) {
  const tier = rankForScore(entry.score);
  const Icon = RANK_MATERIAL_ICONS[tier];
  const gap = aheadScore === null ? null : pointsBehind(aheadScore, entry.score);

  return (
    <Link
      href={`/garage/${entry.vehicleId}`}
      className="pressable glass-raised elev-1 flex items-center gap-3 rounded-[18px] px-3.5 py-2.5"
    >
      <Icon className="h-9 w-9 flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="micro-label text-muted">Your position</p>
        <p className="mt-0.5 truncate text-[0.9375rem] font-semibold">{entry.vehicleTitle}</p>
        <p className="mt-0.5 truncate text-[0.75rem] text-muted">
          {gap === null ? (
            "Leading the board"
          ) : gap === 0 ? (
            <>Tied with No.&nbsp;{rank - 1}</>
          ) : (
            <>
              <span className="numeral text-foreground">{gap.toFixed(2)}</span> behind No.&nbsp;{rank - 1}
            </>
          )}
        </p>
      </div>
      <div className="flex-shrink-0 text-right">
        <p className="numeral text-[1.125rem] leading-none">
          <span className="text-[0.75rem] text-muted">No.&nbsp;</span>
          {rank}
        </p>
        <p className="numeral mt-1 text-[0.6875rem] text-muted">of {total}</p>
      </div>
    </Link>
  );
}
