/** The single source of truth for tab order — TopTabBar's index-based
 * active/immersive lookups and TabPagerShell's actual panel order both
 * depend on this exact sequence matching; drifting the two apart would
 * make the tab bar highlight (and immersive-header toggle) point at the
 * wrong panel without either side raising an error about it. */
// Garage used to be a fifth panel here — moved out to its own standalone
// route (see app/garage/page.tsx, which now renders GaragePageContent
// directly instead of going through TabsShellContent) so the top tab bar
// only carries the three screens people actually swipe between; Garage
// is reached from the bottom nav's Profile tab instead, which is where
// people already think to look for "my own stuff."
export const TAB_HREFS = ["/feed", "/discover", "/leaderboard"] as const;
