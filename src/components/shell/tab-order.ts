/** The single source of truth for tab order — TopTabBar's index-based
 * active/immersive lookups and TabPagerShell's actual panel order both
 * depend on this exact sequence matching; drifting the two apart would
 * make the tab bar highlight (and immersive-header toggle) point at the
 * wrong panel without either side raising an error about it. */
// Garage leads the loop (Add car -> Build garage -> Rating -> Post ->
// ... -> Leaderboard), so it leads the tab order too — back as a real
// swipeable panel after a brief stint as a standalone route reached only
// via Profile. GaragePageContent was always written pager-safe (see its
// own doc comment) even while pulled out of this array, so restoring it
// here was a one-line change, not a rebuild.
export const TAB_HREFS = ["/garage", "/feed", "/discover", "/leaderboard"] as const;
