import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { listVehiclesByOwner } from "@/lib/db/vehicles";
import { getMediaByIds, publicMediaUrl } from "@/lib/db/media";
import { listActiveBuildsByVehicleIds } from "@/lib/db/builds";
import { listBuildPartsForBuilds } from "@/lib/db/build-parts";
import { VehicleBay } from "@/features/garage/vehicle-bay";
import { GarageStatPanel } from "@/features/garage/garage-stat-panel";
import { Button } from "@/components/ui/button";
import { BrushIcon, PlusIcon } from "@/components/ui/icons";
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
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <h1 className="text-[2.125rem] font-bold leading-tight tracking-[-0.03em] sm:text-[2.75rem]">
          Garage
        </h1>
        <div className="glass-raised elev-2 mt-6 flex flex-col items-center justify-center gap-4 rounded-[28px] px-6 py-20 text-center">
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

  // What this garage actually contains, read back from the parts
  // themselves rather than stored anywhere (CLAUDE.md invariant 3).
  // Best-effort like everything else on this page: the Garage panel is
  // mounted on every route via the tab pager, so a failure here must
  // not take down the whole app — it just costs the stat panel its
  // mod/spend figures.
  let modCount = 0;
  let investedCents = 0;
  try {
    const buildIds = [...activeBuildByVehicle.values()].map((b) => b.id);
    const parts = await listBuildPartsForBuilds(supabase, buildIds);
    modCount = parts.length;
    investedCents = parts.reduce(
      (sum, p) => sum + (p.price_cents ?? 0) + (p.install_cost_cents ?? 0),
      0,
    );
  } catch (err) {
    console.error("Garage parts aggregate failed:", err);
  }

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
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <AchievementUnlockToast achievements={newlyUnlocked} />
      <ChallengeCompleteToast challenges={newlyCompleted} />

      {/* Large-title header: the page name set big and left, with
          round icon buttons for the two actions instead of a row of
          text buttons competing with it. */}
      <header className="animate-section-rise mb-6 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[0.8125rem] font-medium text-muted">
            {vehicles.length === 0
              ? "Nothing parked yet"
              : `${vehicles.length} ${vehicles.length === 1 ? "vehicle" : "vehicles"}`}
          </p>
          <h1 className="text-[2.125rem] font-bold leading-tight tracking-[-0.03em] sm:text-[2.75rem]">
            Garage
          </h1>
        </div>
        <div className="mb-1 flex flex-shrink-0 items-center gap-2.5">
          {vehicles.length > 0 && (
            <Link
              href="/garage/customize"
              aria-label="Customize garage"
              title="Customize"
              className="pressable glass-raised elev-1 flex h-10 w-10 items-center justify-center rounded-full"
            >
              <BrushIcon className="h-[18px] w-[18px]" />
            </Link>
          )}
          <Link
            href="/garage/new"
            aria-label="Add vehicle"
            title="Add vehicle"
            className="pressable flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground elev-2"
          >
            <PlusIcon className="h-5 w-5" />
          </Link>
        </div>
      </header>

      {vehicles.length === 0 ? (
        <div className="animate-section-rise glass-raised elev-2 flex flex-col items-center gap-3 rounded-[28px] px-6 py-16 text-center">
          <span className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-accent/12 text-accent">
            <PlusIcon className="h-7 w-7" />
          </span>
          <p className="text-[1.375rem] font-bold tracking-[-0.02em]">Park your first car</p>
          <p className="max-w-xs text-[0.9375rem] leading-relaxed text-muted">
            Add a vehicle to track its mods, photos, and build score.
          </p>
          <Link href="/garage/new" className="mt-3">
            <Button className="px-6 py-2.5">Add vehicle</Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="animate-section-rise mb-10" style={{ animationDelay: "60ms" }}>
            <GarageStatPanel
              stats={{
                vehicleCount: vehicles.length,
                modCount,
                investedCents,
                bestScore,
              }}
            />
          </div>

          {/* One large feature card per car. VehicleBay handles its own
              equipped backdrop (vehicles.equipped_backdrop), so there's
              no page-level branching between decorated and plain cars. */}
          <section className="animate-section-rise mb-10" style={{ animationDelay: "120ms" }}>
            <h2 className="mb-2.5 px-1 text-[1.375rem] font-bold tracking-[-0.02em]">
              {vehicles.length === 1 ? "Your Car" : "Your Cars"}
            </h2>
            <div className="flex flex-col gap-6">
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
          </section>
        </>
      )}

      {challengeProgress.length > 0 && (
        <div className="animate-section-rise" style={{ animationDelay: "180ms" }}>
          <WeeklyChallengesCard progress={challengeProgress} />
        </div>
      )}
    </div>
  );
}
