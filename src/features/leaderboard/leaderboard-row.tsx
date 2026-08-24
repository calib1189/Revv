import Link from "next/link";
import Image from "next/image";
import { Avatar } from "@/features/feed/avatar";
import { RankFrame } from "@/features/garage/rank-frame";
import { VEHICLE_CATEGORY_LABELS } from "@/lib/vehicles/category";
import type { LeaderboardEntry } from "@/lib/leaderboard/compose-leaderboard";

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
  return (
    <Link
      href={`/garage/${entry.vehicleId}`}
      className="glass flex items-center gap-3 rounded-2xl p-3 transition-opacity hover:opacity-90"
    >
      <span
        className={`w-6 flex-shrink-0 text-center text-sm font-semibold ${
          rank === 1 ? "text-accent" : "text-muted"
        }`}
      >
        {rank}
      </span>

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

      <span className="flex-shrink-0 text-sm font-semibold text-accent">
        {Math.round(entry.score)}
      </span>
    </Link>
  );
}
