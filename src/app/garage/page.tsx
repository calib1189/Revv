import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { listVehiclesByOwner } from "@/lib/db/vehicles";
import { getMediaByIds, publicMediaUrl } from "@/lib/db/media";
import { listActiveBuildsByVehicleIds } from "@/lib/db/builds";
import { getProfileByUserId, GARAGE_THEMES, type GarageTheme } from "@/lib/db/profiles";
import { VehicleCard } from "@/features/garage/vehicle-card";
import { GarageScene } from "@/features/garage/garage-scene";
import { Button } from "@/components/ui/button";

export default async function GaragePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/garage");

  const supabase = await createClient();
  const [vehicles, profile] = await Promise.all([
    listVehiclesByOwner(supabase, user.id),
    getProfileByUserId(supabase, user.id),
  ]);
  const heroIds = vehicles
    .map((v) => v.hero_media_id)
    .filter((id): id is string => Boolean(id));
  const [heroMedia, activeBuildByVehicle] = await Promise.all([
    getMediaByIds(supabase, heroIds),
    listActiveBuildsByVehicleIds(supabase, vehicles.map((v) => v.id)),
  ]);
  const heroUrlById = new Map(
    heroMedia.map((m) => [m.id, publicMediaUrl(supabase, m.storage_path)]),
  );
  const garageTheme = GARAGE_THEMES.includes(profile?.garage_theme as GarageTheme)
    ? (profile!.garage_theme as GarageTheme)
    : "workshop";

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

      <GarageScene initialTheme={garageTheme}>
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
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((vehicle) => (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                heroUrl={
                  vehicle.hero_media_id
                    ? (heroUrlById.get(vehicle.hero_media_id) ?? null)
                    : null
                }
                ratingScore={activeBuildByVehicle.get(vehicle.id)?.ai_rating_score ?? null}
              />
            ))}
          </div>
        )}
      </GarageScene>
    </div>
  );
}
