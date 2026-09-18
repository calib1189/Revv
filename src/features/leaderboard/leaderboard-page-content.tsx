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
import { LeaderboardHeroCard, LeaderboardRunnerUpCard } from "@/features/leaderboard/leaderboard-hero-card";
import { SegmentedLinks, FilterChips } from "@/components/ui/segmented-links";
import { SectionTitle } from "@/components/ui/grouped-list";
import { EmptyState } from "@/components/ui/empty-state";
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

  const runnersUp = entries.slice(1, 3);
  const rest = entries.slice(3);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <header className="animate-section-rise mb-5">
        <p className="text-[0.8125rem] font-medium text-muted">
          {initialCategory ? VEHICLE_CATEGORY_LABELS[initialCategory] : "Verified builds, ranked by AI"}
        </p>
        <h1 className="text-[2.125rem] font-bold leading-tight tracking-[-0.03em] sm:text-[2.75rem]">
          Leaderboard
        </h1>
      </header>

      <div className="animate-section-rise mb-6 flex flex-col gap-3" style={{ animationDelay: "60ms" }}>
        {currentUser && (
          <SegmentedLinks
            options={LEADERBOARD_SCOPES.map((s) => ({
              href: categoryHref(initialCategory, s),
              label: SCOPE_LABELS[s],
              active: scope === s,
            }))}
          />
        )}
        <FilterChips
          options={[
            { href: categoryHref(null, scope), label: "All", active: !initialCategory },
            ...VEHICLE_CATEGORIES.map((c) => ({
              href: categoryHref(c, scope),
              label: VEHICLE_CATEGORY_LABELS[c],
              active: initialCategory === c,
            })),
          ]}
        />
      </div>

      {entries.length === 0 ? (
        <EmptyState
          card
          title={
            scope === "friends"
              ? "Nobody you follow is on the board yet"
              : scope === "crew"
                ? "Nobody in your crews is on the board yet"
                : "No verified builds yet"
          }
          body={
            scope === "friends"
              ? "Once someone you follow rates and verifies a build, they'll show up here."
              : scope === "crew"
                ? "Once a crewmate rates and verifies a build, they'll show up here."
                : initialCategory
                  ? `Rate and verify a ${VEHICLE_CATEGORY_LABELS[initialCategory]} build from your garage to be first on this board.`
                  : "Rate your build and verify ownership from your garage to be first on the board."
          }
        />
      ) : (
        <div className="animate-section-rise flex flex-col gap-4" style={{ animationDelay: "120ms" }}>
          <LeaderboardHeroCard entry={entries[0]} />
          {runnersUp.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {runnersUp.map((entry, i) => (
                <LeaderboardRunnerUpCard key={entry.buildId} rank={i + 2} entry={entry} />
              ))}
            </div>
          )}
          {rest.length > 0 && (
            <div className="glass-raised elev-1 overflow-hidden rounded-[22px] [&>*+*]:before:absolute [&>*+*]:before:left-[6.875rem] [&>*+*]:before:right-0 [&>*+*]:before:top-0 [&>*+*]:before:h-px [&>*+*]:before:bg-border [&>*+*]:before:content-['']">
              {rest.map((entry, i) => (
                <LeaderboardRow
                  key={entry.buildId}
                  rank={i + 4}
                  entry={entry}
                  showCategory={!initialCategory}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <section className="mt-12">
        <SectionTitle>How ratings work</SectionTitle>
        <RatingExplainer />
      </section>

      <section className="mt-10">
        <SectionTitle>The tiers</SectionTitle>
        <p className="mb-3 px-1 text-[0.875rem] leading-relaxed text-muted">
          Every tier has its own look on your profile and garage. Climb from
          Bronze to Cosmic as your build and its score grow.
        </p>
        <TierLadder />
      </section>
    </div>
  );
}
