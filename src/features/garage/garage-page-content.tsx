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
import { checkAndUnlockAchievements } from "@/lib/achievements/unlock";
import { AchievementUnlockToast } from "@/features/achievements/achievement-unlock-toast";
import { getWeeklyChallengeProgress } from "@/lib/challenges/progress";
import { WeeklyChallengesCard } from "@/features/challenges/weekly-challenges-card";
import { ChallengeCompleteToast } from "@/features/challenges/challenge-complete-toast";
import { getProfileByUserId } from "@/lib/db/profiles";
import { getStoreItem } from "@/lib/store/catalog";

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

  // Nameplate Color is account-wide, bought/equipped from the central
  // Store (/store) — this just displays whatever's currently equipped.
  // Garage Backdrop, by contrast, is per-vehicle (vehicles.equipped_
  // backdrop, set from the Garage Editor at /garage/customize), so it's
  // read directly off each vehicle row below rather than fetched once
  // here. Best-effort: a not-yet-migrated equipped_* column shouldn't
  // take down the whole Garage panel (mounted on every route via the
  // tab pager, see the comment below).
  let nameColorItem: ReturnType<typeof getStoreItem> = undefined;
  try {
    const profile = await getProfileByUserId(supabase, user.id);
    nameColorItem = profile?.equipped_vehicle_name_color
      ? getStoreItem(profile.equipped_vehicle_name_color)
      : undefined;
  } catch (err) {
    console.error("Garage cosmetics fetch failed:", err);
  }

  // Split so each backdrop-equipped car gets its own full banner (the
  // whole point of a per-vehicle backdrop is one car in the scene, not
  // several sharing it) while plain cars still share a normal grid.
  const vehiclesWithBackdrop = vehicles.filter((v) => v.equipped_backdrop);
  const vehiclesWithoutBackdrop = vehicles.filter((v) => !v.equipped_backdrop);

  // Garage is the loop's own home screen — visited constantly, so it's
  // the natural place to lazily check for newly-earned achievements and
  // weekly challenge completions (see lib/achievements/unlock.ts and
  // lib/challenges/progress.ts) rather than needing a background job
  // for every possible trigger.
  //
  // Degrade gracefully if their migrations haven't been applied yet —
  // Garage is now mounted on every route via the tab pager (see
  // tab-order.ts), so an unhandled error here doesn't just break this
  // panel, it takes down every page for every logged-in user. Same
  // "missing table shouldn't take down the nav" reasoning header.tsx
  // already uses for messaging.
  let newlyUnlocked: Awaited<ReturnType<typeof checkAndUnlockAchievements>> = [];
  let challengeProgress: Awaited<ReturnType<typeof getWeeklyChallengeProgress>>["progress"] = [];
  let newlyCompleted: Awaited<ReturnType<typeof getWeeklyChallengeProgress>>["newlyCompleted"] = [];
  try {
    const [unlocked, challenges] = await Promise.all([
      checkAndUnlockAchievements(supabase, user.id),
      getWeeklyChallengeProgress(supabase, user.id),
    ]);
    newlyUnlocked = unlocked;
    challengeProgress = challenges.progress;
    newlyCompleted = challenges.newlyCompleted;
  } catch (err) {
    console.error("Achievements/challenges check failed:", err);
  }

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <AchievementUnlockToast achievements={newlyUnlocked} />
      <ChallengeCompleteToast challenges={newlyCompleted} />
      <div className="mb-6">
        <WeeklyChallengesCard progress={challengeProgress} />
      </div>
      <div className="mb-2 flex items-center">
        {/* flex-1 makes this stretch from the left edge to right where the
            button group starts, so justify-center here centers "Garage"
            in exactly that span — not across the whole row (which would
            pull it right, off-center, once "Add vehicle" is factored in). */}
        <div className="flex min-w-0 flex-1 justify-center px-2">
          <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">Your Garage</h1>
        </div>
        <div className="flex items-center gap-2">
          {vehicles.length > 0 && (
            <Link href="/garage/customize">
              <Button variant="secondary" className="px-3 py-1.5 text-sm">
                Customize
              </Button>
            </Link>
          )}
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
        <div className="flex flex-col gap-6">
          {/* One full banner per backdrop-equipped car — a per-vehicle
              backdrop only makes sense showing one car in its scene, not
              several sharing it. A tall min-height keeps the photo
              reading as a real banner spanning the screen (rather than
              however tall one small card happens to be), with that one
              VehicleCard sitting bottom-center like a subject standing
              in front of the scene, not floating in the middle of it. */}
          {vehiclesWithBackdrop.map((vehicle, index) => {
            const backdropItem = vehicle.equipped_backdrop
              ? getStoreItem(vehicle.equipped_backdrop)
              : undefined;
            return (
              <div
                key={vehicle.id}
                className={`flex flex-col justify-end rounded-3xl p-4 sm:p-6 min-h-[280px] sm:min-h-[420px] ${backdropItem?.effectClassName ?? ""}`}
                style={backdropItem ? { backgroundImage: backdropItem.value } : undefined}
              >
                <div className="mx-auto w-full max-w-[240px]">
                  <VehicleCard
                    vehicle={vehicle}
                    heroUrl={
                      vehicle.hero_media_id
                        ? (heroUrlById.get(vehicle.hero_media_id) ?? null)
                        : null
                    }
                    ratingScore={activeBuildByVehicle.get(vehicle.id)?.ai_rating_score ?? null}
                    priority={index === 0}
                    nameColorValue={nameColorItem?.value}
                    nameColorEffectClassName={nameColorItem?.effectClassName}
                  />
                </div>
              </div>
            );
          })}

          {/* Every plain car (no backdrop) shares a normal grid — one big
              stacked column under 4 cars (the common case, no photo to
              make room for), the compact multi-column grid once there's
              enough to actually need it. */}
          {vehiclesWithoutBackdrop.length > 0 && (
            <div
              className={`grid gap-4 sm:gap-6 ${
                vehiclesWithoutBackdrop.length < 4
                  ? "grid-cols-1"
                  : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
              }`}
            >
              {vehiclesWithoutBackdrop.map((vehicle, index) => (
                <VehicleCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  heroUrl={
                    vehicle.hero_media_id
                      ? (heroUrlById.get(vehicle.hero_media_id) ?? null)
                      : null
                  }
                  ratingScore={activeBuildByVehicle.get(vehicle.id)?.ai_rating_score ?? null}
                  priority={vehiclesWithBackdrop.length === 0 && index === 0}
                  nameColorValue={nameColorItem?.value}
                  nameColorEffectClassName={nameColorItem?.effectClassName}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
