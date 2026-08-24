import Link from "next/link";
import Image from "next/image";
import { Avatar } from "@/features/feed/avatar";
import { RankFrame } from "@/features/garage/rank-frame";
import type { LeaderboardEntry } from "@/lib/leaderboard/compose-leaderboard";

export function LeaderboardRow({ rank, entry }: { rank: number; entry: LeaderboardEntry }) {
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
        </div>
      </div>

      <span className="flex-shrink-0 text-sm font-semibold text-accent">
        {entry.score.toFixed(1)}
      </span>
    </Link>
  );
}
