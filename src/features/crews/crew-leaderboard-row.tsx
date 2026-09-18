import Link from "next/link";
import Image from "next/image";
import { rankForScore, RANK_LABELS, tierColorVar } from "@/lib/rating/rank";
import type { CrewCardData } from "@/features/crews/crew-discover-grid";

/** One row of the crew leaderboard, in the same grouped-list language
 * as the main leaderboard's LeaderboardRow — kept as its own component
 * because a crew's shape (logo, member count, no owner) differs enough
 * from a vehicle's. Meant to sit inside a grouped card that draws the
 * hairlines. */
export function CrewLeaderboardRow({ rank, data }: { rank: number; data: CrewCardData }) {
  const { crew, logoUrl, memberCount, bestScore } = data;
  const tier = bestScore != null ? rankForScore(bestScore) : null;

  return (
    <Link
      href={`/crews/${crew.id}`}
      className="relative flex items-center gap-3 px-3.5 py-3 transition-colors active:bg-foreground/[0.06]"
    >
      <span className={`numeral w-6 flex-shrink-0 text-center text-[0.9375rem] ${rank <= 3 ? "text-accent" : "text-muted"}`}>
        {rank}
      </span>

      <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-[12px] bg-foreground/[0.06]">
        {logoUrl ? (
          <Image src={logoUrl} alt="" fill sizes="48px" className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-lg font-bold text-muted">
            {crew.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.9375rem] font-semibold">{crew.name}</p>
        <p className="mt-0.5 text-[0.8125rem] text-muted">
          <span className="numeral">{memberCount}</span> {memberCount === 1 ? "member" : "members"}
        </p>
      </div>

      <div className="flex-shrink-0 text-right">
        {tier && bestScore != null ? (
          <>
            <p className="numeral text-[1.125rem] leading-none">{bestScore.toFixed(2)}</p>
            <p className="micro-label mt-1" style={{ color: tierColorVar(tier) }}>
              {RANK_LABELS[tier]}
            </p>
          </>
        ) : (
          <p className="text-[0.8125rem] text-muted">Unrated</p>
        )}
      </div>
    </Link>
  );
}
