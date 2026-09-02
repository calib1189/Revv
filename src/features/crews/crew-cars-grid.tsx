import Link from "next/link";
import { VehicleCard } from "@/features/garage/vehicle-card";
import { RankFrame } from "@/features/garage/rank-frame";
import { Avatar } from "@/features/feed/avatar";
import type { Vehicle } from "@/lib/db/vehicles";

export interface CrewCarItem {
  vehicle: Vehicle;
  heroUrl: string | null;
  vehicleScore: number | null;
  ownerUsername: string;
  ownerAvatarUrl: string | null;
  ownerBestScore: number | null;
}

/** The crew page's default view — every member's car in one flat grid,
 * not grouped by member, so the crew reads as one shared garage rather
 * than a roster you have to dig through. Each tile is the same
 * VehicleCard used everywhere else (its own rank ring is the car's own
 * best build rating), with the owner's avatar overlaid in the corner —
 * wrapped in its own RankFrame ring too, using that owner's best score
 * across all of *their* cars, not just this one. Two independent rings
 * on one tile, deliberately: "how good is this specific build" and "how
 * good is this person's garage overall" are different facts. */
export function CrewCarsGrid({ cars }: { cars: CrewCarItem[] }) {
  if (cars.length === 0) {
    return <p className="text-sm text-muted">No cars in this crew&apos;s garages yet.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {cars.map((car) => (
        <div key={car.vehicle.id} className="relative">
          <VehicleCard vehicle={car.vehicle} heroUrl={car.heroUrl} ratingScore={car.vehicleScore} />
          <Link
            href={`/u/${car.ownerUsername}`}
            aria-label={`@${car.ownerUsername}`}
            className="absolute left-2 top-2 z-10"
          >
            <RankFrame score={car.ownerBestScore} compact hideBadge className="rounded-full">
              <Avatar username={car.ownerUsername} avatarUrl={car.ownerAvatarUrl} className="h-9 w-9 text-xs" />
            </RankFrame>
          </Link>
        </div>
      ))}
    </div>
  );
}
