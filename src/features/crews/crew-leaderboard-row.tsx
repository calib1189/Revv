import Link from "next/link";
import Image from "next/image";
import { rankForScore, RANK_LABELS, RANK_TEXT_COLORS } from "@/lib/rating/rank";
import type { CrewCardData } from "@/features/crews/crew-discover-grid";

/** Same podium-badge treatment as the main leaderboard's LeaderboardRow —
 * deliberately not sharing the component directly, since a crew row's
 * data shape (logo, member count, no owner/category) is different enough
 * that reusing it would mean threading vehicle-shaped fields through a
 * crew. */
const PODIUM_STYLES: Record<number, string> = {
  1: "bg-accent text-accent-foreground",
  2: "bg-white/20 text-foreground",
  3: "bg-white/10 text-foreground",
};

export function CrewLeaderboardRow({ rank, data }: { rank: number; data: CrewCardData }) {
  const { crew, logoUrl, memberCount, bestScore } = data;
  const podiumStyle = PODIUM_STYLES[rank];
  const tier = bestScore != null ? rankForScore(bestScore) : null;

  return (
    <Link
      href={`/crews/${crew.id}`}
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
        {logoUrl && <Image src={logoUrl} alt="" fill sizes="56px" className="object-cover" />}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{crew.name}</p>
        <p className="mt-1 text-xs text-muted">
          {memberCount} {memberCount === 1 ? "member" : "members"}
        </p>
      </div>

      <div className="flex-shrink-0 text-right">
        {tier && bestScore != null ? (
          <>
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: RANK_TEXT_COLORS[tier] }}>
              {RANK_LABELS[tier]}
            </p>
            <p className="text-sm font-semibold tabular-nums">{bestScore.toFixed(2)}</p>
          </>
        ) : (
          <p className="text-xs text-muted">No ratings yet</p>
        )}
      </div>
    </Link>
  );
}
