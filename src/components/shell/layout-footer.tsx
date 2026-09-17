"use client";

import { Footer } from "@/components/shell/footer";
import { useTabPagerContext } from "@/components/shell/tab-pager-context";

/** The layout-level footer, suppressed on the four pager tabs.
 *
 * Each pager panel has to render its own Footer inside its own scroll
 * box (tab-pager-shell.tsx explains why: a panel is a fixed-height,
 * independently-scrolling element, so a footer sitting below it in
 * document flow can never be scrolled to from inside one). The layout
 * then rendered a further copy below the whole pager — four <footer>
 * elements on /leaderboard, the last of them 112px of phantom scroll
 * hanging off the bottom of every main tab.
 *
 * activeIndex is non-null exactly when a pager is mounted, which is the
 * same signal TopTabBar already uses to know it's on one. */
export function LayoutFooter() {
  const { activeIndex } = useTabPagerContext();
  if (activeIndex !== null) return null;
  return <Footer />;
}
