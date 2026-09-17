import Link from "next/link";
import Image from "next/image";
import { VEHICLE_CATEGORY_LABELS } from "@/lib/vehicles/category";
import { rankForScore, RANK_LABELS, RANK_TEXT_COLORS } from "@/lib/rating/rank";
import type { LeaderboardEntry } from "@/lib/leaderboard/compose-leaderboard";

/** The #1 build gets a podium, not another row. A leaderboard's whole
 * emotional job is making the top spot look worth chasing, which an
 * identical-to-everything-else list item can't do — so first place gets
 * the car at full width with the score set like a readout over it, and
 * everyone below it stays in the dense list (leaderboard-row.tsx). */
export function LeaderboardHeroCard({ entry }: { entry: LeaderboardEntry }) {
  const tier = rankForScore(entry.score);

  return (
    <Link
      href={`/garage/${entry.vehicleId}`}
      className="elev-3 group relative block aspect-[4/3] w-full overflow-hidden rounded-3xl bg-surface sm:aspect-[16/9]"
    >
      {entry.heroUrl && (
        <Image
          src={entry.heroUrl}
          alt=""
          fill
          priority
          sizes="(min-width: 640px) 672px, 100vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
        />
      )}

      {/* The scrim is what makes text over an arbitrary user photo
          legible — a bright engine bay and a black night shot both have
          to carry the same white type. */}
      <div className="photo-scrim absolute inset-0" />

      <span className="micro-label absolute left-4 top-4 rounded-full bg-accent px-2.5 py-1 text-accent-foreground">
        #1 Overall
      </span>

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4 sm:p-5">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-xl font-semibold tracking-tight text-white sm:text-2xl">
            {entry.vehicleTitle}
          </h3>
          <p className="mt-0.5 truncate text-sm text-white/70">
            @{entry.ownerUsername} · {VEHICLE_CATEGORY_LABELS[entry.category]}
          </p>
        </div>

        <div className="flex-shrink-0 text-right">
          <p className="numeral text-4xl leading-none text-white sm:text-5xl">
            {entry.score.toFixed(2)}
          </p>
          <p className="micro-label mt-1.5" style={{ color: RANK_TEXT_COLORS[tier] }}>
            {RANK_LABELS[tier]}
          </p>
        </div>
      </div>
    </Link>
  );
}
