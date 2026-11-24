"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
// Next's own enum for router.prefetch's `kind`. It isn't re-exported from
// a public entry point, but it's what the public AppRouterInstance type
// takes; this is the one place in the app that reaches for it.
import { PrefetchKind } from "next/dist/client/components/router-reducer/router-reducer-types";

/** How long the feed waits on a post before preloading where you'd go
 * from it. Long enough that swiping past doesn't fire anything; short
 * enough that it's ready before most taps. */
export const DWELL_MS = 900;
/** A page preloaded this recently isn't asked for again (it stays in
 * Next's cache for staleTimes.static). */
const REPEAT_MS = 60_000;

const recent = new Map<string, number>();

interface NetworkInformationLike {
  saveData?: boolean;
  effectiveType?: string;
}

/** Off for someone on Low Data Mode or a 2G-class connection: preloading
 * is a bet on a tap, and they're the ones paying for a wrong bet. */
export function prefetchAllowed(connection: NetworkInformationLike | undefined): boolean {
  if (!connection) return true;
  if (connection.saveData) return false;
  return connection.effectiveType !== "slow-2g" && connection.effectiveType !== "2g";
}

/** Whether `href` should be preloaded now, and remembers that it was. */
export function shouldPrefetch(href: string, now: number, seen: Map<string, number> = recent): boolean {
  const last = seen.get(href);
  if (last !== undefined && now - last < REPEAT_MS) return false;
  seen.set(href, now);
  // Keep the memory small on a long scroll.
  if (seen.size > 200) {
    for (const [key, at] of seen) if (now - at >= REPEAT_MS) seen.delete(key);
  }
  return true;
}

/** Preloads pages the viewer is likely to open from what's on screen,
 * once it has stayed on screen for DWELL_MS: the whole page, data
 * included, so the tap opens it instantly, the way TikTok has a profile
 * ready before you swipe to it. Pages that count visits record them
 * from the browser once shown (RecordVisit), so a preload never counts. */
export function useDwellPrefetch(hrefs: readonly string[], active: boolean) {
  const router = useRouter();
  const key = hrefs.join("\n");
  useEffect(() => {
    if (!active || !key) return;
    const timer = window.setTimeout(() => {
      const connection = (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
      if (!prefetchAllowed(connection)) return;
      const now = Date.now();
      for (const href of key.split("\n")) {
        if (shouldPrefetch(href, now)) router.prefetch(href, { kind: PrefetchKind.FULL });
      }
    }, DWELL_MS);
    return () => window.clearTimeout(timer);
  }, [active, key, router]);
}
