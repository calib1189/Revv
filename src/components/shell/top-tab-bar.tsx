"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SearchIcon } from "@/components/ui/icons";
import { useTabPagerContext } from "@/components/shell/tab-pager-context";
import { TAB_HREFS } from "@/components/shell/tab-order";

const LABELS: Record<(typeof TAB_HREFS)[number], string> = {
  "/garage": "Garage",
  "/feed": "For You",
  "/discover": "Discover",
  "/leaderboard": "Leaderboard",
  "/parts": "Marketplace",
};
const TABS = TAB_HREFS.map((href) => ({ href, label: LABELS[href] }));

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TopTabBar() {
  const pathname = usePathname();
  const { activeIndex, requestScrollToIndex } = useTabPagerContext();
  // Once the swipeable pager (tab-pager-shell.tsx) is mounted, it's the
  // authority on which panel is actually showing — a slow drag settles
  // on a neighboring panel via pure scrolling, with no Next.js
  // navigation and no pathname change until the URL sync fires. Falling
  // back to pathname only matters on a page the pager doesn't cover at
  // all (a specific vehicle, settings, a post) — there, activeIndex is
  // null and a tab click is a real navigation instead of a scroll.
  const onPager = activeIndex !== null;
  // For You is a full-bleed vertical video feed — the bar floats over the
  // video (text only, no background) instead of sitting above it, so the
  // video can run edge to edge behind it.
  const isImmersive = onPager ? TABS[activeIndex]?.href === "/feed" : pathname === "/feed";

  return (
    <header
      className={`sticky top-0 z-10 rounded-none pt-[env(safe-area-inset-top)] ${
        isImmersive ? "border-none bg-transparent" : "glass-raised border-x-0 border-t-0"
      }`}
    >
      <div className="mx-auto grid h-14 max-w-5xl grid-cols-[1fr_auto_1fr] items-center px-4">
        <Link
          href="/feed"
          aria-label="REVV"
          className={`flex-shrink-0 text-lg font-black italic tracking-tight ${
            isImmersive ? "[text-shadow:0_1px_4px_rgb(0_0_0_/_0.7)]" : ""
          }`}
        >
          <span className={isImmersive ? "text-white" : "text-foreground"}>RE</span>
          <span className="text-accent">VV</span>
        </Link>
        {/* min-w-0 is load-bearing: a grid item's default min-width is
            `auto` (its content's intrinsic width), not 0, so without this
            the nav can never shrink below fitting all five tabs on one
            line — overflow-x-auto below silently does nothing and the
            header just gets wider than the viewport instead of scrolling.
            This is the actual "too big" bug, not just a sizing tweak. */}
        <nav className="no-scrollbar flex min-w-0 items-center gap-4 overflow-x-auto">
          {TABS.map((tab, index) => {
            const active = onPager ? activeIndex === index : isActive(pathname, tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                onClick={(e) => {
                  if (!onPager || active) return;
                  // The pager is already mounted with every panel's real
                  // content — this is a scroll, never a page navigation.
                  e.preventDefault();
                  requestScrollToIndex(index);
                }}
                className={`flex-shrink-0 whitespace-nowrap border-b-2 py-1 text-[13px] font-semibold transition-colors active:opacity-60 ${
                  isImmersive ? "[text-shadow:0_1px_4px_rgb(0_0_0_/_0.7)]" : ""
                } ${
                  active
                    ? "border-accent text-foreground"
                    : isImmersive
                      ? "border-transparent text-white/85 hover:text-white"
                      : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
        <Link
          href="/search"
          aria-label="Search"
          className={`flex-shrink-0 justify-self-end ${
            isImmersive
              ? "text-white/85 [filter:drop-shadow(0_1px_3px_rgb(0_0_0_/_0.7))] hover:text-white"
              : "text-muted hover:text-foreground"
          }`}
        >
          <SearchIcon className="h-5 w-5" />
        </Link>
      </div>
    </header>
  );
}
