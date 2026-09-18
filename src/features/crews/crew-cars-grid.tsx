import Link from "next/link";
import { VehicleBay } from "@/features/garage/vehicle-bay";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Avatar } from "@/features/feed/avatar";
import { rankForScore, RANK_TEXT_COLORS } from "@/lib/rating/rank";
import type { Vehicle } from "@/lib/db/vehicles";

export interface CrewCarItem {
  vehicle: Vehicle;
  heroUrl: string | null;
  vehicleScore: number | null;
  ownerUsername: string;
  ownerAvatarUrl: string | null;
  ownerBestScore: number | null;
  /** The car owner's equipped Garage Shop Nameplate Color, if any —
   * same cosmetic shown on their own /garage and profile Garage tab,
   * applied here too so it's consistent everywhere their car shows up. */
  ownerNameColorValue?: string;
  ownerNameColorEffectClassName?: string;
}

/** The crew page's default view — every member's car as the same
 * feature card the garage uses, not grouped by member, so the crew reads
 * as one shared garage. Each card carries its owner's avatar in the top
 * corner, inside a ring of that owner's best score across all of their
 * cars: "how good is this build" (the card's own score bar) and "how
 * good is this person's garage" are different facts. */
export function CrewCarsGrid({ cars }: { cars: CrewCarItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      {cars.map((car) => (
        <div key={car.vehicle.id} className="relative">
          <VehicleBay
            vehicle={car.vehicle}
            heroUrl={car.heroUrl}
            ratingScore={car.vehicleScore}
            nameColorValue={car.ownerNameColorValue}
            nameColorEffectClassName={car.ownerNameColorEffectClassName}
          />
          <Link
            href={`/u/${car.ownerUsername}`}
            aria-label={`@${car.ownerUsername}`}
            className="absolute right-3 top-3 z-10 rounded-full bg-black/40 p-0.5 backdrop-blur-md"
          >
            {car.ownerBestScore != null ? (
              <ProgressRing
                value={car.ownerBestScore / 100}
                size={42}
                stroke={3}
                color={RANK_TEXT_COLORS[rankForScore(car.ownerBestScore)]}
              >
                <Avatar username={car.ownerUsername} avatarUrl={car.ownerAvatarUrl} className="h-[34px] w-[34px] text-xs" />
              </ProgressRing>
            ) : (
              <Avatar username={car.ownerUsername} avatarUrl={car.ownerAvatarUrl} className="h-[38px] w-[38px] text-xs" />
            )}
          </Link>
        </div>
      ))}
    </div>
  );
}
