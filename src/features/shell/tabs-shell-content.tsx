import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth/get-user";
import { TabPagerShell } from "@/components/shell/tab-pager-shell";
import { TAB_HREFS } from "@/components/shell/tab-order";
import { GaragePageContent } from "@/features/garage/garage-page-content";
import { FeedPageContent } from "@/features/feed/feed-page-content";
import { DiscoverPageContent } from "@/features/meetups/discover-page-content";
import { LeaderboardPageContent, type LeaderboardScope } from "@/features/leaderboard/leaderboard-page-content";
import type { VehicleCategory } from "@/lib/vehicles/category";

/** Rendered identically (same four panels, same order) by all four of
 * Garage/Feed/Discover/Leaderboard's route page.tsx files — only
 * `initialHref` (which panel to start scrolled to) and, for a direct
 * /leaderboard?category=x visit, `leaderboardCategory` actually differ
 * between them. See TabPagerShell for why they all need to mount the
 * same panels rather than each route rendering only its own content.
 *
 * Garage briefly lived at its own standalone route (reached only from
 * Profile) — back here now that the core-loop-first direction puts
 * Garage on equal footing with Feed/Leaderboard. Marketplace
 * (features/parts/*, app/parts/page.tsx) stays a standalone route, not
 * a pager panel or a Discover tab — the catalog has zero verified
 * parts today, so it doesn't earn a permanent nav slot yet (see
 * discover-tabs.tsx). It doesn't need swipe access the way the loop's
 * own screens do, either. */
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
    "/garage": <GaragePageContent />,
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
