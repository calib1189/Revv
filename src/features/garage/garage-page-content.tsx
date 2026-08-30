import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { listVehiclesByOwner } from "@/lib/db/vehicles";
import { getMediaByIds, publicMediaUrl } from "@/lib/db/media";
import { listActiveBuildsByVehicleIds } from "@/lib/db/builds";
import { VehicleCard } from "@/features/garage/vehicle-card";
import { Button } from "@/components/ui/button";
import { RANK_MATERIAL_ICONS } from "@/features/garage/rank-material-icons";
import { rankForScore, RANK_LABELS, RANK_TEXT_COLORS } from "@/lib/rating/rank";

/** Garage is one panel of the swipeable tab pager now (tab-pager-shell.tsx)
 * — every panel is always mounted together, so a hard redirect() here
 * (this used to be the whole page) would hijack the ENTIRE pager the
 * moment a logged-out visitor scrolled to this panel from a public tab
 * like Marketplace, bouncing them off a page they didn't ask to leave.
 * Direct/bookmarked visits to exactly /garage are still fully protected
 * at the middleware level (middleware.ts's PROTECTED_EXACT) before this
 * ever renders — this inline prompt only ever shows for someone already
 * browsing the pager from another (public) tab while logged out. */
export async function GaragePageContent() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="mb-2 text-2xl font-bold tracking-tight sm:text-3xl">Your Garage</h1>
        <div className="glass mt-6 flex flex-col items-center justify-center gap-4 rounded-2xl py-24 text-center">
          <p className="text-lg font-medium">Log in to see your garage</p>
          <p className="max-w-xs text-sm text-muted">
            Track every mod, photo, and build on your own vehicles.
          </p>
          <Link href="/login?next=/garage">
            <Button>Log in</Button>
          </Link>
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const vehicles = await listVehiclesByOwner(supabase, user.id);
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

  const bestScore = [...activeBuildByVehicle.values()].reduce<number | null>((best, b) => {
    const score = b.ai_rating_score;
    if (score == null) return best;
    return best == null || score > best ? score : best;
  }, null);
  const bestTier = bestScore != null ? rankForScore(bestScore) : null;

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <div className="mb-2 flex items-center">
        {/* flex-1 makes this stretch from the left edge to right where the
            button group starts, so justify-center here centers "Garage"
            in exactly that span — not across the whole row (which would
            pull it right, off-center, once "Add vehicle" is factored in). */}
        <div className="flex min-w-0 flex-1 justify-center px-2">
          <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">Your Garage</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/garage/new">
            <Button className="px-3 py-1.5 text-sm">Add vehicle</Button>
          </Link>
        </div>
      </div>

      {vehicles.length > 0 && (
        <div className="mb-8 mt-4 flex items-center gap-5 text-sm text-muted">
          <span>
            <span className="font-semibold text-foreground">{vehicles.length}</span>{" "}
            vehicle{vehicles.length === 1 ? "" : "s"}
          </span>
          {bestTier && bestScore != null && (
            <Link
              href="/leaderboard"
              className="flex items-center gap-1.5 hover:text-foreground"
            >
              {(() => {
                const Icon = RANK_MATERIAL_ICONS[bestTier];
                return <Icon className="h-4 w-4" />;
              })()}
              Best:{" "}
              <span className="font-semibold" style={{ color: RANK_TEXT_COLORS[bestTier] }}>
                {RANK_LABELS[bestTier]} · {bestScore.toFixed(2)}
              </span>
            </Link>
          )}
        </div>
      )}

      {vehicles.length === 0 ? (
        <div className="glass mt-6 flex flex-col items-center justify-center gap-4 rounded-2xl py-24 text-center">
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
    </div>
  );
}
