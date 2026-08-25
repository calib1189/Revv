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
}

const TabPagerContext = createContext<TabPagerContextValue | null>(null);

export function TabPagerProvider({ children }: { children: ReactNode }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const scrollFnRef = useRef<((index: number) => void) | null>(null);

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

  return (
    <TabPagerContext.Provider value={{ activeIndex, requestScrollToIndex, registerPager }}>
      {children}
    </TabPagerContext.Provider>
  );
}

export function useTabPagerContext(): TabPagerContextValue {
  const ctx = useContext(TabPagerContext);
  if (!ctx) throw new Error("useTabPagerContext must be used within TabPagerProvider");
  return ctx;
}
