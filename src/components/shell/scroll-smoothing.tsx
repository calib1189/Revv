"use client";

import { useEffect } from "react";

/** How long after the last scroll event a scroll counts as settled. */
const SETTLE_MS = 160;

/** Marks <html> with "is-scrolling" while anything on the page scrolls
 * (the window, the feed, a tab panel, a sheet), so globals.css can hold
 * the always-running decorations still until it settles. One passive
 * listener for the whole app; it only touches the class when a scroll
 * starts and when it stops, never per frame. */
export function ScrollSmoothing() {
  useEffect(() => {
    const root = document.documentElement;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let scrolling = false;

    const settle = () => {
      scrolling = false;
      timer = null;
      root.classList.remove("is-scrolling");
    };
    const onScroll = () => {
      if (!scrolling) {
        scrolling = true;
        root.classList.add("is-scrolling");
      }
      if (timer) clearTimeout(timer);
      timer = setTimeout(settle, SETTLE_MS);
    };

    // Capture: scroll events from inner scroll areas don't bubble.
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener("scroll", onScroll, { capture: true });
      if (timer) clearTimeout(timer);
      root.classList.remove("is-scrolling");
    };
  }, []);

  return null;
}
