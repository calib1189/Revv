import Link from "next/link";
import Image from "next/image";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { RANK_MATERIAL_ICONS } from "@/features/garage/rank-material-icons";
import { VEHICLE_CATEGORY_LABELS } from "@/lib/vehicles/category";
import { rankForScore, RANK_LABELS, RANK_TEXT_COLORS, type RankTier } from "@/lib/rating/rank";
import type { LeaderboardEntry } from "@/lib/leaderboard/compose-leaderboard";
import type { RankMovement } from "@/lib/leaderboard/movement";
import { MY_ROW_ID } from "@/lib/leaderboard/my-row";
import { MovementTag } from "@/features/leaderboard/movement-tag";

/** Every podium card shares one anatomy, at two scales: the photograph
 * full-bleed, the place as a numeral in the tier's colour top left, and
 * along the bottom the build on the left and its score on the right, over
 * a deep scrim. The tier's own animated rule (.rank-line, globals.css)
 * is the card's bottom edge. The photo carries the card; there is no
 * separate info bar under it. */

/** The tier's rule, pinned to the card's bottom edge. Wrapped because
 * .rank-line sets its own position. */
function RankEdge({ tier }: { tier: RankTier }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0">
      <div className={`rank-line rank-line-${tier}`} />
    </div>
  );
}

/** The place numeral, top left. Shaded on its own because cars are shot
 * against bright sky as often as anything else. */
function PlaceNumeral({
  place,
  color,
  className,
  size,
  movement,
  isViewer,
}: {
  place: number;
  color: string;
  /** Position of the numeral group. */
  className: string;
  /** Font size of the numeral itself. */
  size: string;
  movement: RankMovement | undefined;
  isViewer: boolean;
}) {
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/55 to-transparent" />
      <div className={`absolute flex items-center gap-2 ${className}`}>
        <span
          aria-label={`Number ${place}`}
          className={`numeral leading-none ${size}`}
          style={{ color, textShadow: "0 2px 18px rgb(0 0 0 / 0.6)" }}
        >
          {place}
        </span>
        <MovementTag movement={movement} onMedia />
        {isViewer && (
          <span className="rounded-full bg-accent px-1.5 py-0.5 text-[0.625rem] font-bold uppercase tracking-[0.06em] text-white">
            You
          </span>
        )}
      </div>
    </>
  );
}

/** First place: the page's photograph. Sits in a soft shadow of its own
 * tier colour, so the board looks different the day someone new takes
 * the top spot. */
export function LeaderboardHeroCard({
  entry,
  priority = true,
  movement,
  isViewer = false,
}: {
  entry: LeaderboardEntry;
  priority?: boolean;
  movement?: RankMovement;
  isViewer?: boolean;
}) {
  const tier = rankForScore(entry.score);
  const Icon = RANK_MATERIAL_ICONS[tier];
  const tierColor = RANK_TEXT_COLORS[tier];

  return (
    <div
      id={isViewer ? MY_ROW_ID : undefined}
      className="relative scroll-mt-24 rounded-[28px]"
      style={{ boxShadow: `0 24px 60px -30px ${tierColor}73` }}
    >
      <Link
        href={`/garage/${entry.vehicleId}`}
        className="pressable group relative block overflow-hidden rounded-[28px] bg-neutral-950 elev-3"
      >
        {/* 5:6 on a phone: the page's big photograph, with the score
            still on the first screen. */}
        <div className="relative aspect-[5/6] w-full sm:aspect-[16/10]">
          {entry.heroUrl && (
            <Image
              src={entry.heroUrl}
              alt=""
              fill
              priority={priority}
              sizes="(min-width: 640px) 672px, 100vw"
              className="object-cover transition-transform duration-[900ms] ease-[var(--ease-ios)] group-hover:scale-[1.035]"
            />
          )}
          <PlaceNumeral
            place={1}
            color={tierColor}
            className="left-5 top-4 sm:left-7 sm:top-6"
            size="text-[3.5rem]"
            movement={movement}
            isViewer={isViewer}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-black/90 via-black/45 to-transparent" />

          <div className="absolute inset-x-0 bottom-0 flex items-end gap-4 px-5 pb-6 sm:px-7 sm:pb-8">
            <div className="min-w-0 flex-1">
              <p className="micro-label" style={{ color: tierColor }}>
                {VEHICLE_CATEGORY_LABELS[entry.category]}
              </p>
              <h3 className="mt-1.5 line-clamp-2 text-[1.75rem] font-bold leading-[1.05] tracking-[-0.025em] text-white sm:text-[2.5rem]">
                {entry.vehicleTitle}
              </h3>
              <p className="mt-1.5 flex items-center gap-1 text-[0.875rem] text-white/70">
                <span className="truncate">@{entry.ownerUsername}</span>
                {entry.ownerIsVerified && <VerifiedBadge onMedia className="h-3.5 w-3.5 flex-shrink-0" />}
              </p>
            </div>
            <div className="flex-shrink-0 text-right">
              <p className="numeral text-[2.75rem] leading-[0.9] text-white sm:text-[3.5rem]">{entry.score.toFixed(2)}</p>
              <p className="mt-2 flex items-center justify-end gap-1.5">
                <Icon className="h-4 w-4" />
                <span className="micro-label" style={{ color: tierColor }}>
                  {RANK_LABELS[tier]}
                </span>
              </p>
            </div>
          </div>
          <RankEdge tier={tier} />
        </div>
      </Link>
    </div>
  );
}

/** Second to fifth place, a 2×2 grid under the hero: the same anatomy at
 * half the scale, so the top five read as one podium. */
export function LeaderboardRunnerUpCard({
  rank,
  entry,
  movement,
  isViewer = false,
}: {
  rank: number;
  entry: LeaderboardEntry;
  movement?: RankMovement;
  isViewer?: boolean;
}) {
  const tier = rankForScore(entry.score);
  const Icon = RANK_MATERIAL_ICONS[tier];
  const tierColor = RANK_TEXT_COLORS[tier];

  return (
    <Link
      href={`/garage/${entry.vehicleId}`}
      id={isViewer ? MY_ROW_ID : undefined}
      className="pressable group relative block scroll-mt-24 overflow-hidden rounded-[22px] bg-neutral-950 elev-2"
    >
      <div className="relative aspect-[3/4] w-full">
        {entry.heroUrl && (
          <Image
            src={entry.heroUrl}
            alt=""
            fill
            sizes="(min-width: 640px) 330px, 50vw"
            className="object-cover transition-transform duration-[900ms] ease-[var(--ease-ios)] group-hover:scale-[1.04]"
          />
        )}
        <PlaceNumeral
          place={rank}
          color={tierColor}
          className="left-3.5 top-2.5"
          size="text-[2.5rem]"
          movement={movement}
          isViewer={isViewer}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 px-3.5 pb-4">
          <div className="flex items-baseline gap-2">
            <p className="min-w-0 flex-1 truncate text-[0.9375rem] font-bold tracking-[-0.01em] text-white">
              {entry.vehicleTitle}
            </p>
            <span className="numeral flex-shrink-0 text-[1.125rem] leading-none text-white">
              {entry.score.toFixed(2)}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <p className="flex min-w-0 flex-1 items-center gap-1 text-[0.75rem] text-white/65">
              <span className="truncate">@{entry.ownerUsername}</span>
              {entry.ownerIsVerified && <VerifiedBadge onMedia className="h-3 w-3 flex-shrink-0" />}
            </p>
            {/* The gem, not the word: "Diamond" is twice the width of
                "Ruby" and would squeeze the owner's name on a half-width
                card. The numeral and the edge carry the colour too. */}
            <Icon className="h-4 w-4 flex-shrink-0" />
            <span className="sr-only">{RANK_LABELS[tier]}</span>
          </div>
        </div>
        <RankEdge tier={tier} />
      </div>
    </Link>
  );
}
