import Link from "next/link";
import { MediaImg } from "@/components/ui/media-img";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { RANK_MATERIAL_ICONS } from "@/features/garage/rank-material-icons";
import { rankForScore, RANK_LABELS, RANK_TEXT_COLORS } from "@/lib/rating/rank";
import { relativeTime } from "@/lib/format/relative-time";
import type { JustRatedSlideData } from "@/lib/feed/just-rated";

/** A car SORZA rated in the last few days, between posts in the feed
 * (swipe-feed.tsx), or one of the top builds a new viewer's feed opens
 * on (topPlace set). Same anatomy as a leaderboard podium card: the
 * photo, then the tier's own rule, then an opaque plinth with tier,
 * place and score. Labelled for what it is, a score, never dressed up
 * as someone's post: no like or comment rail. */
export function JustRatedSlide({ data, slideHeight }: { data: JustRatedSlideData; slideHeight: string }) {
  const tier = rankForScore(data.score);
  const Icon = RANK_MATERIAL_ICONS[tier];
  const tierColor = RANK_TEXT_COLORS[tier];

  return (
    <div className={`relative ${slideHeight} w-full flex-shrink-0 snap-start overflow-hidden bg-black`}>
      <MediaImg src={data.heroUrl} sizes="100vw" className="h-full w-full object-cover" />
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/35 to-black/25" />

      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 px-5 pb-6">
        <p className="micro-label" style={{ color: tierColor }} suppressHydrationWarning>
          {data.topPlace ? `No. ${data.topPlace} on SORZA` : `Just rated · ${relativeTime(data.ratedAt)}`}
        </p>
        <div>
          <h2 className="line-clamp-2 text-balance text-[2rem] font-bold leading-[1.05] tracking-[-0.025em] text-white">
            {data.title}
          </h2>
          <Link
            href={`/u/${data.ownerUsername}`}
            className="mt-1.5 inline-flex items-center gap-1 text-[0.875rem] text-white/75"
          >
            @{data.ownerUsername}
            {data.ownerIsVerified && <VerifiedBadge onMedia className="h-3.5 w-3.5" />}
          </Link>
        </div>

        <Link href={`/garage/${data.vehicleId}`} className="pressable mt-1 block overflow-hidden rounded-[20px]">
          <div className={`rank-line rank-line-${tier}`} aria-hidden />
          <div className="flex items-center gap-3 bg-[#08080a] px-4 py-3.5 text-white">
            <Icon className="h-10 w-10 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="micro-label" style={{ color: tierColor }}>
                {RANK_LABELS[tier]}
              </p>
              <p className="numeral mt-0.5 text-xs text-white/60">
                No. {data.rank} of {data.boardSize} on the board
              </p>
            </div>
            <span className="numeral text-[1.875rem] leading-none">{data.score.toFixed(2)}</span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href={`/garage/${data.vehicleId}`}
            className="pressable flex h-12 flex-1 items-center justify-center rounded-full bg-white text-[0.9375rem] font-semibold text-black"
          >
            See the build
          </Link>
          <Link
            href="/leaderboard"
            className="pressable flex h-12 items-center justify-center rounded-full bg-white/15 px-5 text-[0.9375rem] font-semibold text-white backdrop-blur-md"
          >
            Leaderboard
          </Link>
        </div>
      </div>
    </div>
  );
}
