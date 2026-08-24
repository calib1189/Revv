import Image from "next/image";
import Link from "next/link";
import { GemIcon, PlusIcon } from "@/components/ui/icons";
import { rankForScore, RANK_LABELS, RANK_BADGE_COLORS } from "@/lib/rating/rank";
import { GARAGE_TEMPLATES, type GarageLayout } from "@/lib/garage/layout";
import { PlantDecor, WallArtDecor } from "@/features/garage/garage-decor";

export interface DioramaVehicle {
  id: string;
  title: string;
  cutoutUrl: string | null;
  heroUrl: string | null;
  ratingScore: number | null;
}

export function GarageDiorama({
  theme,
  layout,
  vehiclesById,
}: {
  theme: string;
  layout: GarageLayout;
  vehiclesById: Map<string, DioramaVehicle>;
}) {
  return (
    <div data-garage-theme={theme} className="garage-scene garage-diorama">
      {layout.lighting !== "none" && (
        <div className={`garage-lighting garage-lighting-${layout.lighting}`} />
      )}
      <PlantDecor variant={layout.plant} />
      <WallArtDecor variant={layout.wallArt} />

      <div className={`garage-bays garage-bays-${GARAGE_TEMPLATES[layout.template]}`}>
        {layout.bays.map((vehicleId, i) => {
          const vehicle = vehicleId ? vehiclesById.get(vehicleId) : undefined;
          return (
            <div key={i} className="garage-bay">
              {layout.rug !== "none" && (
                <div className={`garage-rug garage-rug-${layout.rug}`} />
              )}
              {vehicle ? (
                <VehicleInBay vehicle={vehicle} />
              ) : (
                <Link href="/garage/customize" className="garage-bay-empty">
                  <PlusIcon className="h-5 w-5" />
                  Add a car
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VehicleInBay({ vehicle }: { vehicle: DioramaVehicle }) {
  const imageUrl = vehicle.cutoutUrl ?? vehicle.heroUrl;
  const tier = vehicle.ratingScore != null ? rankForScore(vehicle.ratingScore) : null;

  return (
    <Link href={`/garage/${vehicle.id}`} className="garage-bay-vehicle">
      <div className="garage-bay-image">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={vehicle.title}
            fill
            sizes="(min-width: 640px) 33vw, 50vw"
            className={vehicle.cutoutUrl ? "garage-cutout-img" : "garage-photo-img"}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted">
            No photo yet
          </div>
        )}
      </div>
      <span className="garage-plate">
        {tier && <GemIcon className="h-2.5 w-2.5 flex-shrink-0" style={{ color: RANK_BADGE_COLORS[tier] }} />}
        <span className="truncate">{vehicle.title}</span>
        {tier && (
          <span className="flex-shrink-0" style={{ color: RANK_BADGE_COLORS[tier] }}>
            · {RANK_LABELS[tier]}
          </span>
        )}
      </span>
    </Link>
  );
}
