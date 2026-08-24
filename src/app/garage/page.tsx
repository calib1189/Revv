import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { listVehiclesByOwner } from "@/lib/db/vehicles";
import { getMediaByIds, publicMediaUrl } from "@/lib/db/media";
import { listActiveBuildsByVehicleIds } from "@/lib/db/builds";
import { getProfileByUserId, GARAGE_THEMES, type GarageTheme } from "@/lib/db/profiles";
import { parseGarageLayout } from "@/lib/garage/layout";
import { VehicleCard } from "@/features/garage/vehicle-card";
import { GarageDiorama } from "@/features/garage/garage-diorama";
import { Button } from "@/components/ui/button";

export default async function GaragePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/garage");

  const supabase = await createClient();
  const [vehicles, profile] = await Promise.all([
    listVehiclesByOwner(supabase, user.id),
    getProfileByUserId(supabase, user.id),
  ]);

  const mediaIds = [
    ...vehicles.map((v) => v.hero_media_id),
    ...vehicles.map((v) => v.garage_cutout_media_id),
  ].filter((id): id is string => Boolean(id));

  const [media, activeBuildByVehicle] = await Promise.all([
    getMediaByIds(supabase, mediaIds),
    listActiveBuildsByVehicleIds(supabase, vehicles.map((v) => v.id)),
  ]);
  const urlById = new Map(media.map((m) => [m.id, publicMediaUrl(supabase, m.storage_path)]));

  const garageTheme = GARAGE_THEMES.includes(profile?.garage_theme as GarageTheme)
    ? (profile!.garage_theme as GarageTheme)
    : "workshop";
  const garageLayout = parseGarageLayout(profile?.garage_layout);

  const vehiclesById = new Map(
    vehicles.map((v) => [
      v.id,
      {
        id: v.id,
        title: v.nickname || `${v.year ?? ""} ${v.make ?? ""} ${v.model ?? ""}`.trim() || "Untitled",
        heroUrl: v.hero_media_id ? (urlById.get(v.hero_media_id) ?? null) : null,
        cutoutUrl: v.garage_cutout_media_id ? (urlById.get(v.garage_cutout_media_id) ?? null) : null,
        ratingScore: activeBuildByVehicle.get(v.id)?.ai_rating_score ?? null,
      },
    ]),
  );

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Your garage</h1>
        <div className="flex items-center gap-2">
          <Link href="/assistant">
            <Button variant="secondary" className="px-3 py-1.5 text-sm">
              Ask assistant
            </Button>
          </Link>
          <Link href="/garage/new">
            <Button className="px-3 py-1.5 text-sm">Add vehicle</Button>
          </Link>
        </div>
      </div>

      {vehicles.length === 0 ? (
        <div className="glass flex flex-col items-center justify-center gap-4 rounded-2xl py-24 text-center">
          <p className="text-lg font-medium">No vehicles yet</p>
          <p className="max-w-xs text-sm text-muted">
            Add your first car to start tracking mods, photos, and builds.
          </p>
          <Link href="/garage/new">
            <Button>Add your first vehicle</Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-3 flex justify-end">
            <Link href="/garage/customize">
              <Button variant="secondary" className="px-3 py-1.5 text-sm">
                Customize garage
              </Button>
            </Link>
          </div>
          <GarageDiorama theme={garageTheme} layout={garageLayout} vehiclesById={vehiclesById} />

          <h2 className="mb-4 mt-10 text-sm font-medium text-muted">All vehicles</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((vehicle) => (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                heroUrl={
                  vehicle.hero_media_id
                    ? (urlById.get(vehicle.hero_media_id) ?? null)
                    : null
                }
                ratingScore={activeBuildByVehicle.get(vehicle.id)?.ai_rating_score ?? null}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
