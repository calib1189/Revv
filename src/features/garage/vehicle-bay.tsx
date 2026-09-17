import Image from "next/image";
import Link from "next/link";
import { RankFrame } from "@/features/garage/rank-frame";
import { RANK_MATERIAL_ICONS } from "@/features/garage/rank-material-icons";
import { rankForScore, RANK_LABELS, RANK_TEXT_COLORS } from "@/lib/rating/rank";
import { getStoreItem } from "@/lib/store/catalog";
import type { Vehicle } from "@/lib/db/vehicles";

function VehicleName({
  title,
  size,
  nameColorValue,
  nameColorEffectClassName,
}: {
  title: string;
  size: "md" | "xl";
  nameColorValue?: string;
  nameColorEffectClassName?: string;
}) {
  const isGradient = nameColorValue?.includes("gradient") ?? false;
  const sizeClass =
    size === "xl" ? "text-2xl font-bold sm:text-4xl" : "text-xl font-bold sm:text-2xl";

  if (isGradient) {
    return (
      <h3
        className={`truncate bg-clip-text text-transparent ${sizeClass} ${nameColorEffectClassName ?? ""}`}
        style={{ backgroundImage: nameColorValue }}
      >
        {title}
      </h3>
    );
  }

  return (
    <h3
      className={`truncate ${sizeClass} ${nameColorValue ? "" : "text-white"} ${nameColorEffectClassName ?? ""}`}
      style={nameColorValue ? { color: nameColorValue } : undefined}
    >
      {title}
    </h3>
  );
}

/** Fully self-drawn rather than RankFrame's own auto-injected badge —
 * RankFrame's badge always anchors to the bottom-right of the whole
 * frame, which is exactly where a backdrop bay's inset photo sits, so
 * the two would collide. Drawing it ourselves means it can anchor to
 * whichever surface is actually "the car" (the inset photo when a
 * backdrop is equipped, the full bay otherwise) instead. */
function RatingBadge({ score }: { score: number | null }) {
  if (score == null) return null;
  const tier = rankForScore(score);
  const Icon = RANK_MATERIAL_ICONS[tier];
  return (
    <div
      className="absolute right-3 top-3 z-10 flex items-center gap-2 rounded-full px-3 py-1.5 backdrop-blur-md"
      style={{
        background: "rgba(10, 10, 11, 0.72)",
        border: `1px solid ${RANK_TEXT_COLORS[tier]}66`,
        color: RANK_TEXT_COLORS[tier],
      }}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="micro-label">{RANK_LABELS[tier]}</span>
      {/* Same figure the leaderboard shows, so it gets the same
          treatment — a score styled as body text in one place and as a
          readout in another reads as two different numbers. */}
      <span className="numeral text-sm leading-none text-white">{score.toFixed(2)}</span>
    </div>
  );
}

/** The garage, reimagined as a showroom rather than a card directory —
 * one big cinematic bay per car instead of a grid of small tiles. A
 * garage with one beloved build deserves to look like a feature, not
 * a thumbnail; a garage with several gets a scroll through a proper
 * showroom floor instead of a cramped grid. Same self-contained
 * backdrop logic as the old VehicleCard (reads vehicle.equipped_
 * backdrop directly), but the backdrop here fills real cinematic
 * space — a wide 16:10 stage — with the car's own photo sitting on it
 * large enough to actually read as the subject, not a token plate. */
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
  const subtitle = vehicle.nickname
    ? `${vehicle.year ?? ""} ${vehicle.make ?? ""} ${vehicle.model ?? ""}`.trim()
    : vehicle.trim;
  // A nicknamed car's subtitle already opens with the year ("2019
  // Chevrolet Camaro"), so the standalone year line above the name was
  // printing it twice on exactly the cars most likely to have one.
  const showYearLine = Boolean(vehicle.year) && !vehicle.nickname;
  const backdropItem = vehicle.equipped_backdrop ? getStoreItem(vehicle.equipped_backdrop) : undefined;

  // compact rather than the default: the default ring is tuned for a
  // full-bleed, screen-edge hero (border-radius: 0, see the vehicle
  // detail page) — this is a rounded card, and compact's ring radius
  // already matches rounded-2xl exactly.
  return (
    <Link
      href={`/garage/${vehicle.id}`}
      className="group relative block aspect-[16/10] overflow-hidden rounded-2xl bg-surface"
    >
      {backdropItem ? (
        <>
          {/* The scene is the whole stage; the car sits on it as a
              framed photo with an even margin of backdrop showing on
              every side, not just filling the frame — the point of a
              purchased backdrop is the atmosphere around the car. The
              rank ring wraps the photo itself here, not the stage, so
              it still reads as "this car's rank," not "this scene's
              rank." */}
          <div
            className={`absolute inset-0 ${backdropItem.effectClassName ?? ""}`}
            style={{ backgroundImage: backdropItem.value }}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/5" />

          <div className="absolute inset-2 sm:inset-3">
            <RankFrame score={ratingScore} compact hideBadge className="h-full w-full">
              {/* Rounding/clipping live here, not on RankFrame's own
                  wrapper — RankFrame renders no wrapper at all when
                  score is null (just returns its children directly),
                  which was silently dropping rounded-2xl/overflow-hidden
                  for any unrated car and leaving it square-cornered. */}
              <div className="relative h-full w-full overflow-hidden rounded-2xl shadow-lg">
                {heroUrl ? (
                  <Image
                    src={heroUrl}
                    alt={title}
                    fill
                    priority={priority}
                    sizes="(min-width: 1024px) 640px, 80vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted">
                    No photo yet
                  </div>
                )}
                <div className="photo-scrim pointer-events-none absolute inset-0" />
                <RatingBadge score={ratingScore} />
                <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
                  {showYearLine && (
                    <p className="numeral text-xs text-white/70">{vehicle.year}</p>
                  )}
                  <VehicleName
                    title={title}
                    size="md"
                    nameColorValue={nameColorValue}
                    nameColorEffectClassName={nameColorEffectClassName}
                  />
                  {subtitle && <p className="truncate text-sm text-white/70">{subtitle}</p>}
                </div>
              </div>
            </RankFrame>
          </div>
        </>
      ) : (
        <RankFrame score={ratingScore} compact hideBadge className="absolute inset-0">
          {heroUrl ? (
            <Image
              src={heroUrl}
              alt={title}
              fill
              priority={priority}
              sizes="(min-width: 1024px) 900px, 100vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-base text-muted">
              No photo yet
            </div>
          )}

          <div className="photo-scrim pointer-events-none absolute inset-0" />
          <RatingBadge score={ratingScore} />

          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8">
            {showYearLine && (
              <p className="numeral text-sm text-white/70">{vehicle.year}</p>
            )}
            <VehicleName
              title={title}
              size="xl"
              nameColorValue={nameColorValue}
              nameColorEffectClassName={nameColorEffectClassName}
            />
            {subtitle && <p className="mt-1 truncate text-base text-white/70">{subtitle}</p>}
          </div>
        </RankFrame>
      )}
    </Link>
  );
}
