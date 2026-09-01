import Image from "next/image";
import Link from "next/link";
import { CREW_CATEGORY_LABELS } from "@/lib/crews/category";
import type { Crew } from "@/lib/db/crews";

export function CrewCard({
  crew,
  logoUrl,
  memberCount,
}: {
  crew: Crew;
  logoUrl: string | null;
  memberCount: number;
}) {
  return (
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
  );
}
