import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth/get-user";
import { TabPagerShell } from "@/components/shell/tab-pager-shell";
import { TAB_HREFS } from "@/components/shell/tab-order";
import { FeedPageContent } from "@/features/feed/feed-page-content";
import { DiscoverPageContent } from "@/features/meetups/discover-page-content";
import { LeaderboardPageContent, type LeaderboardScope } from "@/features/leaderboard/leaderboard-page-content";
import type { VehicleCategory } from "@/lib/vehicles/category";

/** Rendered identically (same three panels, same order) by all three of
 * For You/Discover/Leaderboard's route page.tsx files — only
 * `initialHref` (which panel to start scrolled to) and, for a direct
 * /leaderboard?category=x visit, `leaderboardCategory` actually differ
 * between them. See TabPagerShell for why they all need to mount the
 * same panels rather than each route rendering only its own content.
 *
 * Garage used to be a fourth panel here — moved to its own standalone
 * route (app/garage/page.tsx renders GaragePageContent directly now) so
 * the top tab bar only carries the screens people actually swipe
 * between; Garage is reached from Profile instead. Marketplace was a
 * fifth tab before that, pulled for the same "nothing real to show yet"
 * reason — the route/feature code itself (features/parts/*,
 * app/parts/page.tsx) is untouched, so it's a one-line change to add
 * either back later. */
export async function TabsShellContent({
  initialHref,
  leaderboardCategory = null,
  leaderboardScope,
}: {
  initialHref: string;
  leaderboardCategory?: VehicleCategory | null;
  leaderboardScope?: LeaderboardScope;
}) {
  const user = await getCurrentUser();

  // Keyed by the same TAB_HREFS TopTabBar orders itself by, then mapped
  // through TAB_HREFS below — so the panel order actually mounted here
  // can never drift from the order the tab bar's indices assume, even if
  // TAB_HREFS itself is ever reordered.
  const contentByHref: Record<(typeof TAB_HREFS)[number], ReactNode> = {
    "/feed": <FeedPageContent />,
    "/discover": <DiscoverPageContent />,
    "/leaderboard": (
      <LeaderboardPageContent initialCategory={leaderboardCategory} initialScope={leaderboardScope} />
    ),
  };

  return (
    <TabPagerShell
      initialHref={initialHref}
      isAuthenticated={Boolean(user)}
      tabs={TAB_HREFS.map((href) => ({ href, content: contentByHref[href] }))}
    />
  );
}
