import Image from "next/image";
import Link from "next/link";
import { RankFrame } from "@/features/garage/rank-frame";
import { getStoreItem } from "@/lib/store/catalog";
import type { Vehicle } from "@/lib/db/vehicles";

function VehicleName({
  title,
  size,
  nameColorValue,
  nameColorEffectClassName,
}: {
  title: string;
  size: "sm" | "lg";
  nameColorValue?: string;
  nameColorEffectClassName?: string;
}) {
  const isGradient = nameColorValue?.includes("gradient") ?? false;
  const sizeClass = size === "lg" ? "text-lg font-semibold" : "text-sm font-semibold";

  if (isGradient) {
    return (
      <h3
        className={`truncate bg-clip-text text-transparent ${sizeClass} ${nameColorEffectClassName ?? ""}`}
        style={{ backgroundImage: nameColorValue }}
      >
        {title}
      </h3>
    );
  }

  return (
    <h3
      className={`truncate ${sizeClass} ${nameColorValue ? "" : "text-white"} ${nameColorEffectClassName ?? ""}`}
      style={nameColorValue ? { color: nameColorValue } : undefined}
    >
      {title}
    </h3>
  );
}

export function VehicleCard({
  vehicle,
  heroUrl,
  ratingScore = null,
  priority = false,
  nameColorValue,
  nameColorEffectClassName,
}: {
  vehicle: Vehicle;
  heroUrl: string | null;
  ratingScore?: number | null;
  /** True for the first card in the grid — it's the one that ends up
   * as the page's Largest Contentful Paint, so it should load eagerly
   * instead of lazily like every card below the fold. */
  priority?: boolean;
  /** The owner's equipped Nameplate Color store cosmetic (garage
   * shop) — a CSS color/gradient, same `value`/`effectClassName` shape
   * as every other store item. Undefined renders the default white.
   * Still passed in rather than self-derived: it's account-wide
   * (profiles.equipped_vehicle_name_color), not on the vehicle row. */
  nameColorValue?: string;
  nameColorEffectClassName?: string;
}) {
  const title = vehicle.nickname || `${vehicle.make} ${vehicle.model}`;
  const subtitle = vehicle.nickname
    ? `${vehicle.year ?? ""} ${vehicle.make ?? ""} ${vehicle.model ?? ""}`.trim()
    : vehicle.trim;

  // Unlike Nameplate Color, a Garage Backdrop lives directly on the
  // vehicle row (vehicles.equipped_backdrop) — self-derived here so
  // every place a VehicleCard renders (this page, a profile's Garage
  // tab, a crew's Cars tab) picks it up automatically, no extra prop
  // threading needed.
  const backdropItem = vehicle.equipped_backdrop ? getStoreItem(vehicle.equipped_backdrop) : undefined;

  return (
    <RankFrame score={ratingScore} compact>
      <Link
        href={`/garage/${vehicle.id}`}
        className="group relative block aspect-[4/3] overflow-hidden rounded-2xl bg-surface"
      >
        {backdropItem ? (
          <>
            {/* The backdrop is the whole card's stage — the car's own
                photo sits on it as a smaller plate, bottom-center, like
                a car parked in front of a scene rather than filling the
                frame itself. */}
            <div
              className={`absolute inset-0 ${backdropItem.effectClassName ?? ""}`}
              style={{ backgroundImage: backdropItem.value }}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" />

            <div className="absolute inset-x-0 bottom-0 flex justify-center px-3 pb-3">
              <div className="w-[62%] max-w-[168px] overflow-hidden rounded-lg bg-surface shadow-2xl ring-1 ring-white/15">
                <div className="relative aspect-[4/3]">
                  {heroUrl ? (
                    <Image
                      src={heroUrl}
                      alt={title}
                      fill
                      priority={priority}
                      sizes="200px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] text-muted">
                      No photo yet
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/0 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-2">
                    <VehicleName
                      title={title}
                      size="sm"
                      nameColorValue={nameColorValue}
                      nameColorEffectClassName={nameColorEffectClassName}
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {heroUrl ? (
              <Image
                src={heroUrl}
                alt={title}
                fill
                priority={priority}
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
              <VehicleName
                title={title}
                size="lg"
                nameColorValue={nameColorValue}
                nameColorEffectClassName={nameColorEffectClassName}
              />
              {subtitle && (
                <p className="truncate text-sm text-white/70">{subtitle}</p>
              )}
            </div>
          </>
        )}
      </Link>
    </RankFrame>
  );
}
