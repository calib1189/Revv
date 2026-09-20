import Link from "next/link";
import Image from "next/image";
import { ChevronRightIcon } from "@/components/ui/icons";
import { RANK_MATERIAL_ICONS } from "@/features/garage/rank-material-icons";
import { VEHICLE_CATEGORY_LABELS } from "@/lib/vehicles/category";
import { rankForScore, RANK_LABELS, RANK_TEXT_COLORS } from "@/lib/rating/rank";
import type { LeaderboardEntry } from "@/lib/leaderboard/compose-leaderboard";

/** Every podium card shares one anatomy: photograph, then the tier's own
 * animated rule (.rank-line, globals.css), then a solid plinth carrying
 * tier and score. The plinth is opaque near-black rather than the frosted
 * black/35 the garage bays use — over a bright daylight shot a translucent
 * bar blurs up into flat grey, which is exactly what made the old board
 * look washed out. Opaque also lets the rank line above it read as a
 * material edge rather than a seam. */
function Plinth({
  tier,
  children,
  className = "",
}: {
  tier: ReturnType<typeof rankForScore>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <>
      <div className={`rank-line rank-line-${tier}`} aria-hidden />
      <div className={`flex items-center bg-[#08080a] text-white ${className}`}>{children}</div>
    </>
  );
}

/** First place, presented as a feature card: the car full-bleed and tall,
 * a "No. 1" eyebrow in the tier's colour and the name over a top scrim,
 * and the tier plinth along the bottom — the same language as the garage's
 * vehicle bays, so the top of the board reads as the thing to chase. The
 * card sits in a soft halo of its own tier colour, which is the page's
 * only real flourish and the reason the board looks different the day
 * someone new takes the top spot. */
export function LeaderboardHeroCard({ entry }: { entry: LeaderboardEntry }) {
  const tier = rankForScore(entry.score);
  const Icon = RANK_MATERIAL_ICONS[tier];
  const tierColor = RANK_TEXT_COLORS[tier];

  return (
    <div className="relative rounded-[28px]" style={{ boxShadow: `0 22px 60px -28px ${tierColor}66` }}>
      <Link
        href={`/garage/${entry.vehicleId}`}
        className="pressable group relative flex w-full flex-col overflow-hidden rounded-[28px] bg-neutral-950 elev-3"
      >
        <div className="relative aspect-[4/5] w-full sm:aspect-[16/10]">
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
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-black/75 via-black/25 to-transparent" />

          <div className="absolute inset-x-0 top-0 p-5 sm:p-7">
            <p className="micro-label" style={{ color: tierColor }}>
              No. 1 · {VEHICLE_CATEGORY_LABELS[entry.category]}
            </p>
            <h3 className="mt-1.5 line-clamp-2 text-[1.75rem] font-bold leading-[1.08] tracking-[-0.025em] text-white sm:text-[2.5rem]">
              {entry.vehicleTitle}
            </h3>
            <p className="mt-1 text-[0.875rem] text-white/70">@{entry.ownerUsername}</p>
          </div>
        </div>

        <Plinth tier={tier} className="gap-3 px-4 py-3.5 sm:px-6 sm:py-4">
          <Icon className="h-10 w-10 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="micro-label" style={{ color: tierColor }}>
              {RANK_LABELS[tier]}
            </p>
            <p className="mt-0.5 text-xs text-white/55">Top build</p>
          </div>
          <span className="numeral text-[1.875rem] leading-none">{entry.score.toFixed(2)}</span>
          <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-white/40" />
        </Plinth>
      </Link>
    </div>
  );
}

/** Second and third place, side by side under the hero — the same three
 * parts at half the scale, so the podium reads as one object. The rank is
 * set as a large numeral in the tier's colour rather than a pill: a grey
 * bubble over a photograph looks like a placeholder avatar. */
export function LeaderboardRunnerUpCard({ rank, entry }: { rank: number; entry: LeaderboardEntry }) {
  const tier = rankForScore(entry.score);
  const tierColor = RANK_TEXT_COLORS[tier];

  return (
    <Link
      href={`/garage/${entry.vehicleId}`}
      className="pressable group flex flex-col overflow-hidden rounded-[22px] bg-neutral-950 elev-2"
    >
      <div className="relative aspect-[4/5] w-full">
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
        {/* .photo-scrim is bottom-weighted, so the rank numeral needs its
            own patch of shade — #2 and #3 are as often shot against bright
            sky as against anything else. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/60 to-transparent" />

        <span
          className="numeral absolute left-3 top-1.5 text-[2.5rem] leading-none"
          style={{ color: tierColor, textShadow: "0 2px 16px rgb(0 0 0 / 0.75)" }}
        >
          {rank}
        </span>

        <div className="absolute inset-x-0 bottom-0 p-3">
          <p className="truncate text-[0.9375rem] font-bold tracking-[-0.01em] text-white">
            {entry.vehicleTitle}
          </p>
          <p className="truncate text-[0.75rem] text-white/65">@{entry.ownerUsername}</p>
        </div>
      </div>

      <Plinth tier={tier} className="justify-between gap-2 px-3 py-2.5">
        <span className="micro-label truncate" style={{ color: tierColor }}>
          {RANK_LABELS[tier]}
        </span>
        <span className="numeral text-[1.125rem] leading-none">{entry.score.toFixed(2)}</span>
      </Plinth>
    </Link>
  );
}
