import Link from "next/link";
import Image from "next/image";
import { VEHICLE_CATEGORY_LABELS } from "@/lib/vehicles/category";
import { rankForScore, RANK_LABELS, tierColorVar } from "@/lib/rating/rank";
import type { LeaderboardEntry } from "@/lib/leaderboard/compose-leaderboard";

/** One row of the board below the podium — a GroupedList-style row:
 * rank, thumbnail, name over owner, score over tier. Owner and category
 * share one truncating line so nothing collides at 375px. Meant to sit
 * inside a grouped card (see LeaderboardPageContent), which draws the
 * inset hairlines between rows. */
export function LeaderboardRow({
  rank,
  entry,
  showCategory = false,
}: {
  rank: number;
  entry: LeaderboardEntry;
  /** Only meaningful on the combined "All" board — a single-category
   * board would repeat the same tag on every row. */
  showCategory?: boolean;
}) {
  const tier = rankForScore(entry.score);

  return (
    <Link
      href={`/garage/${entry.vehicleId}`}
      className="relative flex items-center gap-3 px-3.5 py-3 transition-colors active:bg-foreground/[0.06]"
    >
      <span className="numeral w-6 flex-shrink-0 text-center text-[0.9375rem] text-muted">{rank}</span>

      <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-[12px] bg-foreground/[0.06]">
        {entry.heroUrl && (
          <Image src={entry.heroUrl} alt="" fill sizes="48px" className="object-cover" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.9375rem] font-semibold">{entry.vehicleTitle}</p>
        <p className="mt-0.5 truncate text-[0.8125rem] text-muted">
          @{entry.ownerUsername}
          {showCategory && ` · ${VEHICLE_CATEGORY_LABELS[entry.category]}`}
        </p>
      </div>

      <div className="flex-shrink-0 text-right">
        <p className="numeral text-[1.125rem] leading-none">{entry.score.toFixed(2)}</p>
        <p className="micro-label mt-1" style={{ color: tierColorVar(tier) }}>
          {RANK_LABELS[tier]}
        </p>
      </div>
    </Link>
  );
}
