import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { listVehiclesByOwner } from "@/lib/db/vehicles";
import { getMediaByIds, publicMediaUrl } from "@/lib/db/media";
import { getPointsBalance, listOwnedItemIds } from "@/lib/db/points";
import { GarageEditor, type EditorVehicle } from "@/features/garage/garage-editor";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { BrushIcon } from "@/components/ui/icons";

export default async function GarageCustomizePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/garage/customize");

  const supabase = await createClient();
  const vehicles = await listVehiclesByOwner(supabase, user.id);

  if (vehicles.length === 0) {
    return (
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <h1 className="mb-6 text-[2.125rem] font-bold leading-tight tracking-[-0.03em]">Customize</h1>
        <EmptyState
          card
          icon={<BrushIcon />}
          title="No cars to customize yet"
          body="Add a car to your garage, then come back to give it its own backdrop."
          action={
            <Link href="/garage/new">
              <Button className="px-5">Add vehicle</Button>
            </Link>
          }
        />
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
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <GarageEditor
        vehicles={editorVehicles}
        initialBalance={balance}
        initialOwnedItemIds={ownedItemIds}
      />
    </div>
  );
}
