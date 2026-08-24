import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { listVehiclesByOwner } from "@/lib/db/vehicles";
import { getMediaByIds, publicMediaUrl } from "@/lib/db/media";
import { listActiveBuildsByVehicleIds } from "@/lib/db/builds";
import { getProfileByUserId, GARAGE_THEMES, type GarageTheme } from "@/lib/db/profiles";
import { parseGarageLayout } from "@/lib/garage/layout";
import { GarageEditor } from "@/features/garage/garage-editor";
import { BackIcon } from "@/components/ui/icons";

export default async function CustomizeGaragePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/garage/customize");

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

  const dioramaVehicles = vehicles.map((v) => ({
    id: v.id,
    title: v.nickname || `${v.year ?? ""} ${v.make ?? ""} ${v.model ?? ""}`.trim() || "Untitled",
    heroUrl: v.hero_media_id ? (urlById.get(v.hero_media_id) ?? null) : null,
    cutoutUrl: v.garage_cutout_media_id ? (urlById.get(v.garage_cutout_media_id) ?? null) : null,
    ratingScore: activeBuildByVehicle.get(v.id)?.ai_rating_score ?? null,
  }));

  const garageTheme = GARAGE_THEMES.includes(profile?.garage_theme as GarageTheme)
    ? (profile!.garage_theme as GarageTheme)
    : "workshop";
  const garageLayout = parseGarageLayout(profile?.garage_layout);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
      <Link href="/garage" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <BackIcon className="h-4 w-4" />
        Garage
      </Link>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Customize your garage</h1>
      <p className="mb-6 text-sm text-muted">
        Pick a layout, decorate it, and put your cars in it.
      </p>

      {vehicles.length === 0 ? (
        <div className="glass rounded-2xl p-6 text-center text-sm text-muted">
          Add a vehicle first, then come back to put it in your garage.
        </div>
      ) : (
        <GarageEditor
          userId={user.id}
          vehicles={dioramaVehicles}
          initialLayout={garageLayout}
          initialTheme={garageTheme}
        />
      )}
    </div>
  );
}
