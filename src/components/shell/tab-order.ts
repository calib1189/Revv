/** The single source of truth for tab order — TopTabBar's index-based
 * active/immersive lookups and TabPagerShell's actual panel order both
 * depend on this exact sequence matching; drifting the two apart would
 * make the tab bar highlight (and immersive-header toggle) point at the
 * wrong panel without either side raising an error about it. */
export const TAB_HREFS = ["/garage", "/feed", "/discover", "/leaderboard"] as const;
