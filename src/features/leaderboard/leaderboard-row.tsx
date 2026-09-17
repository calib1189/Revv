import Link from "next/link";
import Image from "next/image";
import { VEHICLE_CATEGORY_LABELS } from "@/lib/vehicles/category";
import { rankForScore, RANK_LABELS, RANK_TEXT_COLORS } from "@/lib/rating/rank";
import type { LeaderboardEntry } from "@/lib/leaderboard/compose-leaderboard";

/** One row of the dense board below the #1 podium card
 * (leaderboard-hero-card.tsx).
 *
 * The owner used to appear here as an avatar in its own rank ring, plus
 * a handle, plus a category chip — three separate elements competing for
 * the ~150px the middle column actually gets at 375px, which collapsed
 * the handle to "@ca…" and overlapped the chip into the avatar. Owner and
 * category are one truncating text line now: the same information, in
 * the space that exists, on the screen size most people are using. */
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
      className="glass elev-1 flex items-center gap-3 rounded-2xl p-2.5 transition-colors hover:brightness-110"
    >
      <span className="numeral w-7 flex-shrink-0 text-center text-base text-muted">{rank}</span>

      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-surface">
        {entry.heroUrl && (
          <Image src={entry.heroUrl} alt="" fill sizes="64px" className="object-cover" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{entry.vehicleTitle}</p>
        <p className="mt-0.5 truncate text-xs text-muted">
          @{entry.ownerUsername}
          {showCategory && ` · ${VEHICLE_CATEGORY_LABELS[entry.category]}`}
        </p>
      </div>

      <div className="flex-shrink-0 pr-1 text-right">
        <p className="numeral text-xl leading-none">{entry.score.toFixed(2)}</p>
        <p className="micro-label mt-1" style={{ color: RANK_TEXT_COLORS[tier] }}>
          {RANK_LABELS[tier]}
        </p>
      </div>
    </Link>
  );
}
