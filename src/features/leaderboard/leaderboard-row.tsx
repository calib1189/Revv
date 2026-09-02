import Link from "next/link";
import Image from "next/image";
import { Avatar } from "@/features/feed/avatar";
import { RankFrame } from "@/features/garage/rank-frame";
import { VEHICLE_CATEGORY_LABELS } from "@/lib/vehicles/category";
import { rankForScore, RANK_LABELS, RANK_TEXT_COLORS } from "@/lib/rating/rank";
import type { LeaderboardEntry } from "@/lib/leaderboard/compose-leaderboard";

// Top 3 get a filled position badge instead of plain number text — a
// visual podium, not a purely numeric list. Deliberately not gold/
// silver/bronze-colored: that palette is already the rank *tier*'s own
// vocabulary (RANK_TEXT_COLORS.gold etc.), and reusing it for finishing
// position too would make a #2 Cosmic build's badge fight its own ring
// for what "gold" is supposed to mean here.
const PODIUM_STYLES: Record<number, string> = {
  1: "bg-accent text-accent-foreground",
  2: "bg-white/20 text-foreground",
  3: "bg-white/10 text-foreground",
};

export function LeaderboardRow({
  rank,
  entry,
  showCategory = false,
}: {
  rank: number;
  entry: LeaderboardEntry;
  /** Shows a small category badge next to the owner handle — only makes
   * sense on the combined "All" view, where rows span multiple
   * categories; a single-category board would just repeat the same tag
   * on every row. */
  showCategory?: boolean;
}) {
  const tier = rankForScore(entry.score);
  const tierColor = RANK_TEXT_COLORS[tier];
  const podiumStyle = PODIUM_STYLES[rank];

  return (
    <Link
      href={`/garage/${entry.vehicleId}`}
      className="glass flex items-center gap-3 rounded-2xl p-3 transition-colors hover:brightness-110"
    >
      {podiumStyle ? (
        <span
          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${podiumStyle}`}
        >
          {rank}
        </span>
      ) : (
        <span className="w-8 flex-shrink-0 text-center text-sm font-semibold text-muted">{rank}</span>
      )}

      <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-surface">
        {entry.heroUrl && (
          <Image src={entry.heroUrl} alt="" fill sizes="56px" className="object-cover" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{entry.vehicleTitle}</p>
        <div className="mt-1 flex items-center gap-1.5">
          <RankFrame score={entry.score} compact hideBadge className="rounded-full">
            <Avatar
              username={entry.ownerUsername}
              avatarUrl={entry.ownerAvatarUrl}
              className="h-6 w-6 text-[10px]"
            />
          </RankFrame>
          <span className="truncate text-xs text-muted">@{entry.ownerUsername}</span>
          {showCategory && (
            <span className="glass flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium text-muted">
              {VEHICLE_CATEGORY_LABELS[entry.category]}
            </span>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 text-right">
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: tierColor }}>
          {RANK_LABELS[tier]}
        </p>
        <p className="text-sm font-semibold tabular-nums">{entry.score.toFixed(2)}</p>
      </div>
    </Link>
  );
}
