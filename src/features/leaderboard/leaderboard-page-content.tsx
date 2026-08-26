import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listTopRatedBuilds } from "@/lib/db/builds";
import { listVehicleIdsByCategory, listVerifiedVehicleIds } from "@/lib/db/vehicles";
import { composeLeaderboard } from "@/lib/leaderboard/compose-leaderboard";
import { LeaderboardRow } from "@/features/leaderboard/leaderboard-row";
import { RatingExplainer } from "@/features/leaderboard/rating-explainer";
import { TierLadder } from "@/features/leaderboard/tier-ladder";
import { VEHICLE_CATEGORIES, VEHICLE_CATEGORY_LABELS, type VehicleCategory } from "@/lib/vehicles/category";

/** Leaderboard is one panel of the swipeable tab pager (tab-pager-shell.tsx)
 * now, so only a direct visit to exactly /leaderboard?category=x — where
 * Next.js's own router actually matches this route and hands it real
 * searchParams — gets a non-default `initialCategory`. Arriving at this
 * panel by swiping over from another tab always starts at "All", since
 * the other 4 routes have no searchParams of their own to read this
 * from. A real limitation, not a bug — fully fixing it would mean
 * lifting the category filter into shared client state instead of a URL
 * param, which is more than this panel needs today. */
export async function LeaderboardPageContent({
  initialCategory = null,
}: {
  initialCategory?: VehicleCategory | null;
}) {
  const supabase = await createClient();
  // Leaderboard eligibility gate: only builds on a vehicle with an
  // admin-approved ownership-verification photo count. Intersected with
  // the category filter (rather than a Postgres-side join) the same
  // reason listVehicleIdsByCategory itself avoids one — no dependency on
  // PostgREST's embedded-resource relationship cache staying in sync.
  const [verifiedVehicleIds, categoryVehicleIds] = await Promise.all([
    listVerifiedVehicleIds(supabase),
    initialCategory ? listVehicleIdsByCategory(supabase, initialCategory) : Promise.resolve(null),
  ]);
  const verifiedSet = new Set(verifiedVehicleIds);
  const vehicleIds = categoryVehicleIds
    ? categoryVehicleIds.filter((id) => verifiedSet.has(id))
    : verifiedVehicleIds;
  const builds = await listTopRatedBuilds(supabase, 50, vehicleIds);
  const entries = await composeLeaderboard(supabase, builds);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Leaderboard</h1>
      <p className="mb-5 text-sm text-muted">
        {initialCategory
          ? `The highest-rated ${VEHICLE_CATEGORY_LABELS[initialCategory]} builds on REVV, ranked by AI.`
          : "The highest-rated builds on REVV right now, ranked by AI."}
      </p>

      <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto pb-1">
        <Link
          href="/leaderboard"
          className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
            !initialCategory ? "bg-accent text-accent-foreground" : "glass text-muted hover:text-foreground"
          }`}
        >
          All
        </Link>
        {VEHICLE_CATEGORIES.map((c) => (
          <Link
            key={c}
            href={`/leaderboard?category=${c}`}
            className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              initialCategory === c
                ? "bg-accent text-accent-foreground"
                : "glass text-muted hover:text-foreground"
            }`}
          >
            {VEHICLE_CATEGORY_LABELS[c]}
          </Link>
        ))}
      </div>

      {entries.length === 0 ? (
        <div className="glass flex flex-col items-center justify-center gap-2 rounded-2xl py-24 text-center">
          <p className="text-lg font-medium">No verified builds yet</p>
          <p className="max-w-xs text-sm text-muted">
            {initialCategory
              ? `Rate and verify ownership of a ${VEHICLE_CATEGORY_LABELS[initialCategory]} build from your garage to be the first on this board.`
              : "Rate your build and verify ownership from your garage to be the first on the board."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((entry, i) => (
            <LeaderboardRow
              key={entry.buildId}
              rank={i + 1}
              entry={entry}
              showCategory={!initialCategory}
            />
          ))}
        </div>
      )}

      <div className="mt-10 flex flex-col gap-8">
        <RatingExplainer />

        <div>
          <h2 className="mb-1 text-lg font-semibold">The tiers</h2>
          <p className="mb-5 text-sm text-muted">
            Every tier has its own look on your profile and garage photos — climb from
            Bronze to Cosmic as your build (and its score) grows.
          </p>
          <TierLadder />
        </div>
      </div>
    </div>
  );
}
