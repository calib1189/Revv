import Image from "next/image";
import Link from "next/link";
import { RANK_MATERIAL_ICONS } from "@/features/garage/rank-material-icons";
import { rankForScore, RANK_LABELS, RANK_TEXT_COLORS } from "@/lib/rating/rank";
import { CREW_SCORE_SLOTS, type CrewScore } from "@/lib/crews/crew-score";
import type { CrewCarItem } from "@/features/crews/crew-cars-grid";

/** The crew's standing: its tier, its score out of 500, its place on the
 * crew leaderboard, and the five build slots the score is made of, so
 * it's plain what raises it. */
export function CrewScorePanel({
  score,
  place,
  rankedCount,
}: {
  score: CrewScore;
  /** Place on the crew leaderboard, null for a private or unrated crew. */
  place: number | null;
  rankedCount: number;
}) {
  const tier = score.tierScore != null ? rankForScore(score.tierScore) : null;
  const TierIcon = tier ? RANK_MATERIAL_ICONS[tier] : null;
  return (
    <div className="glass-raised elev-1 w-full rounded-[22px] p-4">
      <div className="flex items-center gap-3.5">
        <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[16px] bg-foreground/[0.05]">
          {TierIcon ? <TierIcon className="h-11 w-11" sizes="44px" /> : <span className="text-[1.25rem] font-bold text-muted">?</span>}
        </span>
        <div className="min-w-0 flex-1 text-left">
          <p className="micro-label text-muted">Crew score</p>
          <p className="mt-0.5 flex items-baseline gap-1.5">
            <span className="numeral text-[1.75rem] leading-none">{score.score != null ? Math.round(score.score) : "—"}</span>
            <span className="numeral text-[0.875rem] text-muted">/ {CREW_SCORE_SLOTS * 100}</span>
          </p>
        </div>
        <div className="flex-shrink-0 text-right">
          {tier ? (
            <p className="text-[0.9375rem] font-bold" style={{ color: RANK_TEXT_COLORS[tier] }}>
              {RANK_LABELS[tier]}
            </p>
          ) : (
            <p className="text-[0.875rem] font-semibold text-muted">Unranked</p>
          )}
          {place != null && (
            <p className="mt-0.5 text-[0.8125rem] text-muted">
              <span className="numeral font-semibold text-foreground">#{place}</span> of {rankedCount} crews
            </p>
          )}
        </div>
      </div>

      {/* The five slots: each rated member's best build fills one. */}
      <div className="mt-4 flex gap-1.5" aria-label={`${score.counted} of ${CREW_SCORE_SLOTS} build slots filled`}>
        {Array.from({ length: CREW_SCORE_SLOTS }, (_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i < score.counted ? "bg-accent" : "bg-foreground/[0.1]"}`}
          />
        ))}
      </div>
      <p className="mt-2 text-left text-[0.8125rem] text-muted">
        {score.openSlots === 0
          ? "All five slots filled. Better builds raise it from here."
          : score.counted === 0
            ? "A member's rated build fills the first slot."
            : `${score.openSlots} open ${score.openSlots === 1 ? "slot" : "slots"}. Every rated member who joins adds their best build.`}
      </p>
    </div>
  );
}

/** The crew's three best cars, second-first-third, the way a podium
 * stands. */
export function CrewPodium({ cars }: { cars: CrewCarItem[] }) {
  const top = cars
    .filter((c) => c.vehicleScore != null)
    .sort((a, b) => b.vehicleScore! - a.vehicleScore!)
    .slice(0, 3);
  if (top.length === 0) return null;
  const order = top.length === 3 ? [top[1], top[0], top[2]] : top.length === 2 ? [top[1], top[0]] : [top[0]];
  const placeOf = (car: CrewCarItem) => top.indexOf(car) + 1;

  return (
    <section className="w-full">
      <p className="micro-label mb-3 text-left text-muted">Top builds</p>
      <div className="flex items-end gap-2.5">
        {order.map((car) => {
          const place = placeOf(car);
          const tier = rankForScore(car.vehicleScore!);
          const name = car.vehicle.nickname || `${car.vehicle.year} ${car.vehicle.make} ${car.vehicle.model}`;
          return (
            <Link
              key={car.vehicle.id}
              href={`/garage/${car.vehicle.id}`}
              className={`pressable group relative block min-w-0 flex-1 overflow-hidden rounded-[18px] bg-neutral-900 elev-2 ${
                place === 1 ? "aspect-[3/4.4]" : "aspect-[3/3.8]"
              }`}
              style={{ boxShadow: place === 1 ? `0 0 0 2px ${RANK_TEXT_COLORS[tier]}` : undefined }}
            >
              {car.heroUrl && (
                <Image src={car.heroUrl} alt="" fill sizes="(min-width: 640px) 240px, 33vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
              )}
              <div className="photo-scrim pointer-events-none absolute inset-0" />
              <span className="numeral absolute left-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-black/55 px-1.5 text-[0.75rem] font-bold text-white backdrop-blur-md">
                {place}
              </span>
              <div className="absolute inset-x-0 bottom-0 p-2.5 text-left">
                <p className="numeral text-[1.125rem] leading-none text-white" style={{ textShadow: "0 1px 6px rgb(0 0 0 / 0.5)" }}>
                  {car.vehicleScore!.toFixed(2)}
                </p>
                <p className="mt-1 truncate text-[0.75rem] font-semibold text-white">{name}</p>
                <p className="truncate text-[0.6875rem] text-white/70">@{car.ownerUsername}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
