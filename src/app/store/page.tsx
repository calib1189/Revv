import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/db/profiles";
import { getPointsBalance, listOwnedItemIds } from "@/lib/db/points";
import { listVehiclesByOwner } from "@/lib/db/vehicles";
import { listActiveBuildsByVehicleIds } from "@/lib/db/builds";
import { getMediaByIds, publicMediaUrl } from "@/lib/db/media";
import { DECAL_PRICE_CENTS, earnedDecalTier } from "@/lib/decals/eligibility";
import { decalsEnabled } from "@/lib/decals/printful";
import type { DecalOffer } from "@/features/decals/decal-sheet";
import { buildPosterOffer, type PosterOffer } from "@/lib/posters/offer";
import { postersEnabled } from "@/lib/posters/products";
import { merchEnabled } from "@/lib/merch/products";
import { rankForScore } from "@/lib/rating/rank";
import { listCrewsOwnedBy } from "@/lib/db/crews";
import { Suspense } from "react";
import { StoreTabs, type OwnedCrewOption } from "@/features/store/store-tabs";
import { pointsPacksEnabled } from "@/lib/points/packs";
import { storeWeek } from "@/lib/store/featured";

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

  // Prints for every car of theirs that can order one (approved, rated;
  // posters also need a cover photo), while each is switched on.
  const showDecals = decalsEnabled(profile?.is_admin ?? false);
  const showPosters = postersEnabled(profile?.is_admin ?? false);
  let decals: DecalOffer[] = [];
  let posters: PosterOffer[] = [];
  if ((showDecals || showPosters) && vehicles.length > 0) {
    try {
      const builds = await listActiveBuildsByVehicleIds(supabase, vehicles.map((v) => v.id));
      const scoreOf = (vehicleId: string) => builds.get(vehicleId)?.ai_rating_score ?? null;
      const eligible = vehicles.filter(
        (v) =>
          earnedDecalTier({
            ownerId: v.owner_id,
            viewerId: user.id,
            verificationStatus: v.ownership_verification_status,
            score: scoreOf(v.id),
          }) !== null,
      );
      const media = await getMediaByIds(
        supabase,
        eligible.map((v) => v.hero_media_id).filter((id): id is string => Boolean(id)),
      );
      const mediaById = new Map(media.map((m) => [m.id, m]));
      const byScore = (a: { score: number }, b: { score: number }) => b.score - a.score;
      const heroOf = (v: (typeof eligible)[number]) => (v.hero_media_id ? (mediaById.get(v.hero_media_id) ?? null) : null);
      const urlOf = (v: (typeof eligible)[number]) => {
        const hero = heroOf(v);
        return hero ? publicMediaUrl(supabase, hero.storage_path) : null;
      };

      if (showDecals) {
        decals = eligible
          .map((vehicle) => {
            const score = scoreOf(vehicle.id)!;
            return {
              vehicleId: vehicle.id,
              tier: rankForScore(score),
              score,
              carName: vehicle.nickname || `${vehicle.make} ${vehicle.model}`,
              photoUrl: urlOf(vehicle),
            };
          })
          .sort(byScore);
      }
      if (showPosters) {
        posters = eligible
          .map((vehicle) =>
            buildPosterOffer({ vehicle, build: builds.get(vehicle.id) ?? null, hero: heroOf(vehicle), viewerId: user.id, photoUrl: urlOf(vehicle) }),
          )
          .filter((o): o is PosterOffer => o !== null)
          .sort(byScore);
      }
    } catch (err) {
      console.error("Store prints lookup failed:", err);
    }
  }

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
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
      {/* Keyed on the balance so bought points show the moment the page
          refreshes. Suspense: the wallet reads ?points=added. */}
      <Suspense fallback={null}>
        <StoreTabs
          key={balance}
          userId={user.id}
          packsEnabled={pointsPacksEnabled(profile?.is_admin ?? false)}
          week={storeWeek()}
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
          decals={decals}
          showDecals={showDecals}
          posters={posters}
          showPosters={showPosters}
          showTees={merchEnabled(profile?.is_admin ?? false)}
          decalPriceCents={DECAL_PRICE_CENTS}
          isFounder={profile?.is_founder ?? false}
        />
      </Suspense>
    </div>
  );
}
