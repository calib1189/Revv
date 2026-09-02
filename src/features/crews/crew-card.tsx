import Image from "next/image";
import Link from "next/link";
import { CREW_CATEGORY_LABELS } from "@/lib/crews/category";
import { RankFrame } from "@/features/garage/rank-frame";
import { FlagIcon, LockIcon, GlobeIcon } from "@/components/ui/icons";
import type { Crew } from "@/lib/db/crews";

/** A full cover-photo card — the same "photo, gradient, text at the
 * bottom" language VehicleCard and MeetupCard already use everywhere
 * else, rather than the flat glass-row-with-a-tiny-avatar this used to
 * be. `bestScore` (highest rated build across every approved member,
 * computed in /crews/page.tsx) drives the same premium RankFrame ring
 * used for car photos and profile avatars — a crew with a Ruby or
 * Cosmic member stands out before you even click in. */
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
  return (
    <RankFrame score={bestScore} compact hideBadge>
      <Link
        href={`/crews/${crew.id}`}
        className="group relative block aspect-[4/3] overflow-hidden rounded-2xl bg-surface"
      >
        {bannerUrl ? (
          <Image
            src={bannerUrl}
            alt=""
            fill
            sizes="(min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-surface-raised">
            <FlagIcon className="h-8 w-8 text-muted/60" />
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />

        <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white/90 backdrop-blur-sm">
          {crew.visibility === "private" ? (
            <LockIcon className="h-3 w-3" />
          ) : (
            <GlobeIcon className="h-3 w-3" />
          )}
          {crew.visibility === "private" ? "Private" : "Public"}
        </span>

        <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 p-4">
          <div className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-full border-2 border-white/20 bg-surface-raised">
            {logoUrl ? (
              <Image src={logoUrl} alt="" fill sizes="44px" className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-base font-semibold text-white">
                {crew.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold text-white">{crew.name}</h3>
            <p className="truncate text-xs text-white/70">
              {CREW_CATEGORY_LABELS[crew.category]}
              {crew.location_text ? ` · ${crew.location_text}` : ""}
              {" · "}
              {memberCount} member{memberCount === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </Link>
    </RankFrame>
  );
}
