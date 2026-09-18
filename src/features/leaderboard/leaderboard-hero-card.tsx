import Link from "next/link";
import Image from "next/image";
import { ChevronRightIcon } from "@/components/ui/icons";
import { RANK_MATERIAL_ICONS } from "@/features/garage/rank-material-icons";
import { VEHICLE_CATEGORY_LABELS } from "@/lib/vehicles/category";
import { rankForScore, RANK_LABELS, RANK_TEXT_COLORS } from "@/lib/rating/rank";
import type { LeaderboardEntry } from "@/lib/leaderboard/compose-leaderboard";

/** First place, presented as a feature card: the car full-bleed and
 * tall, a "No. 1" eyebrow and the name over a top scrim, and a frosted
 * score bar along the bottom — the same language as the garage's
 * vehicle cards, so the top of the board reads as the thing to chase. */
export function LeaderboardHeroCard({ entry }: { entry: LeaderboardEntry }) {
  const tier = rankForScore(entry.score);
  const Icon = RANK_MATERIAL_ICONS[tier];

  return (
    <Link
      href={`/garage/${entry.vehicleId}`}
      className="pressable group relative flex aspect-[4/5] w-full flex-col overflow-hidden rounded-[28px] bg-neutral-950 elev-3 sm:aspect-[16/10]"
    >
      {entry.heroUrl && (
        <Image
          src={entry.heroUrl}
          alt=""
          fill
          priority
          sizes="(min-width: 640px) 672px, 100vw"
          className="object-cover transition-transform duration-[900ms] ease-[var(--ease-ios)] group-hover:scale-[1.035]"
        />
      )}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-black/70 via-black/20 to-transparent" />

      <div className="relative p-5 sm:p-7">
        <p className="micro-label text-white/80">No. 1 · {VEHICLE_CATEGORY_LABELS[entry.category]}</p>
        <h3 className="mt-1.5 line-clamp-2 text-[1.75rem] font-bold leading-[1.08] tracking-[-0.025em] text-white sm:text-[2.5rem]">
          {entry.vehicleTitle}
        </h3>
        <p className="mt-1 text-[0.875rem] text-white/75">@{entry.ownerUsername}</p>
      </div>

      <div
        className="relative mt-auto flex items-center gap-3 border-t border-white/10 bg-black/35 px-4 py-3 text-white sm:px-6 sm:py-4"
        style={{ WebkitBackdropFilter: "blur(40px) saturate(180%)", backdropFilter: "blur(40px) saturate(180%)" }}
      >
        <Icon className="h-9 w-9 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="micro-label" style={{ color: RANK_TEXT_COLORS[tier] }}>
            {RANK_LABELS[tier]}
          </p>
          <p className="mt-0.5 text-xs text-white/60">Top build</p>
        </div>
        <span className="numeral text-[1.75rem] leading-none">{entry.score.toFixed(2)}</span>
        <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-white/50" />
      </div>
    </Link>
  );
}

/** Second and third place, side by side under the hero card. */
export function LeaderboardRunnerUpCard({ rank, entry }: { rank: number; entry: LeaderboardEntry }) {
  const tier = rankForScore(entry.score);

  return (
    <Link
      href={`/garage/${entry.vehicleId}`}
      className="pressable group relative flex aspect-[3/4] flex-col justify-end overflow-hidden rounded-[22px] bg-neutral-950 elev-2"
    >
      {entry.heroUrl && (
        <Image
          src={entry.heroUrl}
          alt=""
          fill
          sizes="(min-width: 640px) 330px, 50vw"
          className="object-cover transition-transform duration-[900ms] ease-[var(--ease-ios)] group-hover:scale-[1.04]"
        />
      )}
      <div className="photo-scrim pointer-events-none absolute inset-0" />
      <span className="numeral absolute left-3 top-3 flex h-8 min-w-8 items-center justify-center rounded-full bg-black/40 px-2 text-[0.875rem] text-white backdrop-blur-md">
        {rank}
      </span>
      <div className="relative p-3.5">
        <p className="truncate text-[0.9375rem] font-bold tracking-[-0.01em] text-white">{entry.vehicleTitle}</p>
        <p className="truncate text-[0.75rem] text-white/70">@{entry.ownerUsername}</p>
        <div className="mt-2 flex items-baseline justify-between gap-2">
          <span className="micro-label" style={{ color: RANK_TEXT_COLORS[tier] }}>
            {RANK_LABELS[tier]}
          </span>
          <span className="numeral text-[1.125rem] leading-none text-white">{entry.score.toFixed(2)}</span>
        </div>
      </div>
    </Link>
  );
}
