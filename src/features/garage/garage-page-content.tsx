import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { listVehiclesByOwner } from "@/lib/db/vehicles";
import { getMediaByIds, publicMediaUrl } from "@/lib/db/media";
import { listActiveBuildsByVehicleIds } from "@/lib/db/builds";
import { listBuildPartsForBuilds } from "@/lib/db/build-parts";
import { VehicleBay } from "@/features/garage/vehicle-bay";
import { GarageStatPanel } from "@/features/garage/garage-stat-panel";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { BrushIcon, PlusIcon, WheelIcon, StarIcon, GemIcon, WrenchIcon } from "@/components/ui/icons";
import { GarageShowroom } from "@/features/garage/garage-showroom";
import { formatCompactNumber } from "@/lib/format/compact-number";
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

      {/* Large title, a one-line summary of what's parked here, and a
          single primary action. Everything else lives in the quick
          actions row under the showroom. */}
      <header className="animate-section-rise mb-5 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[0.8125rem] font-medium text-muted">
            {vehicles.length === 0 ? (
              "Nothing parked yet"
            ) : (
              <>
                <span className="numeral">{vehicles.length}</span> {vehicles.length === 1 ? "car" : "cars"} ·{" "}
                <span className="numeral">{formatCompactNumber(modCount)}</span> {modCount === 1 ? "mod" : "mods"}
              </>
            )}
          </p>
          <h1 className="text-[2.125rem] font-bold leading-tight tracking-[-0.03em] sm:text-[2.75rem]">
            Garage
          </h1>
        </div>
        <Link
          href="/garage/new"
          aria-label="Add vehicle"
          title="Add vehicle"
          className="pressable mb-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground elev-2"
        >
          <PlusIcon className="h-5 w-5" />
        </Link>
      </header>

      {vehicles.length === 0 ? (
        <GarageEmptyState />
      ) : (
        <>
          {/* The showroom: one car per page, swipe between them. Each
              card handles its own equipped backdrop. */}
          <section className="animate-section-rise mb-7" style={{ animationDelay: "40ms" }}>
            <GarageShowroom>
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
            </GarageShowroom>
          </section>

          <nav
            aria-label="Garage shortcuts"
            className="animate-section-rise mb-9 grid grid-cols-4 gap-2"
            style={{ animationDelay: "90ms" }}
          >
            <QuickAction href="/garage/customize" label="Customize" tint="#bf5af2" icon={<BrushIcon />} />
            <QuickAction href="/tools/fitment" label="Fitment" tint="#30b0c7" icon={<WheelIcon />} />
            <QuickAction href="/leaderboard" label="Rankings" tint="#ff9f0a" icon={<StarIcon />} />
            <QuickAction href="/store" label="Store" tint="#ff375f" icon={<GemIcon />} />
          </nav>

          <section className="mb-10">
            <h2 className="mb-2.5 px-1 text-[1.375rem] font-bold tracking-[-0.02em]">Overview</h2>
            <GarageStatPanel
              stats={{
                vehicleCount: vehicles.length,
                modCount,
                investedCents,
                bestScore,
              }}
            />
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

/** A round tinted icon with its label underneath — the Wallet / Control
 * Center shortcut pattern. */
function QuickAction({ href, label, tint, icon }: { href: string; label: string; tint: string; icon: ReactNode }) {
  return (
    <Link href={href} className="pressable flex flex-col items-center gap-1.5">
      <span
        className="glass-raised elev-1 flex h-14 w-14 items-center justify-center rounded-full [&>svg]:h-[22px] [&>svg]:w-[22px]"
        style={{ color: tint }}
      >
        {icon}
      </span>
      <span className="text-[0.75rem] font-medium">{label}</span>
    </Link>
  );
}

/** First-run garage: a portrait placeholder the shape of a real car card,
 * so the page already reads as a showroom waiting for its first car, and
 * the three things a garage does. */
function GarageEmptyState() {
  const steps = [
    { icon: <WrenchIcon />, tint: "#ff9f0a", title: "Log every mod", body: "Parts, prices, and install dates, as real data." },
    { icon: <StarIcon />, tint: "#ffd60a", title: "Get a build score", body: "AI rates the whole build from 0 to 100." },
    { icon: <GemIcon />, tint: "#bf5af2", title: "Climb the tiers", body: "Bronze to Cosmic, on the leaderboard." },
  ];
  return (
    <div className="animate-section-rise">
      <Link
        href="/garage/new"
        className="pressable flex aspect-[4/5] flex-col items-center justify-center gap-4 rounded-[28px] border-2 border-dashed border-foreground/15 bg-foreground/[0.03] px-8 text-center sm:aspect-[16/10]"
      >
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-accent text-accent-foreground elev-3">
          <PlusIcon className="h-9 w-9" />
        </span>
        <div>
          <p className="text-[1.625rem] font-bold tracking-[-0.025em]">Park your first car</p>
          <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-muted">
            Add a vehicle to start your garage.
          </p>
        </div>
      </Link>

      <ul className="mt-8 flex flex-col gap-5 px-1">
        {steps.map((step) => (
          <li key={step.title} className="flex items-start gap-4">
            <span
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[13px] [&>svg]:h-5 [&>svg]:w-5"
              style={{ background: `color-mix(in srgb, ${step.tint} 16%, transparent)`, color: step.tint }}
            >
              {step.icon}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-[1rem] font-semibold">{step.title}</p>
              <p className="mt-0.5 text-[0.875rem] text-muted">{step.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
