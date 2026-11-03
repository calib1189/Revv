"use client";

import { useEffect } from "react";

// How many sheets currently want the bar gone. A count rather than a
// flag, so one sheet closing while another is still up (comments open
// from inside a post menu, say) can't bring the bar back early.
let hideRequests = 0;

function apply() {
  document.documentElement.toggleAttribute("data-hide-bottom-nav", hideRequests > 0);
}

/** Slides the bottom tab bar away while `active` — the way TikTok's goes
 * when its comments or share sheet comes up, so a sheet over the feed
 * owns the whole bottom of the screen. The bar itself (header.tsx) is
 * server-rendered, so this only flips an attribute on <html>; the
 * transition lives in globals.css next to [data-bottom-nav]. */
export function useHideBottomNav(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    hideRequests += 1;
    apply();
    return () => {
      hideRequests = Math.max(0, hideRequests - 1);
      apply();
    };
  }, [active]);
}
