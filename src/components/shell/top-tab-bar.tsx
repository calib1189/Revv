"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { SearchIcon, BellIcon } from "@/components/ui/icons";
import { useTabPagerContext } from "@/components/shell/tab-pager-context";
import { TAB_HREFS } from "@/components/shell/tab-order";

const LABELS: Record<(typeof TAB_HREFS)[number], string> = {
  "/garage": "Garage",
  "/feed": "Feed",
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
  // Feed is a full-bleed vertical video feed — the bar floats over the
  // video (text only, no background) instead of sitting above it, so the
  // video can run edge to edge behind it.
  const isImmersive = onPager ? TABS[activeIndex]?.href === "/feed" : pathname === "/feed";

  const selected = onPager ? activeIndex : TABS.findIndex((t) => isActive(pathname, t.href));

  // The underline is one element that slides between tabs rather than a
  // separate bar per tab appearing and disappearing. It has to be
  // measured because the tabs are text of differing widths spread with
  // justify-between, so there is no arithmetic that gives its position —
  // only the laid-out DOM knows.
  const navRef = useRef<HTMLElement>(null);
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    function measure() {
      const nav = navRef.current;
      const el = selected >= 0 ? tabRefs.current[selected] : null;
      if (!nav || !el) {
        setIndicator(null);
        return;
      }
      const navBox = nav.getBoundingClientRect();
      const tabBox = el.getBoundingClientRect();
      setIndicator({ left: tabBox.left - navBox.left + nav.scrollLeft, width: tabBox.width });
    }
    measure();
    // Fonts landing after first paint change every label's width, which
    // would otherwise leave the underline measured against fallback
    // metrics and visibly offset from the word it belongs to.
    document.fonts?.ready.then(measure).catch(() => {});
    const observer = new ResizeObserver(measure);
    if (navRef.current) observer.observe(navRef.current);
    return () => observer.disconnect();
  }, [selected]);

  return (
    <header
      className={`sticky top-0 z-10 isolate rounded-none pt-[env(safe-area-inset-top)] will-change-transform ${
        isImmersive ? "border-none bg-transparent" : "glass-raised border-x-0 border-t-0"
      }`}
    >
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-3">
        {/* flex, not grid, so the nav can actually shrink.
            justify-between spreads the four tabs across the full width
            rather than packing them left with the slack left over after
            the last one. "Does Leaderboard still fit" is the tight
            case. */}
        <nav
          ref={navRef}
          className="no-scrollbar relative flex min-w-0 flex-1 items-center justify-between self-stretch overflow-x-auto"
        >
          {TABS.map((tab, index) => {
            const active = index === selected;
            return (
              <Link
                key={tab.href}
                ref={(el) => {
                  tabRefs.current[index] = el;
                }}
                href={tab.href}
                aria-current={active ? "page" : undefined}
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
                // Weight stays put across states. Bolding only the
                // active tab changed its width, which nudged every other
                // label sideways on each switch and left the sliding
                // underline chasing a target that moved as it travelled.
                className={`relative flex flex-shrink-0 items-center whitespace-nowrap px-0.5 text-[0.9375rem] font-semibold tracking-[-0.01em] transition-colors duration-200 active:opacity-60 ${
                  isImmersive ? "[text-shadow:0_1px_4px_rgb(0_0_0_/_0.7)]" : ""
                } ${
                  active
                    ? isImmersive
                      ? "text-white"
                      : "text-foreground"
                    : isImmersive
                      ? "text-white/60 hover:text-white/90"
                      : "text-muted hover:text-foreground"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}

          {/* One underline for the whole bar. No glow: a shadow on a
              3px bar reads as a smear at this size, and the house style
              rules it out anyway. */}
          {indicator && (
            <span
              aria-hidden
              // Measured in a layout effect, so the first paint
              // already has the right transform — the transition only
              // ever animates a genuine tab change, never an entrance
              // from the left edge.
              className={`pointer-events-none absolute bottom-[0.6875rem] h-[2.5px] rounded-full transition-[transform,width] duration-[320ms] ease-[var(--ease-ios)] ${
                isImmersive ? "bg-white" : "bg-accent"
              }`}
              style={{
                width: `${indicator.width}px`,
                transform: `translateX(${indicator.left}px)`,
                left: 0,
              }}
            />
          )}
        </nav>

        <div className="flex flex-shrink-0 items-center gap-1">
          <Link
            href="/search"
            aria-label="Search"
            className={`pressable flex h-9 w-9 items-center justify-center rounded-full ${
              isImmersive
                ? "text-white/85 [filter:drop-shadow(0_1px_3px_rgb(0_0_0_/_0.7))] hover:text-white"
                : "text-muted hover:text-foreground"
            }`}
          >
            <SearchIcon className="h-[1.125rem] w-[1.125rem]" />
          </Link>
          <Link
            href="/notifications"
            aria-label={
              unreadNotificationCount > 0
                ? `Notifications, ${unreadNotificationCount} unread`
                : "Notifications"
            }
            className={`pressable relative flex h-9 w-9 items-center justify-center rounded-full ${
              isImmersive
                ? "text-white/85 [filter:drop-shadow(0_1px_3px_rgb(0_0_0_/_0.7))] hover:text-white"
                : "text-muted hover:text-foreground"
            }`}
          >
            <BellIcon className="h-[1.125rem] w-[1.125rem]" />
            {unreadNotificationCount > 0 && (
              <span className="absolute right-1.5 top-1.5 h-[7px] w-[7px] rounded-full bg-accent ring-2 ring-[var(--glass-solid-raised)]" />
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
