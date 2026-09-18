import Image from "next/image";
import Link from "next/link";
import { CREW_CATEGORY_LABELS } from "@/lib/crews/category";
import { RANK_MATERIAL_ICONS } from "@/features/garage/rank-material-icons";
import { rankForScore, RANK_TEXT_COLORS } from "@/lib/rating/rank";
import { FlagIcon, LockIcon } from "@/components/ui/icons";
import type { Crew } from "@/lib/db/crews";

/** A crew as a cover card: banner photo full-bleed, logo and name over
 * a scrim at the bottom, and — when a member has a rated build — the
 * crew's best tier as a small frosted chip up top. `bestScore` is the
 * highest rated build across every approved member (computed in
 * /crews/page.tsx), never stored. */
export function CrewCard({
  crew,
  logoUrl,
  bannerUrl,
  memberCount,
  bestScore,
}: {
  crew: Crew;
  logoUrl: string | null;
  bannerUrl: string | null;
  memberCount: number;
  bestScore: number | null;
}) {
  const tier = bestScore != null ? rankForScore(bestScore) : null;
  const TierIcon = tier ? RANK_MATERIAL_ICONS[tier] : null;

  return (
    <Link
      href={`/crews/${crew.id}`}
      className="pressable group relative block aspect-[4/3] overflow-hidden rounded-[24px] bg-neutral-900 elev-2"
    >
      {bannerUrl ? (
        <Image
          src={bannerUrl}
          alt=""
          fill
          sizes="(min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-[900ms] ease-[var(--ease-ios)] group-hover:scale-[1.04]"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <FlagIcon className="h-9 w-9 text-white/25" />
        </div>
      )}

      <div className="photo-scrim pointer-events-none absolute inset-0" />

      <div className="absolute left-3 right-3 top-3 flex items-center justify-between gap-2">
        {tier && TierIcon && bestScore != null ? (
          <span className="flex items-center gap-1.5 rounded-full bg-black/45 py-1 pl-1 pr-2.5 backdrop-blur-md">
            <TierIcon className="h-5 w-5" />
            <span className="numeral text-[0.75rem] leading-none" style={{ color: RANK_TEXT_COLORS[tier] }}>
              {bestScore.toFixed(2)}
            </span>
          </span>
        ) : (
          <span />
        )}
        {crew.visibility === "private" && (
          <span className="flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 text-[0.6875rem] font-semibold text-white backdrop-blur-md">
            <LockIcon className="h-3 w-3" />
            Private
          </span>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 p-4">
        <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-[14px] bg-neutral-800 ring-2 ring-white/15">
          {logoUrl ? (
            <Image src={logoUrl} alt="" fill sizes="48px" className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-lg font-bold text-white">
              {crew.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[1.125rem] font-bold tracking-[-0.01em] text-white">{crew.name}</h3>
          <p className="truncate text-[0.8125rem] text-white/75">
            {CREW_CATEGORY_LABELS[crew.category]}
            {crew.location_text ? ` · ${crew.location_text}` : ""}
            {" · "}
            <span className="numeral">{memberCount}</span> member{memberCount === 1 ? "" : "s"}
          </p>
        </div>
      </div>
    </Link>
  );
}
