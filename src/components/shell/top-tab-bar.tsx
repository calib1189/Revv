"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SearchIcon, BellIcon } from "@/components/ui/icons";
import { useTabPagerContext } from "@/components/shell/tab-pager-context";
import { TAB_HREFS } from "@/components/shell/tab-order";

const LABELS: Record<(typeof TAB_HREFS)[number], string> = {
  "/garage": "Garage",
  "/feed": "For You",
  "/discover": "Discover",
  "/leaderboard": "Leaderboard",
};
const TABS = TAB_HREFS.map((href) => ({ href, label: LABELS[href] }));

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TopTabBar({ unreadNotificationCount = 0 }: { unreadNotificationCount?: number }) {
  const pathname = usePathname();
  const { activeIndex, requestScrollToIndex, requestRefresh } = useTabPagerContext();
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
      {/* flex, not grid, for the same "nav needs to actually shrink"
          reason as before. justify-between (no fixed gap) spreads the 4
          tabs across the nav's full width instead of packing them to the
          left with all the slack space left over after the last one —
          which is exactly what a fixed gap does, since it only ever
          creates space where explicitly told to. Confirmed there's
          actually room for this rather than it silently re-clipping
          "Leaderboard": measured real gaps between tabs directly
          (15px, not just "looks fine") and confirmed the last tab still
          lands exactly at the nav's own edge even when bolded for being
          active — the worst case — not past it. */}
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-3">
        <nav className="no-scrollbar flex min-w-0 flex-1 items-center justify-between overflow-x-auto">
          {TABS.map((tab, index) => {
            const active = onPager ? activeIndex === index : isActive(pathname, tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                onClick={(e) => {
                  if (!onPager) return;
                  e.preventDefault();
                  // Tapping the tab you're already on is a refresh
                  // gesture (TikTok/Instagram convention), not a no-op —
                  // requestRefresh is itself a no-op for any tab that
                  // hasn't registered a handler (Garage, Leaderboard),
                  // so this is safe to call unconditionally.
                  if (active) {
                    requestRefresh(tab.href);
                    return;
                  }
                  // The pager is already mounted with every panel's real
                  // content — this is a scroll, never a page navigation.
                  requestScrollToIndex(index);
                }}
                className={`relative flex-shrink-0 whitespace-nowrap py-1 text-sm transition-colors active:opacity-60 ${
                  isImmersive ? "[text-shadow:0_1px_4px_rgb(0_0_0_/_0.7)]" : ""
                } ${
                  active
                    ? "font-extrabold text-foreground"
                    : isImmersive
                      ? "font-semibold text-white/85 hover:text-white"
                      : "font-semibold text-muted hover:text-foreground"
                }`}
              >
                {tab.label}
                {/* A dedicated thin bar instead of a shadow on the whole
                    link — a box-shadow on the text's own box (which
                    includes its vertical padding) blurs outward on
                    every side, not just downward, so it read as a stray
                    glow beside the label instead of a glowing underline.
                    Scoping the glow to a 3px bar sized to just this
                    underline keeps it confined to where it's supposed
                    to be. */}
                {active && (
                  <span className="absolute inset-x-0 -bottom-0.5 h-[3px] rounded-full bg-accent shadow-[0_0_8px_1px_rgb(255_68_51_/_0.7)]" />
                )}
              </Link>
            );
          })}
        </nav>
        <div className="flex flex-shrink-0 items-center gap-2.5">
          <Link
            href="/search"
            aria-label="Search"
            className={
              isImmersive
                ? "text-white/85 [filter:drop-shadow(0_1px_3px_rgb(0_0_0_/_0.7))] hover:text-white"
                : "text-muted hover:text-foreground"
            }
          >
            <SearchIcon className="h-5 w-5" />
          </Link>
          <Link
            href="/notifications"
            aria-label="Notifications"
            className={`relative ${
              isImmersive
                ? "text-white/85 [filter:drop-shadow(0_1px_3px_rgb(0_0_0_/_0.7))] hover:text-white"
                : "text-muted hover:text-foreground"
            }`}
          >
            <BellIcon className="h-5 w-5" />
            {unreadNotificationCount > 0 && (
              <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-accent shadow-[0_0_6px_1px_rgb(255_68_51_/_0.8)]" />
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
