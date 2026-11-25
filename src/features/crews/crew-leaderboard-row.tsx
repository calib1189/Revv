import Link from "next/link";
import { rankForScore, RANK_LABELS, tierColorVar } from "@/lib/rating/rank";
import type { CrewCardData } from "@/features/crews/crew-discover-grid";
import { bannerStyle, crewLook, CrewLogo, CrewName } from "@/features/crews/crew-look";

/** One row of the crew leaderboard, in the same grouped-list language
 * as the main leaderboard's LeaderboardRow — kept as its own component
 * because a crew's shape (logo, member count, no owner) differs enough
 * from a vehicle's. Meant to sit inside a grouped card that draws the
 * hairlines. */
export function CrewLeaderboardRow({ rank, data }: { rank: number; data: CrewCardData }) {
  const { crew, logoUrl, memberCount, bestScore } = data;
  const tier = bestScore != null ? rankForScore(bestScore) : null;
  const look = crewLook(crew);
  const banner = bannerStyle(look);

  return (
    <Link
      href={`/crews/${crew.id}`}
      className="relative flex items-center gap-3 overflow-hidden px-3.5 py-3 transition-colors active:bg-foreground/[0.06]"
    >
      {/* A bought banner washes the row in its colours, with a solid edge
          down the left, so the crew stands out in the list. */}
      {look.banner && (
        <>
          <span aria-hidden className={`pointer-events-none absolute inset-0 opacity-[0.16] ${banner.className}`} style={banner.style} />
          <span aria-hidden className={`pointer-events-none absolute inset-y-0 left-0 w-[3px] ${banner.className}`} style={banner.style} />
        </>
      )}
      <span className={`numeral w-6 flex-shrink-0 text-center text-[0.9375rem] ${rank <= 3 ? "text-accent" : "text-muted"}`}>
        {rank}
      </span>

      <CrewLogo
        crew={crew}
        logoUrl={logoUrl}
        look={look}
        size={48}
        radius={12}
        className="bg-foreground/[0.06]"
        initialClassName="text-lg font-bold text-muted"
      />

      <div className="relative min-w-0 flex-1">
        <p className="truncate text-[0.9375rem] font-semibold">
          <CrewName crew={crew} look={look} />
        </p>
        <p className="mt-0.5 text-[0.8125rem] text-muted">
          <span className="numeral">{memberCount}</span> {memberCount === 1 ? "member" : "members"}
        </p>
      </div>

      <div className="relative flex-shrink-0 text-right">
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
