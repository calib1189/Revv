import { RANK_MATERIAL_ICONS } from "@/features/garage/rank-material-icons";
import { JumpToMeButton } from "@/features/leaderboard/jump-to-me";
import { rankForScore } from "@/lib/rating/rank";
import type { LeaderboardEntry } from "@/lib/leaderboard/compose-leaderboard";
import { pointsBehind } from "@/lib/leaderboard/tier-groups";

/** The viewer's own standing, pinned directly under the filters — on a
 * board of fifty the first question is always "where am I". Tapping it
 * takes you to your place on the board (your own row still opens the
 * car), with how far you are from the place above. */
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
    <JumpToMeButton className="pressable glass-raised elev-1 flex w-full items-center gap-3 rounded-[18px] px-3.5 py-2.5 text-left">
      <Icon className="h-9 w-9 flex-shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="micro-label block text-muted">Your position</span>
        <span className="mt-0.5 block truncate text-[0.9375rem] font-semibold">{entry.vehicleTitle}</span>
        <span className="mt-0.5 block truncate text-[0.75rem] text-muted">
          {gap === null ? (
            "Leading the board"
          ) : gap === 0 ? (
            <>Tied with No.&nbsp;{rank - 1}</>
          ) : (
            <>
              <span className="numeral text-foreground">{gap.toFixed(2)}</span> behind No.&nbsp;{rank - 1}
            </>
          )}
        </span>
      </span>
      <span className="flex-shrink-0 text-right">
        <span className="numeral block text-[1.125rem] leading-none">
          <span className="text-[0.75rem] text-muted">No.&nbsp;</span>
          {rank}
        </span>
        <span className="numeral mt-1 block text-[0.6875rem] text-muted">of {total}</span>
      </span>
    </JumpToMeButton>
  );
}
