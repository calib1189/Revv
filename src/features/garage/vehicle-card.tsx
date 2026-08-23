import Image from "next/image";
import Link from "next/link";
import { RankFrame } from "@/features/garage/rank-frame";
import type { Vehicle } from "@/lib/db/vehicles";

export function VehicleCard({
  vehicle,
  heroUrl,
  ratingScore = null,
}: {
  vehicle: Vehicle;
  heroUrl: string | null;
  ratingScore?: number | null;
}) {
  const title = vehicle.nickname || `${vehicle.make} ${vehicle.model}`;
  const subtitle = vehicle.nickname
    ? `${vehicle.year ?? ""} ${vehicle.make ?? ""} ${vehicle.model ?? ""}`.trim()
    : vehicle.trim;

  return (
    <RankFrame score={ratingScore} compact>
      <Link
        href={`/garage/${vehicle.id}`}
        className="group relative block aspect-[4/3] overflow-hidden rounded-2xl bg-surface"
      >
        {heroUrl ? (
          <Image
            src={heroUrl}
            alt={title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted">
            No photo yet
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/0 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 p-4">
          {vehicle.year && (
            <p className="text-xs font-medium tracking-wide text-white/70">
              {vehicle.year}
            </p>
          )}
          <h3 className="truncate text-lg font-semibold text-white">{title}</h3>
          {subtitle && (
            <p className="truncate text-sm text-white/70">{subtitle}</p>
          )}
        </div>
      </Link>
    </RankFrame>
  );
}
