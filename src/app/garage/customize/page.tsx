import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { listVehiclesByOwner } from "@/lib/db/vehicles";
import { getMediaByIds, publicMediaUrl } from "@/lib/db/media";
import { getPointsBalance, listOwnedItemIds } from "@/lib/db/points";
import { GarageEditor, type EditorVehicle } from "@/features/garage/garage-editor";
import { Button } from "@/components/ui/button";

export default async function GarageCustomizePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/garage/customize");

  const supabase = await createClient();
  const vehicles = await listVehiclesByOwner(supabase, user.id);

  if (vehicles.length === 0) {
    return (
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="mb-2 text-2xl font-bold tracking-tight">Garage Editor</h1>
        <div className="glass mt-6 flex flex-col items-center justify-center gap-4 rounded-2xl py-24 text-center">
          <p className="text-lg font-medium">No vehicles to customize yet</p>
          <p className="max-w-xs text-sm text-muted">
            Add a car to your garage, then come back here to give it its own backdrop.
          </p>
          <Link href="/garage/new">
            <Button>Add your first vehicle</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Best-effort, same shape as every other store-adjacent fetch — a
  // not-yet-migrated points_ledger/store_items_owned shouldn't take
  // down the editor, it just opens with nothing owned.
  let balance = 0;
  let ownedItemIds: string[] = [];
  try {
    const [balanceResult, ownedResult] = await Promise.all([
      getPointsBalance(supabase, user.id),
      listOwnedItemIds(supabase, user.id),
    ]);
    balance = balanceResult;
    ownedItemIds = [...ownedResult];
  } catch (err) {
    console.error("Garage Editor shop data fetch failed:", err);
  }

  const heroIds = vehicles.map((v) => v.hero_media_id).filter((id): id is string => Boolean(id));
  const heroMedia = await getMediaByIds(supabase, heroIds);
  const heroUrlById = new Map(heroMedia.map((m) => [m.id, publicMediaUrl(supabase, m.storage_path)]));

  const editorVehicles: EditorVehicle[] = vehicles.map((vehicle) => ({
    id: vehicle.id,
    title: vehicle.nickname || `${vehicle.make} ${vehicle.model}`,
    heroUrl: vehicle.hero_media_id ? (heroUrlById.get(vehicle.hero_media_id) ?? null) : null,
    equippedBackdrop: vehicle.equipped_backdrop,
  }));

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <GarageEditor
        vehicles={editorVehicles}
        initialBalance={balance}
        initialOwnedItemIds={ownedItemIds}
      />
    </div>
  );
}
