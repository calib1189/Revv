import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/db/profiles";
import { getPointsBalance, listOwnedItemIds } from "@/lib/db/points";
import { listVehiclesByOwner } from "@/lib/db/vehicles";
import { listCrewsOwnedBy } from "@/lib/db/crews";
import { StoreTabs, type OwnedCrewOption } from "@/features/store/store-tabs";

export default async function StorePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/store");

  const supabase = await createClient();

  // Best-effort: a not-yet-migrated points_ledger/store_items_owned
  // shouldn't crash the page — it just opens with a 0 balance and
  // nothing owned, which is the honest state before that migration
  // has run anyway.
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
    console.error("Store data fetch failed:", err);
  }

  const [profile, vehicles, ownedCrews] = await Promise.all([
    getProfileByUserId(supabase, user.id),
    listVehiclesByOwner(supabase, user.id),
    listCrewsOwnedBy(supabase, user.id),
  ]);

  const firstVehicle = vehicles[0];
  const garagePreviewLabel = firstVehicle
    ? firstVehicle.nickname || `${firstVehicle.make} ${firstVehicle.model}`
    : "My Car";

  const crews: OwnedCrewOption[] = ownedCrews.map((crew) => ({
    id: crew.id,
    name: crew.name,
    equipped: {
      crew_name_color: crew.equipped_crew_name_color,
      crew_banner: crew.equipped_crew_banner,
      crew_frame: crew.equipped_crew_frame,
    },
  }));

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <StoreTabs
        initialBalance={balance}
        initialOwnedItemIds={ownedItemIds}
        profilePreviewLabel={`@${profile?.username ?? user.id}`}
        profileEquipped={{
          name_color: profile?.equipped_name_color ?? null,
          profile_background: profile?.equipped_profile_background ?? null,
          showcase_frame: profile?.equipped_showcase_frame ?? null,
        }}
        garagePreviewLabel={garagePreviewLabel}
        garageEquipped={{
          vehicle_name_color: profile?.equipped_vehicle_name_color ?? null,
        }}
        crews={crews}
        isFounder={profile?.is_founder ?? false}
      />
    </div>
  );
}
