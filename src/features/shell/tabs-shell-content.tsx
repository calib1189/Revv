import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth/get-user";
import { TabPagerShell } from "@/components/shell/tab-pager-shell";
import { TAB_HREFS } from "@/components/shell/tab-order";
import { GaragePageContent } from "@/features/garage/garage-page-content";
import { FeedPageContent } from "@/features/feed/feed-page-content";
import { DiscoverPageContent } from "@/features/meetups/discover-page-content";
import { LeaderboardPageContent } from "@/features/leaderboard/leaderboard-page-content";
import { MarketplacePageContent } from "@/features/parts/marketplace-page-content";
import type { VehicleCategory } from "@/lib/vehicles/category";

/** Rendered identically (same five panels, same order) by all five of
 * Garage/For You/Discover/Leaderboard/Marketplace's route page.tsx files
 * — only `initialHref` (which panel to start scrolled to) and, for a
 * direct /leaderboard?category=x visit, `leaderboardCategory` actually
 * differ between them. See TabPagerShell for why they all need to
 * mount the same five panels rather than each route rendering only its
 * own content. */
export async function TabsShellContent({
  initialHref,
  leaderboardCategory = null,
}: {
  initialHref: string;
  leaderboardCategory?: VehicleCategory | null;
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
    "/leaderboard": <LeaderboardPageContent initialCategory={leaderboardCategory} />,
    "/parts": <MarketplacePageContent />,
  };

  return (
    <TabPagerShell
      initialHref={initialHref}
      isAuthenticated={Boolean(user)}
      tabs={TAB_HREFS.map((href) => ({ href, content: contentByHref[href] }))}
    />
  );
}
