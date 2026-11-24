import Link from "next/link";
import Image from "next/image";
import { VEHICLE_CATEGORY_LABELS } from "@/lib/vehicles/category";
import { rankForScore, RANK_LABELS, tierColorVar } from "@/lib/rating/rank";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import type { LeaderboardEntry } from "@/lib/leaderboard/compose-leaderboard";
import type { RankMovement } from "@/lib/leaderboard/movement";
import { MovementTag } from "@/features/leaderboard/movement-tag";
import { MY_ROW_ID } from "@/lib/leaderboard/my-row";

/** One row of the board below the podium — a GroupedList-style row:
 * rank, thumbnail, name over owner, score. The tier isn't repeated per
 * row: the board groups rows by tier under one heading each (see
 * groupByTier). Owner and category
 * share one truncating line so nothing collides at 375px. Meant to sit
 * inside a grouped card (see LeaderboardPageContent), which draws the
 * inset hairlines between rows.
 *
 * The thumbnail carries a hairline in the build's tier colour — at 48px
 * a full rank frame is illegible, but the edge is enough for the column
 * of photos to read as ranked rather than as a list of thumbnails. */
export function LeaderboardRow({
  rank,
  entry,
  showCategory = false,
  highlight = false,
  showTier = false,
  movement,
}: {
  rank: number;
  entry: LeaderboardEntry;
  /** Only meaningful on the combined "All" board — a single-category
   * board would repeat the same tag on every row. */
  showCategory?: boolean;
  /** The viewer's own build. Tints the row so they can find themselves
   * without reading every line. */
  highlight?: boolean;
  /** Names the tier under the score, for lists that aren't grouped
   * under tier headings (the home page's preview of the board). */
  showTier?: boolean;
  /** Places moved since yesterday; nothing shown when it held its place. */
  movement?: RankMovement;
}) {
  const tier = rankForScore(entry.score);

  return (
    <Link
      href={`/garage/${entry.vehicleId}`}
      id={highlight ? MY_ROW_ID : undefined}
      className={`relative flex scroll-mt-24 items-center gap-3 px-3.5 py-3 transition-colors active:bg-foreground/[0.06] ${
        highlight ? "bg-accent/[0.07]" : ""
      }`}
    >
      <span className="flex w-6 flex-shrink-0 flex-col items-center gap-1">
        <span className="numeral text-[0.9375rem] leading-none text-muted">{rank}</span>
        <MovementTag movement={movement} />
      </span>

      <div
        className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-[12px] bg-foreground/[0.06]"
        style={{ boxShadow: `inset 0 0 0 1.5px color-mix(in srgb, ${tierColorVar(tier)} 55%, transparent)` }}
      >
        {entry.heroUrl && (
          <Image src={entry.heroUrl} alt="" fill sizes="48px" className="object-cover" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.9375rem] font-semibold">
          {entry.vehicleTitle}
          {highlight && <span className="ml-1.5 text-[0.75rem] font-semibold text-accent">You</span>}
        </p>
        <p className="mt-0.5 truncate text-[0.8125rem] text-muted">
          @{entry.ownerUsername}
          {entry.ownerIsVerified && <VerifiedBadge className="ml-1 h-3 w-3 align-[-0.1em]" />}
          {showCategory && ` · ${VEHICLE_CATEGORY_LABELS[entry.category]}`}
        </p>
      </div>

      <div className="flex-shrink-0 text-right">
        <p className="numeral text-[1.125rem] leading-none">{entry.score.toFixed(2)}</p>
        {showTier && (
          <p className="micro-label mt-1" style={{ color: tierColorVar(tier) }}>
            {RANK_LABELS[tier]}
          </p>
        )}
      </div>
    </Link>
  );
}
