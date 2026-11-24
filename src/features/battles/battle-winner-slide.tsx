import Link from "next/link";
import { MediaImg } from "@/components/ui/media-img";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { votePercents } from "@/lib/battles/result";
import type { BattleView } from "@/lib/battles/load";

/** Yesterday's Build Battle winner, full screen in the feed for
 * everyone: the reward for winning is being seen. Only for a battle
 * with a winner (not a tie or an empty one). */
export function BattleWinnerSlide({ view, slideHeight }: { view: BattleView; slideHeight: string }) {
  if (!view.result?.winnerId) return null;
  const winner = view.result.winnerId === view.a.vehicleId ? view.a : view.b;
  const loser = winner === view.a ? view.b : view.a;
  const [pa, pb] = votePercents(view.result.a, view.result.b);
  const score = winner === view.a ? `${pa}–${pb}` : `${pb}–${pa}`;

  return (
    <div className={`relative ${slideHeight} w-full flex-shrink-0 snap-start overflow-hidden bg-black`}>
      <MediaImg src={winner.heroUrl} sizes="100vw" className="h-full w-full object-cover" />
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/35 to-black/25" />
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 px-5 pb-[calc(var(--bottom-nav-h)+1.5rem)]">
        <div className="flex items-center gap-2">
          <p className="micro-label text-accent">Yesterday&apos;s Build Battle winner</p>
          {view.result.upset && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wide text-white">
              Upset
            </span>
          )}
        </div>
        <div>
          <h2 className="line-clamp-2 text-balance text-[2rem] font-bold leading-[1.05] tracking-[-0.025em] text-white">
            {winner.title}
          </h2>
          <Link
            href={`/u/${winner.ownerUsername}`}
            className="mt-1.5 inline-flex items-center gap-1 text-[0.875rem] text-white/75"
          >
            @{winner.ownerUsername}
            {winner.ownerIsVerified && <VerifiedBadge onMedia className="h-3.5 w-3.5" />}
          </Link>
        </div>
        <p className="text-[0.9375rem] text-white/85">
          Won <span className="numeral font-semibold text-white">{score}</span> over @{loser.ownerUsername}&apos;s {loser.title}
          {view.result.upset ? ", the higher-scored build." : "."}
        </p>
        <div className="flex items-center gap-3">
          <Link
            href={`/garage/${winner.vehicleId}`}
            className="pressable flex h-12 flex-1 items-center justify-center rounded-full bg-white text-[0.9375rem] font-semibold text-black"
          >
            See the build
          </Link>
          <Link
            href="/battle"
            className="pressable flex h-12 items-center justify-center rounded-full bg-white/15 px-5 text-[0.9375rem] font-semibold text-white backdrop-blur-md"
          >
            Today&apos;s battle
          </Link>
        </div>
      </div>
    </div>
  );
}
