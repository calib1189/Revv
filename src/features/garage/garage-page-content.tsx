import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { listVehiclesByOwner } from "@/lib/db/vehicles";
import { getMediaByIds, publicMediaUrl } from "@/lib/db/media";
import { listActiveBuildsByVehicleIds } from "@/lib/db/builds";
import { VehicleBay } from "@/features/garage/vehicle-bay";
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
  // Garage Backdrop, by contrast, lives on each vehicle row
  // (vehicles.equipped_backdrop, set from the Garage Editor at
  // /garage/customize) and VehicleBay reads it directly off the
  // vehicle it's given, so there's nothing to fetch for it here.
  // Best-effort: a not-yet-migrated equipped_* column shouldn't take
  // down the whole Garage panel (mounted on every route via the tab
  // pager, see the comment below).
  let nameColorItem: ReturnType<typeof getStoreItem> = undefined;
  try {
    const profile = await getProfileByUserId(supabase, user.id);
    nameColorItem = profile?.equipped_vehicle_name_color
      ? getStoreItem(profile.equipped_vehicle_name_color)
      : undefined;
  } catch (err) {
    console.error("Garage cosmetics fetch failed:", err);
  }

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
      <div className="mb-8">
        <WeeklyChallengesCard progress={challengeProgress} />
      </div>

      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Your Garage</h1>
          {vehicles.length > 0 ? (
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
              <span>
                <span className="font-semibold text-foreground">{vehicles.length}</span>{" "}
                vehicle{vehicles.length === 1 ? "" : "s"}
              </span>
              {bestTier && bestScore != null && (
                <Link href="/leaderboard" className="flex items-center gap-1.5 hover:text-foreground">
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
          ) : (
            <p className="mt-2 text-sm text-muted">Every build you own, in one showroom.</p>
          )}
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
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

      {vehicles.length === 0 ? (
        <div className="glass flex aspect-[16/10] flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-white/10 text-center">
          <p className="text-lg font-medium">No vehicles yet</p>
          <p className="max-w-xs text-sm text-muted">
            Add your first car to start tracking mods, photos, and builds.
          </p>
          <Link href="/garage/new">
            <Button>Add your first vehicle</Button>
          </Link>
        </div>
      ) : (
        // One big showroom bay per car instead of a grid of small
        // tiles — a garage of one or two builds should look like a
        // feature, not a thumbnail directory. VehicleBay handles its
        // own equipped backdrop (vehicles.equipped_backdrop), so
        // there's no page-level branching between "decorated" and
        // "plain" cars here.
        <div className="flex flex-col gap-8">
          {vehicles.map((vehicle, index) => (
            <VehicleBay
              key={vehicle.id}
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
          ))}
        </div>
      )}
    </div>
  );
}
