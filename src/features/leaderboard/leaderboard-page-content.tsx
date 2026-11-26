import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getProfileByUserId } from "@/lib/db/profiles";
import { listTopRatedBuilds } from "@/lib/db/builds";
import {
  listVehicleIdsByCategory,
  listLeaderboardVehicleIds,
  listMainBoardVehicleIds,
  listVehiclesByOwnerIds,
} from "@/lib/db/vehicles";
import { listFollowingIds } from "@/lib/db/follows";
import { listCrewIdsForUser, listApprovedMembersForCrews } from "@/lib/db/crew-members";
import { composeLeaderboard } from "@/lib/leaderboard/compose-leaderboard";
import {
  rankForScore,
  rankRangeLabel,
  tierColorVar,
  RANK_AMBIENT_COLORS,
  RANK_LABELS,
  type RankTier,
} from "@/lib/rating/rank";
import { groupByTier } from "@/lib/leaderboard/tier-groups";
import { loadRankMovement } from "@/lib/leaderboard/load-movement";
import { biggestClimb, type RankMovement } from "@/lib/leaderboard/movement";
import { BiggestClimbCard } from "@/features/leaderboard/biggest-climb";
import { RevealMyPlaceOnArrival } from "@/features/leaderboard/jump-to-me";
import { RANK_MATERIAL_ICONS } from "@/features/garage/rank-material-icons";
import { ChevronRightIcon } from "@/components/ui/icons";
import { ViewerStandingCard } from "@/features/leaderboard/viewer-standing-card";
import { LeaderboardRow } from "@/features/leaderboard/leaderboard-row";
import { LeaderboardHeroCard, LeaderboardRunnerUpCard } from "@/features/leaderboard/leaderboard-hero-card";
import { DailyInlineLink } from "@/features/daily/daily-teaser-card";
import { loadDailyTeaser } from "@/lib/daily/teaser";
import { loadTodayBattle } from "@/lib/battles/load";
import { BattleInlineLink } from "@/features/battles/battle-entry";
import { SegmentedLinks, FilterChips } from "@/components/ui/segmented-links";
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

/** Names one tier over its run of rows: its gem, its name in its colour,
 * a rule, and the score range it covers. */
function TierHeading({ tier }: { tier: RankTier }) {
  const Icon = RANK_MATERIAL_ICONS[tier];
  return (
    <div className="mb-2.5 flex items-center gap-2.5 px-1">
      <Icon className="h-5 w-5 flex-shrink-0" />
      <h2 className="micro-label flex-shrink-0" style={{ color: tierColorVar(tier) }}>
        {RANK_LABELS[tier]}
      </h2>
      <span aria-hidden className="h-px flex-1 bg-border" />
      <span className="numeral flex-shrink-0 text-[0.75rem] text-muted">{rankRangeLabel(tier)}</span>
    </div>
  );
}

/** A row that opens to reveal reference copy under it. Native
 * <details>, so it needs no client JavaScript. */
function Disclosure({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <details className="group">
      <summary className="pressable glass-raised elev-1 flex cursor-pointer list-none items-center gap-3 rounded-[18px] px-4 py-3.5 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">
          <span className="block text-[0.9375rem] font-semibold">{title}</span>
          <span className="mt-0.5 block text-[0.8125rem] text-muted">{hint}</span>
        </span>
        <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-muted transition-transform duration-200 group-open:rotate-90" />
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
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
  eagerImages = true,
}: {
  initialCategory?: VehicleCategory | null;
  initialScope?: LeaderboardScope;
  /** False when this is a swipe-neighbor panel rather than the one being
   * opened, so its big #1 photo doesn't compete with what's on screen. */
  eagerImages?: boolean;
}) {
  const supabase = await createClient();
  const currentUser = await getCurrentUser();
  // Friends/Crew narrow the board to people the viewer actually knows —
  // logged out, neither means anything, so they silently behave like
  // Global rather than the scope tabs just not being clickable.
  const scope = currentUser ? initialScope : "global";
  // Needed only at the end, so it loads alongside everything else.
  const viewerProfilePromise = currentUser
    ? getProfileByUserId(supabase, currentUser.id).catch(() => null)
    : Promise.resolve(null);

  // Leaderboard eligibility gate: only builds on a vehicle with an
  // admin-approved ownership-verification photo count. Intersected with
  // the category filter (rather than a Postgres-side join) the same
  // reason listVehicleIdsByCategory itself avoids one — no dependency on
  // PostgREST's embedded-resource relationship cache staying in sync.
  const [verifiedVehicleIds, categoryVehicleIds, scopeOwnerIds, dailyTeaser, todayBattle] = await Promise.all([
    // "All" is the main board, which leaves out the categories that only
    // rank on their own board (ATVs); a category board is that category.
    initialCategory ? listLeaderboardVehicleIds(supabase) : listMainBoardVehicleIds(supabase),
    initialCategory ? listVehicleIdsByCategory(supabase, initialCategory) : Promise.resolve(null),
    resolveScopeOwnerIds(supabase, scope, currentUser?.id ?? null),
    loadDailyTeaser(currentUser?.id ?? null),
    loadTodayBattle(supabase, currentUser?.id ?? null).catch(() => null),
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
  // Places moved since yesterday load alongside the board; the board
  // never waits on them failing.
  const [entries, movement] = await Promise.all([
    listTopRatedBuilds(supabase, 50, vehicleIds).then((builds) => composeLeaderboard(supabase, builds)),
    loadRankMovement(supabase, vehicleIds).catch((err) => {
      console.error("loadRankMovement failed:", err);
      return new Map<string, RankMovement>();
    }),
  ]);

  // The top five as photo cards: #1 the big card, #2–#5 a 2×2 grid under
  // it, then the list from #6.
  const runnersUp = entries.slice(1, 5);
  const rest = entries.slice(5);

  // Where the viewer's own best build sits, so the first thing they look
  // for is the first thing the page answers. Matched on username because
  // that's the owner identity a composed entry carries.
  const viewerProfile = await viewerProfilePromise;
  const viewerIndex = viewerProfile
    ? entries.findIndex((e) => e.ownerUsername === viewerProfile.username)
    : -1;
  const viewerEntry = viewerIndex >= 0 ? entries[viewerIndex] : null;

  // The board's ambient colour is whoever currently leads it — the page
  // literally changes mood the day someone new takes No. 1.
  const leadTier = entries[0] ? rankForScore(entries[0].score) : null;
  const liveBattle = todayBattle && !todayBattle.ended ? todayBattle : null;
  // Below the podium the tier is named once per run of rows, not on
  // every row.
  const restGroups = groupByTier(rest, 6);
  // The day's biggest mover on this board, called out on its own.
  const climb = biggestClimb(entries, movement);

  return (
    <div className="relative w-full flex-1 overflow-x-clip">
      {leadTier && (
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[360px]">
          <div
            className="ambient-fade absolute inset-0 opacity-40"
            style={{
              backgroundImage: `radial-gradient(120% 90% at 50% 0%, ${RANK_AMBIENT_COLORS[leadTier]}40 0%, transparent 70%)`,
            }}
          />
        </div>
      )}

      <div className="relative mx-auto w-full max-w-2xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      {viewerEntry && <RevealMyPlaceOnArrival />}
      <header className="animate-section-rise mb-5">
        <p className="text-[0.8125rem] font-medium text-muted">
          {initialCategory ? VEHICLE_CATEGORY_LABELS[initialCategory] : "Approved builds, ranked by AI"}
        </p>
        <h1 className="text-[2.125rem] font-bold leading-tight tracking-[-0.03em] sm:text-[2.75rem]">
          Leaderboard
        </h1>
        {(dailyTeaser || liveBattle) && (
          <div className={`mt-3 grid gap-2 ${dailyTeaser && liveBattle ? "grid-cols-2" : "grid-cols-1"}`}>
            {dailyTeaser && <DailyInlineLink teaser={dailyTeaser} />}
            {liveBattle && <BattleInlineLink view={liveBattle} />}
          </div>
        )}
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
        {viewerEntry && (
          <ViewerStandingCard
            rank={viewerIndex + 1}
            entry={viewerEntry}
            total={entries.length}
            aheadScore={viewerIndex > 0 ? entries[viewerIndex - 1].score : null}
          />
        )}
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
                  ? `Rate and verify a build in ${VEHICLE_CATEGORY_LABELS[initialCategory]} to be first on this board.`
                  : "Rate your build and verify ownership from your garage to be first on the board."
          }
        />
      ) : (
        <div className="animate-section-rise flex flex-col gap-4" style={{ animationDelay: "120ms" }}>
          <LeaderboardHeroCard
            entry={entries[0]}
            priority={eagerImages}
            movement={movement.get(entries[0].buildId)}
            isViewer={entries[0].buildId === viewerEntry?.buildId}
          />
          {runnersUp.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {runnersUp.map((entry, i) => (
                <LeaderboardRunnerUpCard
                  key={entry.buildId}
                  rank={i + 2}
                  entry={entry}
                  movement={movement.get(entry.buildId)}
                  isViewer={entry.buildId === viewerEntry?.buildId}
                />
              ))}
            </div>
          )}
          {climb && (
            <div className="mt-2">
              <BiggestClimbCard entry={entries[climb.index]} places={climb.places} rank={climb.index + 1} />
            </div>
          )}
          {restGroups.map((group, g) => (
            <section key={group.tier} className={g === 0 ? "mt-4" : "mt-3"}>
              <TierHeading tier={group.tier} />
              <div className="glass-raised elev-1 overflow-hidden rounded-[22px] [&>*+*]:before:absolute [&>*+*]:before:left-[6.875rem] [&>*+*]:before:right-0 [&>*+*]:before:top-0 [&>*+*]:before:h-px [&>*+*]:before:bg-border [&>*+*]:before:content-['']">
                {group.entries.map((entry, i) => (
                  <LeaderboardRow
                    key={entry.buildId}
                    rank={group.firstRank + i}
                    entry={entry}
                    showCategory={!initialCategory}
                    highlight={entry.buildId === viewerEntry?.buildId}
                    movement={movement.get(entry.buildId)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Reference material about the board rather than the board
          itself, so it stays folded away: two rows to tap, instead of two
          blocks of copy competing with the ranking. */}
      <div className="mt-12 flex flex-col gap-2.5">
        <Disclosure title="How ratings work" hint="What the AI looks at">
          <RatingExplainer />
        </Disclosure>
        <Disclosure title="The tiers" hint="Bronze to Cosmic">
          <p className="mb-3 px-1 text-[0.875rem] leading-relaxed text-muted">
            Every tier has its own look on your profile and garage. Climb from
            Bronze to Cosmic as your build and its score grow.
          </p>
          <TierLadder />
        </Disclosure>
      </div>
      </div>
    </div>
  );
}
