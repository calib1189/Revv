"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useTabPagerContext } from "@/components/shell/tab-pager-context";
import { Footer } from "@/components/shell/footer";

export interface TabPagerTab {
  href: string;
  content: ReactNode;
}

export const HEADER_HEIGHT = "calc(3.5rem + env(safe-area-inset-top))";

/** The actual swipeable pager behind the top-level tabs (currently
 * Garage, Feed, Discover, Leaderboard — see tab-order.ts) — every panel
 * is mounted together in one native horizontal scroll-snap row, so
 * dragging slowly genuinely reveals the neighboring tab's real content
 * in real time and lets go to settle wherever you release, the way a
 * native app's tab pager does.
 * There's no custom drag-tracking JS driving that part at all — it's the
 * browser's own scroll physics; a canned animation (what this used to
 * be, via View Transitions) can only ever play after the fact and never
 * actually follow a slow drag.
 *
 * Rendered identically by every route that uses it (only `initialHref`
 * differs) — see tabs-shell-content.tsx for why. */
export function TabPagerShell({
  tabs,
  initialHref,
  isAuthenticated,
}: {
  tabs: TabPagerTab[];
  initialHref: string;
  isAuthenticated: boolean;
}) {
  const hrefs = tabs.map((t) => t.href);
  const initialIndex = Math.max(0, hrefs.indexOf(initialHref));
  const { registerPager } = useTabPagerContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ready, setReady] = useState(false);

  // Runs before the browser paints the first client-rendered frame —
  // positions the container at the right panel and only then reveals it,
  // so there's no visible flash of Garage (index 0) before snapping to
  // wherever the actual current tab is.
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.scrollLeft = initialIndex * container.clientWidth;
    setReady(true);
    // Deliberately only on mount — this is initial positioning, not a
    // response to initialIndex changing later (it never does; each
    // route mounts its own shell instance).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function scrollToIndex(index: number) {
      const el = containerRef.current;
      if (!el) return;
      el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
    }

    function currentIndex() {
      const el = containerRef.current;
      if (!el || !el.clientWidth) return 0;
      return Math.round(el.scrollLeft / el.clientWidth);
    }

    registerPager(currentIndex(), scrollToIndex);

    function onScroll() {
      // Debounced rather than firing on every scroll frame — this only
      // needs to run once the drag/momentum has actually settled on a
      // panel, both for the tab bar's active-state highlight and for
      // the cosmetic URL update below.
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
      settleTimerRef.current = setTimeout(() => {
        const index = currentIndex();
        registerPager(index, scrollToIndex);
        const href = hrefs[index];
        if (href && href !== window.location.pathname) {
          // history.replaceState, not router.push/replace — this must
          // never trigger a real Next.js navigation. All five panels
          // are already mounted; re-navigating would remount this whole
          // shell and refetch every panel's data just to reflect a
          // scroll that already happened.
          window.history.replaceState(null, "", href);
        }
      }, 120);
    }

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", onScroll);
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
      registerPager(null, scrollToIndex);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const slotHeight = isAuthenticated
    ? "h-[calc(100dvh-4rem-env(safe-area-inset-bottom))]"
    : "h-[100dvh]";

  return (
    <div
      className="relative"
      style={{ marginTop: `calc(-1 * ${HEADER_HEIGHT})`, visibility: ready ? "visible" : "hidden" }}
    >
      <div
        ref={containerRef}
        className={`no-scrollbar flex ${slotHeight} snap-x snap-mandatory overflow-x-auto`}
      >
        {tabs.map((tab) => {
          const isFeed = tab.href === "/feed";
          return (
            <div key={tab.href} className="h-full w-full flex-shrink-0 snap-center">
              {isFeed ? (
                tab.content
              ) : (
                <div
                  className="flex h-full flex-col overflow-y-auto"
                  style={{ paddingTop: HEADER_HEIGHT }}
                >
                  <div className="flex flex-1 flex-col">{tab.content}</div>
                  {/* The layout-level Footer (app/layout.tsx) sits below
                      <main> in normal document flow, which is exactly
                      where it can no longer be reached from once a panel
                      here is a fixed-height, independently-scrolling box
                      — the outer page itself has no scroll left to give.
                      Repeating it inside each non-feed panel's own scroll
                      area keeps Terms/Privacy/Guidelines reachable
                      exactly as before. Feed skips this on purpose — a
                      full-bleed video feed showing a footer at the end
                      of its last loaded post isn't something TikTok-style
                      feeds do either. */}
                  <Footer />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
