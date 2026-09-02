import Image from "next/image";
import Link from "next/link";
import { CREW_CATEGORY_LABELS } from "@/lib/crews/category";
import { RankFrame } from "@/features/garage/rank-frame";
import type { Crew } from "@/lib/db/crews";

/** `bestScore` is the highest rated build across every approved member's
 * garage (computed in /crews/page.tsx via maxScore) — the same premium
 * animated ring RankFrame already puts around a car photo or a profile
 * avatar, here wrapping the whole card so a crew with a Ruby (or
 * Cosmic) member visibly stands out on the discover grid before you
 * even click in. Null (no rated builds in the crew yet) renders as a
 * plain card, same as RankFrame does everywhere else. */
export function CrewCard({
  crew,
  logoUrl,
  memberCount,
  bestScore,
}: {
  crew: Crew;
  logoUrl: string | null;
  memberCount: number;
  bestScore: number | null;
}) {
  return (
    <RankFrame score={bestScore} compact hideBadge>
      <Link
        href={`/crews/${crew.id}`}
        className="glass group flex flex-col gap-3 rounded-2xl p-4 transition-colors hover:brightness-110"
      >
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full bg-surface-raised">
            {logoUrl ? (
              <Image src={logoUrl} alt="" fill sizes="48px" className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-foreground">
                {crew.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold">{crew.name}</h3>
            <p className="truncate text-xs text-muted">
              {CREW_CATEGORY_LABELS[crew.category]}
              {crew.location_text ? ` · ${crew.location_text}` : ""}
            </p>
          </div>
        </div>
        <p className="text-xs text-muted">
          {memberCount} member{memberCount === 1 ? "" : "s"}
        </p>
      </Link>
    </RankFrame>
  );
}
