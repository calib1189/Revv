import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { listTopRatedBuilds } from "@/lib/db/builds";
import {
  listVehicleIdsByCategory,
  listVerifiedVehicleIds,
  listVehiclesByOwnerIds,
} from "@/lib/db/vehicles";
import { listFollowingIds } from "@/lib/db/follows";
import { listCrewIdsForUser, listApprovedMembersForCrews } from "@/lib/db/crew-members";
import { composeLeaderboard } from "@/lib/leaderboard/compose-leaderboard";
import { LeaderboardRow } from "@/features/leaderboard/leaderboard-row";
import { RatingExplainer } from "@/features/leaderboard/rating-explainer";
import { TierLadder } from "@/features/leaderboard/tier-ladder";
import { VEHICLE_CATEGORIES, VEHICLE_CATEGORY_LABELS, type VehicleCategory } from "@/lib/vehicles/category";

export const LEADERBOARD_SCOPES = ["global", "friends", "crew"] as const;
export type LeaderboardScope = (typeof LEADERBOARD_SCOPES)[number];

const SCOPE_LABELS: Record<LeaderboardScope, string> = {
  global: "Global",
  friends: "Friends",
  crew: "Crew",
};

/** null means "no restriction" (Global, or logged out) — distinct from an
 * empty array, which means the scope genuinely resolved to nobody (e.g.
 * Friends with zero follows), and should leave the board empty rather
 * than silently falling back to Global. */
async function resolveScopeOwnerIds(
  supabase: SupabaseClient<Database>,
  scope: LeaderboardScope,
  userId: string | null,
): Promise<string[] | null> {
  if (scope === "global" || !userId) return null;
  if (scope === "friends") return listFollowingIds(supabase, userId);

  const crewIds = await listCrewIdsForUser(supabase, userId);
  if (crewIds.length === 0) return [];
  const members = await listApprovedMembersForCrews(supabase, crewIds);
  return [...new Set(members.map((m) => m.user_id))];
}

function categoryHref(category: VehicleCategory | null, scope: LeaderboardScope = "global"): string {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (scope !== "global") params.set("scope", scope);
  const qs = params.toString();
  return qs ? `/leaderboard?${qs}` : "/leaderboard";
}

/** Leaderboard is one panel of the swipeable tab pager (tab-pager-shell.tsx)
 * now, so only a direct visit to exactly /leaderboard?category=x&scope=y —
 * where Next.js's own router actually matches this route and hands it
 * real searchParams — gets a non-default `initialCategory`/`initialScope`.
 * Arriving at this panel by swiping over from another tab always starts
 * at "All"/"Global", since the other 2 routes have no searchParams of
 * their own to read this from. A real limitation, not a bug — fully
 * fixing it would mean lifting both filters into shared client state
 * instead of URL params, which is more than this panel needs today. */
export async function LeaderboardPageContent({
  initialCategory = null,
  initialScope = "global",
}: {
  initialCategory?: VehicleCategory | null;
  initialScope?: LeaderboardScope;
}) {
  const supabase = await createClient();
  const currentUser = await getCurrentUser();
  // Friends/Crew narrow the board to people the viewer actually knows —
  // logged out, neither means anything, so they silently behave like
  // Global rather than the scope tabs just not being clickable.
  const scope = currentUser ? initialScope : "global";

  // Leaderboard eligibility gate: only builds on a vehicle with an
  // admin-approved ownership-verification photo count. Intersected with
  // the category filter (rather than a Postgres-side join) the same
  // reason listVehicleIdsByCategory itself avoids one — no dependency on
  // PostgREST's embedded-resource relationship cache staying in sync.
  const [verifiedVehicleIds, categoryVehicleIds, scopeOwnerIds] = await Promise.all([
    listVerifiedVehicleIds(supabase),
    initialCategory ? listVehicleIdsByCategory(supabase, initialCategory) : Promise.resolve(null),
    resolveScopeOwnerIds(supabase, scope, currentUser?.id ?? null),
  ]);
  const verifiedSet = new Set(verifiedVehicleIds);
  let vehicleIds = categoryVehicleIds
    ? categoryVehicleIds.filter((id) => verifiedSet.has(id))
    : verifiedVehicleIds;
  if (scopeOwnerIds) {
    const scopeVehicles = await listVehiclesByOwnerIds(supabase, scopeOwnerIds);
    const scopeVehicleSet = new Set(scopeVehicles.map((v) => v.id));
    vehicleIds = vehicleIds.filter((id) => scopeVehicleSet.has(id));
  }
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

      {currentUser && (
        <div className="mb-4 flex gap-2">
          {LEADERBOARD_SCOPES.map((s) => (
            <Link
              key={s}
              href={categoryHref(initialCategory, s)}
              className={`flex-1 rounded-full py-1.5 text-center text-sm font-medium transition-colors ${
                scope === s ? "bg-accent text-accent-foreground" : "glass text-muted hover:text-foreground"
              }`}
            >
              {SCOPE_LABELS[s]}
            </Link>
          ))}
        </div>
      )}

      <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto pb-1">
        <Link
          href={categoryHref(null, scope)}
          className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
            !initialCategory ? "bg-accent text-accent-foreground" : "glass text-muted hover:text-foreground"
          }`}
        >
          All
        </Link>
        {VEHICLE_CATEGORIES.map((c) => (
          <Link
            key={c}
            href={categoryHref(c, scope)}
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
          <p className="text-lg font-medium">
            {scope === "friends"
              ? "Nobody you follow is on the board yet"
              : scope === "crew"
                ? "Nobody in your crews is on the board yet"
                : "No verified builds yet"}
          </p>
          <p className="max-w-xs text-sm text-muted">
            {scope === "friends"
              ? "Once someone you follow rates and verifies a build, they'll show up here."
              : scope === "crew"
                ? "Once a crewmate rates and verifies a build, they'll show up here."
                : initialCategory
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
