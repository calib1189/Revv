import Image from "next/image";
import Link from "next/link";
import { ChevronRightIcon } from "@/components/ui/icons";
import { RANK_MATERIAL_ICONS } from "@/features/garage/rank-material-icons";
import { rankForScore, RANK_LABELS, RANK_TEXT_COLORS } from "@/lib/rating/rank";
import { getStoreItem } from "@/lib/store/catalog";
import type { Vehicle } from "@/lib/db/vehicles";

function VehicleName({
  title,
  nameColorValue,
  nameColorEffectClassName,
}: {
  title: string;
  nameColorValue?: string;
  nameColorEffectClassName?: string;
}) {
  const isGradient = nameColorValue?.includes("gradient") ?? false;
  const base =
    "line-clamp-2 text-[1.75rem] font-bold leading-[1.08] tracking-[-0.025em] sm:text-[2.5rem]";

  if (isGradient) {
    return (
      <h3
        className={`bg-clip-text text-transparent ${base} ${nameColorEffectClassName ?? ""}`}
        style={{ backgroundImage: nameColorValue }}
      >
        {title}
      </h3>
    );
  }

  return (
    <h3
      className={`${base} ${nameColorValue ? "" : "text-white"} ${nameColorEffectClassName ?? ""}`}
      style={nameColorValue ? { color: nameColorValue } : undefined}
    >
      {title}
    </h3>
  );
}

/** The frosted strip along the bottom of every bay — tier, score, and a
 * chevron that says "this opens." Always over a photo or a backdrop, so
 * it takes the literal RANK_TEXT_COLORS (tuned for dark grounds), not
 * the theme-following --tier-* vars. */
function ScoreBar({ score }: { score: number | null }) {
  const tier = score != null ? rankForScore(score) : null;
  const Icon = tier ? RANK_MATERIAL_ICONS[tier] : null;

  return (
    <div>
      {/* The divider between photo and score is the tier itself: an
          animated rule in the rank's material (.rank-line, globals.css).
          Unrated cars get a plain hairline. */}
      {tier ? (
        <div className={`rank-line rank-line-${tier}`} aria-hidden />
      ) : (
        <div className="h-px bg-white/10" aria-hidden />
      )}
    <div
      className="flex items-center gap-3 bg-black/35 px-4 py-3 text-white backdrop-blur-2xl sm:px-6 sm:py-4"
      style={{ WebkitBackdropFilter: "blur(40px) saturate(180%)", backdropFilter: "blur(40px) saturate(180%)" }}
    >
      {tier && Icon && score != null ? (
        <>
          <Icon className="h-9 w-9 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="micro-label" style={{ color: RANK_TEXT_COLORS[tier] }}>
              {RANK_LABELS[tier]}
            </p>
            <p className="mt-0.5 text-xs text-white/60">Build score</p>
          </div>
          <span className="numeral text-[1.625rem] leading-none">{score.toFixed(2)}</span>
        </>
      ) : (
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Not rated yet</p>
          <p className="mt-0.5 text-xs text-white/60">Open to get your build scored</p>
        </div>
      )}
      <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-white/50" />
    </div>
    </div>
  );
}

/** One car, presented like an editorial feature card: a tall full-bleed
 * photograph, the name set large over a soft top scrim, and a frosted
 * score bar along the bottom. On phones it's portrait (4:5) so the car
 * is the screen; wide screens get a cinematic 16:10.
 *
 * An equipped Garage Backdrop (vehicles.equipped_backdrop) becomes the
 * card's stage: the photo sits inset on it with an even margin, and the
 * frosted bar picks the backdrop's colour up through its blur. */
export function VehicleBay({
  vehicle,
  heroUrl,
  ratingScore = null,
  priority = false,
  nameColorValue,
  nameColorEffectClassName,
}: {
  vehicle: Vehicle;
  heroUrl: string | null;
  ratingScore?: number | null;
  priority?: boolean;
  nameColorValue?: string;
  nameColorEffectClassName?: string;
}) {
  const title = vehicle.nickname || `${vehicle.make} ${vehicle.model}`;
  // Eyebrow above the name. A nicknamed car shows its full identity
  // here; an un-nicknamed one already has make + model as its title, so
  // the eyebrow carries year and trim instead of repeating them.
  const eyebrow = (
    vehicle.nickname
      ? [vehicle.year, vehicle.make, vehicle.model]
      : [vehicle.year, vehicle.trim]
  )
    .filter(Boolean)
    .join(" · ");
  const backdropItem = vehicle.equipped_backdrop ? getStoreItem(vehicle.equipped_backdrop) : undefined;

  const photo = heroUrl ? (
    <Image
      src={heroUrl}
      alt={title}
      fill
      priority={priority}
      sizes="(min-width: 1024px) 960px, 100vw"
      className="object-cover transition-transform duration-[900ms] ease-[var(--ease-ios)] group-hover:scale-[1.035]"
    />
  ) : (
    <div className="flex h-full items-center justify-center bg-neutral-900 text-sm text-white/50">
      No photo yet
    </div>
  );

  return (
    <Link
      href={`/garage/${vehicle.id}`}
      className="pressable group relative flex aspect-[4/5] flex-col overflow-hidden rounded-[28px] bg-neutral-950 elev-3 sm:aspect-[16/10]"
    >
      {backdropItem ? (
        <>
          <div
            className={`absolute inset-0 ${backdropItem.effectClassName ?? ""}`}
            style={{ backgroundImage: backdropItem.value }}
          />
          <div className="relative mx-3 mt-3 min-h-0 flex-1 overflow-hidden rounded-[20px] shadow-[0_12px_32px_-12px_rgb(0_0_0/0.7)] sm:mx-4 sm:mt-4">
            {photo}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-2/3 bg-gradient-to-b from-black/65 via-black/20 to-transparent" />
            <div className="absolute inset-x-0 top-0 p-4 sm:p-6">
              {eyebrow && <p className="micro-label text-white/75">{eyebrow}</p>}
              <div className="mt-1.5">
                <VehicleName
                  title={title}
                  nameColorValue={nameColorValue}
                  nameColorEffectClassName={nameColorEffectClassName}
                />
              </div>
            </div>
          </div>
          <div className="relative mt-3 sm:mt-4">
            <ScoreBar score={ratingScore} />
          </div>
        </>
      ) : (
        <>
          <div className="absolute inset-0">{photo}</div>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-black/65 via-black/20 to-transparent" />
          <div className="relative p-5 sm:p-7">
            {eyebrow && <p className="micro-label text-white/75">{eyebrow}</p>}
            <div className="mt-1.5">
              <VehicleName
                title={title}
                nameColorValue={nameColorValue}
                nameColorEffectClassName={nameColorEffectClassName}
              />
            </div>
          </div>
          <div className="relative mt-auto">
            <ScoreBar score={ratingScore} />
          </div>
        </>
      )}
    </Link>
  );
}
