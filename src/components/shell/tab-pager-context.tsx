"use client";

import { createContext, useContext, useRef, useState, useCallback, type ReactNode } from "react";

interface TabPagerContextValue {
  /** Index into the tab list of whichever panel is currently scrolled
   * into view, or null when the mounted page isn't the swipeable
   * pager at all (e.g. a specific vehicle page, settings, a post). The
   * pager (rendered per-page, deep in the tree) is the only thing that
   * ever knows this — TopTabBar (rendered once, above it, from the root
   * layout) has no other way to find out which panel is showing. */
  activeIndex: number | null;
  /** Registered by the mounted pager instance so the tab bar can ask it
   * to scroll, without either side needing to reach into the other's
   * internals. */
  requestScrollToIndex: (index: number) => void;
  /** Called by the pager on mount/unmount and on every settled scroll. */
  registerPager: (activeIndex: number | null, scrollFn: (index: number) => void) => void;
  /** Tapping a tab that's already active is a "refresh" gesture (the
   * same convention TikTok/Instagram use), not a no-op — but only some
   * panels have real refresh semantics (the FYP's live-updating list;
   * Garage/Leaderboard don't). Keyed by href rather than index so a
   * panel deep in its own tree (swipe-feed.tsx) can register itself
   * without needing to know its position, and requesting a refresh for
   * an href nobody registered just does nothing. */
  requestRefresh: (href: string) => void;
  registerRefreshHandler: (href: string, handler: (() => void) | null) => void;
}

const TabPagerContext = createContext<TabPagerContextValue | null>(null);

export function TabPagerProvider({ children }: { children: ReactNode }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const scrollFnRef = useRef<((index: number) => void) | null>(null);
  const refreshHandlersRef = useRef(new Map<string, () => void>());

  const registerPager = useCallback(
    (index: number | null, scrollFn: (index: number) => void) => {
      scrollFnRef.current = index === null ? null : scrollFn;
      setActiveIndex(index);
    },
    [],
  );

  const requestScrollToIndex = useCallback((index: number) => {
    scrollFnRef.current?.(index);
  }, []);

  const registerRefreshHandler = useCallback((href: string, handler: (() => void) | null) => {
    if (handler) refreshHandlersRef.current.set(href, handler);
    else refreshHandlersRef.current.delete(href);
  }, []);

  const requestRefresh = useCallback((href: string) => {
    refreshHandlersRef.current.get(href)?.();
  }, []);

  return (
    <TabPagerContext.Provider
      value={{
        activeIndex,
        requestScrollToIndex,
        registerPager,
        requestRefresh,
        registerRefreshHandler,
      }}
    >
      {children}
    </TabPagerContext.Provider>
  );
}

export function useTabPagerContext(): TabPagerContextValue {
  const ctx = useContext(TabPagerContext);
  if (!ctx) throw new Error("useTabPagerContext must be used within TabPagerProvider");
  return ctx;
}
